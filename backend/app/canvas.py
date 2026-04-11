from flask import Blueprint, request
from flask_login import current_user, login_required

from .models import Connection, Document, db

canvas_bp = Blueprint("canvas", __name__)


@canvas_bp.route("/documents/<int:doc_id>/position", methods=["PUT"])
@login_required
def update_position(doc_id):
    doc = Document.query.filter_by(id=doc_id, user_id=current_user.id).first()
    if not doc:
        return {"error": "Document not found"}, 404

    data = request.get_json()
    if "position_x" in data:
        doc.position_x = float(data["position_x"])
    if "position_y" in data:
        doc.position_y = float(data["position_y"])
    if "is_locked" in data:
        doc.is_locked = bool(data["is_locked"])

    db.session.commit()
    return doc.to_dict(), 200


@canvas_bp.route("/connections", methods=["GET"])
@login_required
def list_connections():
    conns = Connection.query.filter_by(user_id=current_user.id).all()
    return [c.to_dict() for c in conns], 200


@canvas_bp.route("/connections", methods=["POST"])
@login_required
def create_connection():
    data = request.get_json()
    source_id = data.get("source_doc_id")
    target_id = data.get("target_doc_id")

    if not source_id or not target_id:
        return {"error": "source_doc_id and target_doc_id are required"}, 400
    if source_id == target_id:
        return {"error": "Cannot connect a document to itself"}, 400

    source = Document.query.filter_by(id=source_id, user_id=current_user.id).first()
    target = Document.query.filter_by(id=target_id, user_id=current_user.id).first()
    if not source or not target:
        return {"error": "Document not found"}, 404

    existing = Connection.query.filter(
        Connection.user_id == current_user.id,
        ((Connection.source_doc_id == source_id) & (Connection.target_doc_id == target_id))
        | ((Connection.source_doc_id == target_id) & (Connection.target_doc_id == source_id)),
    ).all()

    conn = Connection(
        user_id=current_user.id,
        source_doc_id=source_id,
        target_doc_id=target_id,
        description=data.get("description", ""),
    )
    db.session.add(conn)
    db.session.commit()

    result = conn.to_dict()
    if existing:
        result["warning"] = f"These documents already have {len(existing)} other connection(s)"
        result["existing_count"] = len(existing)
    return result, 201


@canvas_bp.route("/connections/<int:conn_id>", methods=["PUT"])
@login_required
def update_connection(conn_id):
    conn = Connection.query.filter_by(id=conn_id, user_id=current_user.id).first()
    if not conn:
        return {"error": "Connection not found"}, 404

    data = request.get_json()
    if "description" in data:
        conn.description = data["description"]

    db.session.commit()
    return conn.to_dict(), 200


@canvas_bp.route("/connections/<int:conn_id>", methods=["DELETE"])
@login_required
def delete_connection(conn_id):
    conn = Connection.query.filter_by(id=conn_id, user_id=current_user.id).first()
    if not conn:
        return {"error": "Connection not found"}, 404

    db.session.delete(conn)
    db.session.commit()
    return {"message": "Connection deleted"}, 200
