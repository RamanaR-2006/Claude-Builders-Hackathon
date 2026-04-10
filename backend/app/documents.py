import os
import re
import subprocess
import uuid

from flask import Blueprint, current_app, jsonify, request, send_file
from flask_login import current_user, login_required

from .models import Connection, Document, db

documents_bp = Blueprint("documents", __name__)

ALLOWED_EXTENSIONS = {
    "pdf": "pdf",
    "mp3": "audio",
    "wav": "audio",
    "ogg": "audio",
    "mp4": "video",
    "webm": "video",
    "mov": "video",
}


def _classify_file(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext, ALLOWED_EXTENSIONS.get(ext)


def _generate_thumbnail(filepath, file_type, thumb_folder):
    thumb_name = uuid.uuid4().hex + ".png"
    thumb_path = os.path.join(thumb_folder, thumb_name)

    if file_type == "pdf":
        # Try PyMuPDF first (no system dependency)
        try:
            import fitz

            doc = fitz.open(filepath)
            page = doc[0]
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            pix.save(thumb_path)
            doc.close()
            if os.path.exists(thumb_path):
                return thumb_name
        except Exception:
            pass

        # Fallback to pdf2image (needs poppler)
        try:
            from pdf2image import convert_from_path

            images = convert_from_path(filepath, first_page=1, last_page=1, size=(400, None))
            if images:
                images[0].save(thumb_path, "PNG")
                return thumb_name
        except Exception:
            return None

    if file_type == "video":
        try:
            subprocess.run(
                [
                    "ffmpeg", "-i", filepath,
                    "-ss", "00:00:01", "-vframes", "1",
                    "-vf", "scale=400:-1",
                    thumb_path,
                ],
                capture_output=True,
                timeout=15,
            )
            if os.path.exists(thumb_path):
                return thumb_name
        except Exception:
            return None

    return None


@documents_bp.route("/upload", methods=["POST"])
@login_required
def upload():
    if "file" not in request.files:
        return {"error": "No file provided"}, 400

    file = request.files["file"]
    if not file.filename:
        return {"error": "Empty filename"}, 400

    ext, file_type = _classify_file(file.filename)
    if not file_type:
        return {"error": f"Unsupported file type: .{ext}"}, 400

    safe_name = uuid.uuid4().hex + "." + ext
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    filepath = os.path.join(upload_dir, safe_name)
    file.save(filepath)

    thumb_name = _generate_thumbnail(
        filepath, file_type, current_app.config["THUMBNAIL_FOLDER"]
    )

    # Place new documents in a staggered grid position
    count = Document.query.filter_by(user_id=current_user.id).count()
    col = count % 4
    row = count // 4
    pos_x = 80 + col * 220
    pos_y = 80 + row * 240

    doc = Document(
        user_id=current_user.id,
        filename=safe_name,
        original_name=file.filename,
        file_type=file_type,
        thumbnail_path=thumb_name,
        position_x=pos_x,
        position_y=pos_y,
    )
    db.session.add(doc)
    db.session.commit()
    return doc.to_dict(), 201


@documents_bp.route("", methods=["GET"])
@login_required
def list_documents():
    docs = Document.query.filter_by(user_id=current_user.id).order_by(Document.uploaded_at).all()
    return [d.to_dict() for d in docs], 200


@documents_bp.route("/<int:doc_id>", methods=["DELETE"])
@login_required
def delete_document(doc_id):
    doc = Document.query.filter_by(id=doc_id, user_id=current_user.id).first()
    if not doc:
        return {"error": "Document not found"}, 404

    # Remove related connections
    Connection.query.filter(
        Connection.user_id == current_user.id,
        (Connection.source_doc_id == doc_id) | (Connection.target_doc_id == doc_id),
    ).delete(synchronize_session="fetch")

    # Remove files from disk
    upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.filename)
    if os.path.exists(upload_path):
        os.remove(upload_path)
    if doc.thumbnail_path:
        thumb_path = os.path.join(current_app.config["THUMBNAIL_FOLDER"], doc.thumbnail_path)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)

    db.session.delete(doc)
    db.session.commit()
    return {"message": "Document deleted"}, 200


@documents_bp.route("/<int:doc_id>/file", methods=["GET"])
@login_required
def serve_file(doc_id):
    doc = Document.query.filter_by(id=doc_id, user_id=current_user.id).first()
    if not doc:
        return {"error": "Document not found"}, 404

    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.filename)
    if not os.path.exists(filepath):
        return {"error": "File missing from disk"}, 404

    return send_file(filepath, download_name=doc.original_name)


@documents_bp.route("/<int:doc_id>/thumbnail", methods=["GET"])
@login_required
def serve_thumbnail(doc_id):
    doc = Document.query.filter_by(id=doc_id, user_id=current_user.id).first()
    if not doc:
        return {"error": "Document not found"}, 404

    if not doc.thumbnail_path:
        return {"error": "No thumbnail available"}, 404

    thumb_path = os.path.join(current_app.config["THUMBNAIL_FOLDER"], doc.thumbnail_path)
    if not os.path.exists(thumb_path):
        return {"error": "Thumbnail file missing"}, 404

    return send_file(thumb_path, mimetype="image/png")


def _extract_snippet(page_text, query, context_chars=60):
    """Return a snippet of text surrounding the first occurrence of query."""
    lower_text = page_text.lower()
    idx = lower_text.find(query.lower())
    if idx == -1:
        return None
    start = max(0, idx - context_chars)
    end = min(len(page_text), idx + len(query) + context_chars)
    snippet = page_text[start:end].replace("\n", " ").strip()
    if start > 0:
        snippet = "…" + snippet
    if end < len(page_text):
        snippet = snippet + "…"
    return snippet


@documents_bp.route("/search", methods=["GET"])
@login_required
def search_documents():
    query = (request.args.get("q") or "").strip()
    if not query:
        return {"error": "Query parameter 'q' is required"}, 400

    docs = Document.query.filter_by(user_id=current_user.id).all()
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    results = []

    for doc in docs:
        matches = []

        if doc.file_type == "pdf":
            filepath = os.path.join(upload_dir, doc.filename)
            if os.path.exists(filepath):
                try:
                    import fitz

                    pdf = fitz.open(filepath)
                    for page_num in range(len(pdf)):
                        page = pdf[page_num]
                        hits = page.search_for(query)
                        if hits:
                            text = page.get_text("text")
                            snippet = _extract_snippet(text, query)
                            matches.append({
                                "page": page_num + 1,
                                "snippet": snippet,
                            })
                    pdf.close()
                except Exception:
                    pass

        # Always check filename for all file types
        if not matches and query.lower() in doc.original_name.lower():
            matches.append({"page": None, "snippet": None})

        if matches:
            results.append({
                "doc_id": doc.id,
                "original_name": doc.original_name,
                "file_type": doc.file_type,
                "has_thumbnail": doc.thumbnail_path is not None,
                "matches": matches,
            })

    return jsonify(results), 200
