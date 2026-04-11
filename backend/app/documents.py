import io
import os
import re
import subprocess
import uuid

from flask import Blueprint, current_app, jsonify, request, send_file
from flask_login import current_user, login_required

from .models import Connection, Document, Highlight, db

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


def _hex_to_rgb(hex_color):
    """Convert '#rrggbb' to (r, g, b) floats in 0..1."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return (0.976, 0.573, 0.235)
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    return (r, g, b)


def _lighten(rgb, factor=0.55):
    """Blend an RGB colour towards white by factor (0=unchanged, 1=white)."""
    return tuple(c + (1.0 - c) * factor for c in rgb)


def _block_line_rects(page, match_rect):
    """Return the line bboxes of the text block that contains match_rect."""
    try:
        import fitz
        for block in page.get_text("dict")["blocks"]:
            if block.get("type") != 0:
                continue
            if fitz.Rect(block["bbox"]).intersects(match_rect):
                return [fitz.Rect(line["bbox"]) for line in block.get("lines", [])]
    except Exception:
        pass
    return []


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

    Connection.query.filter(
        Connection.user_id == current_user.id,
        (Connection.source_doc_id == doc_id) | (Connection.target_doc_id == doc_id),
    ).delete(synchronize_session="fetch")

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

    if doc.file_type != "pdf":
        return send_file(filepath, download_name=doc.original_name)

    # Collect highlight terms: saved highlights + query params
    terms = []

    # Multi-highlight param: ?highlights=term1:color1,term2:color2
    highlights_param = request.args.get("highlights", "").strip()
    if highlights_param:
        for pair in highlights_param.split(","):
            if ":" in pair:
                term, color = pair.rsplit(":", 1)
                term = term.strip()
                if term:
                    terms.append((term, _hex_to_rgb(color.strip())))

    # Legacy single-highlight param from search
    legacy_hl = request.args.get("highlight", "").strip()
    if legacy_hl:
        terms.append((legacy_hl, (0.976, 0.573, 0.235)))

    if not terms:
        return send_file(filepath, download_name=doc.original_name)

    try:
        import fitz

        pdf = fitz.open(filepath)
        for page in pdf:
            for term, rgb in terms:
                rects = page.search_for(term)
                for match_rect in rects:
                    # Layer 1 — paragraph context: lighter highlight over the whole block
                    para_rects = _block_line_rects(page, match_rect)
                    if para_rects:
                        para_annot = page.add_highlight_annot(para_rects)
                        para_annot.set_colors(stroke=_lighten(rgb, 0.55))
                        para_annot.update(opacity=0.35)

                    # Layer 2 — exact match: darker highlight over the found text
                    annot = page.add_highlight_annot(match_rect)
                    annot.set_colors(stroke=rgb)
                    annot.update(opacity=0.75)
        buf = io.BytesIO()
        pdf.save(buf)
        pdf.close()
        buf.seek(0)
        return send_file(buf, mimetype="application/pdf", download_name=doc.original_name)
    except Exception:
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


# --- Highlight CRUD ---

@documents_bp.route("/<int:doc_id>/highlights", methods=["GET"])
@login_required
def list_highlights(doc_id):
    doc = Document.query.filter_by(id=doc_id, user_id=current_user.id).first()
    if not doc:
        return {"error": "Document not found"}, 404
    highlights = Highlight.query.filter_by(user_id=current_user.id, doc_id=doc_id).all()
    return jsonify([h.to_dict() for h in highlights]), 200


@documents_bp.route("/<int:doc_id>/highlights", methods=["POST"])
@login_required
def create_highlight(doc_id):
    doc = Document.query.filter_by(id=doc_id, user_id=current_user.id).first()
    if not doc:
        return {"error": "Document not found"}, 404

    data = request.get_json()
    term = (data.get("term") or "").strip()
    color = (data.get("color") or "#fb923c").strip()

    if not term:
        return {"error": "Term is required"}, 400
    if len(color) != 7 or not color.startswith("#"):
        color = "#fb923c"

    hl = Highlight(user_id=current_user.id, doc_id=doc_id, term=term, color=color)
    db.session.add(hl)
    db.session.commit()
    return hl.to_dict(), 201


@documents_bp.route("/<int:doc_id>/highlights/<int:hl_id>", methods=["DELETE"])
@login_required
def delete_highlight(doc_id, hl_id):
    hl = Highlight.query.filter_by(id=hl_id, user_id=current_user.id, doc_id=doc_id).first()
    if not hl:
        return {"error": "Highlight not found"}, 404
    db.session.delete(hl)
    db.session.commit()
    return {"message": "Highlight removed"}, 200


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
