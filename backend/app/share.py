import json
import os

from flask import Blueprint, current_app, jsonify, request, send_file
from flask_login import current_user, login_required

from .models import Connection, Document, SharedCanvas, User, db

share_bp = Blueprint("share", __name__)


@share_bp.route("/share", methods=["POST"])
@login_required
def create_shared_canvas():
    data = request.get_json(force=True)
    title = (data.get("title") or "").strip()
    if not title:
        return {"error": "Title is required"}, 400

    description = (data.get("description") or "").strip()
    doc_ids = data.get("doc_ids", [])
    if not doc_ids:
        return {"error": "Select at least one document"}, 400

    docs = Document.query.filter(
        Document.id.in_(doc_ids),
        Document.user_id == current_user.id,
    ).all()

    if not docs:
        return {"error": "No valid documents found"}, 400

    valid_ids = {d.id for d in docs}

    conns = Connection.query.filter(
        Connection.user_id == current_user.id,
        Connection.source_doc_id.in_(valid_ids),
        Connection.target_doc_id.in_(valid_ids),
    ).all()

    snapshot = {
        "documents": [
            {
                "id": d.id,
                "original_name": d.original_name,
                "file_type": d.file_type,
                "position_x": d.position_x,
                "position_y": d.position_y,
                "has_thumbnail": d.thumbnail_path is not None,
            }
            for d in docs
        ],
        "connections": [
            {
                "id": c.id,
                "source_doc_id": c.source_doc_id,
                "target_doc_id": c.target_doc_id,
                "description": c.description,
                "strength": c.strength,
            }
            for c in conns
        ],
    }

    canvas = SharedCanvas(
        user_id=current_user.id,
        title=title,
        description=description,
        snapshot_data=json.dumps(snapshot),
    )
    db.session.add(canvas)
    db.session.commit()

    result = canvas.to_dict()
    result["doc_count"] = len(docs)
    result["conn_count"] = len(conns)
    return jsonify(result), 201


@share_bp.route("/share", methods=["GET"])
@login_required
def list_shared_canvases():
    canvases = SharedCanvas.query.filter_by(user_id=current_user.id).order_by(SharedCanvas.created_at.desc()).all()
    out = []
    for c in canvases:
        snap = json.loads(c.snapshot_data) if c.snapshot_data else {}
        out.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "doc_count": len(snap.get("documents", [])),
            "conn_count": len(snap.get("connections", [])),
        })
    return jsonify(out), 200


@share_bp.route("/share/<int:canvas_id>", methods=["DELETE"])
@login_required
def delete_shared_canvas(canvas_id):
    canvas = SharedCanvas.query.filter_by(id=canvas_id, user_id=current_user.id).first()
    if not canvas:
        return {"error": "Shared canvas not found"}, 404
    db.session.delete(canvas)
    db.session.commit()
    return {"message": "Shared canvas deleted"}, 200


@share_bp.route("/explore", methods=["GET"])
@login_required
def list_public_canvases():
    canvases = SharedCanvas.query.order_by(SharedCanvas.created_at.desc()).all()
    out = []
    for c in canvases:
        snap = json.loads(c.snapshot_data) if c.snapshot_data else {}
        author = db.session.get(User, c.user_id)
        out.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "author_email": author.email if author else "Unknown",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "doc_count": len(snap.get("documents", [])),
            "conn_count": len(snap.get("connections", [])),
        })
    return jsonify(out), 200


@share_bp.route("/explore/<int:canvas_id>", methods=["GET"])
@login_required
def get_public_canvas(canvas_id):
    canvas = SharedCanvas.query.get(canvas_id)
    if not canvas:
        return {"error": "Shared canvas not found"}, 404

    author = db.session.get(User, canvas.user_id)
    snap = json.loads(canvas.snapshot_data) if canvas.snapshot_data else {}

    return jsonify({
        "id": canvas.id,
        "title": canvas.title,
        "description": canvas.description,
        "author_email": author.email if author else "Unknown",
        "created_at": canvas.created_at.isoformat() if canvas.created_at else None,
        "snapshot": snap,
    }), 200


@share_bp.route("/explore/<int:canvas_id>/thumbnail/<int:doc_id>", methods=["GET"])
@login_required
def get_public_thumbnail(canvas_id, doc_id):
    canvas = SharedCanvas.query.get(canvas_id)
    if not canvas:
        return {"error": "Canvas not found"}, 404

    snap = json.loads(canvas.snapshot_data) if canvas.snapshot_data else {}
    doc_ids_in_snap = {d["id"] for d in snap.get("documents", [])}
    if doc_id not in doc_ids_in_snap:
        return {"error": "Document not in this canvas"}, 404

    doc = db.session.get(Document, doc_id)
    if not doc or not doc.thumbnail_path:
        return {"error": "Thumbnail not found"}, 404

    thumb_dir = current_app.config["THUMBNAIL_FOLDER"]
    thumb_path = os.path.join(thumb_dir, doc.thumbnail_path)
    if not os.path.exists(thumb_path):
        return {"error": "Thumbnail file missing"}, 404

    return send_file(thumb_path, mimetype="image/png")
