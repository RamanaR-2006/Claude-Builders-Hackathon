import json
import math
import os

from flask import Blueprint, current_app, request
from flask_login import current_user, login_required

from .models import Connection, Document, db

autolink_bp = Blueprint("autolink", __name__)

MAX_CHARS_PER_DOC = 2000


def _extract_text(doc, upload_dir):
    """Extract searchable text from a document."""
    if doc.file_type == "pdf":
        filepath = os.path.join(upload_dir, doc.filename)
        if not os.path.exists(filepath):
            return f'[File: "{doc.original_name}"]'
        try:
            import fitz

            pdf = fitz.open(filepath)
            text = ""
            for page in pdf:
                text += page.get_text("text")
                if len(text) > MAX_CHARS_PER_DOC:
                    break
            pdf.close()
            return text[:MAX_CHARS_PER_DOC].strip() or f'[File: "{doc.original_name}"]'
        except Exception:
            return f'[File: "{doc.original_name}"]'

    return f'[File: "{doc.original_name}" (type: {doc.file_type})]'


def _compute_layout(doc_ids, center_x=500, center_y=400, radius_x=300, radius_y=220):
    """Arrange documents in an ellipse."""
    n = len(doc_ids)
    if n == 0:
        return {}
    positions = {}
    for i, doc_id in enumerate(doc_ids):
        angle = (2 * math.pi * i / n) - math.pi / 2
        x = center_x + radius_x * math.cos(angle)
        y = center_y + radius_y * math.sin(angle)
        positions[str(doc_id)] = {"x": round(x), "y": round(y)}
    return positions


def _connection_exists(user_id, src_id, tgt_id):
    if Connection.query.filter_by(user_id=user_id, source_doc_id=src_id, target_doc_id=tgt_id).first():
        return True
    if Connection.query.filter_by(user_id=user_id, source_doc_id=tgt_id, target_doc_id=src_id).first():
        return True
    return False


@autolink_bp.route("/autolink", methods=["POST"])
@login_required
def autolink():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY environment variable is not set"}, 500

    data = request.get_json()
    doc_ids = data.get("doc_ids", [])
    if len(doc_ids) < 2:
        return {"error": "At least 2 documents are required"}, 400

    docs = Document.query.filter(
        Document.id.in_(doc_ids),
        Document.user_id == current_user.id,
    ).all()

    if len(docs) < 2:
        return {"error": "At least 2 valid documents are required"}, 400

    upload_dir = current_app.config["UPLOAD_FOLDER"]

    doc_summaries = []
    for doc in docs:
        text = _extract_text(doc, upload_dir)
        doc_summaries.append(f'[Doc ID: {doc.id}] "{doc.original_name}"\n{text}')

    prompt_body = "\n\n---\n\n".join(doc_summaries)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=(
                "You analyze documents and identify meaningful connections between them. "
                "Given summaries of documents, identify which pairs are related and why. "
                "Return ONLY valid JSON with this exact structure: "
                '{"connections": [{"source_id": <int>, "target_id": <int>, "description": "<1-2 sentence reason>"}]}. '
                "Only connect documents that have a genuine thematic, topical, or contextual relationship. "
                "Do not connect every document to every other. Be selective and meaningful."
            ),
            messages=[{
                "role": "user",
                "content": f"Analyze these {len(docs)} documents and identify connections:\n\n{prompt_body}",
            }],
        )

        response_text = message.content[0].text.strip()
        # Extract JSON from response (handle markdown code blocks)
        if "```" in response_text:
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            response_text = response_text[start:end]

        result = json.loads(response_text)
        ai_connections = result.get("connections", [])
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response"}, 502
    except Exception as e:
        return {"error": f"AI analysis failed: {str(e)}"}, 502

    valid_ids = {d.id for d in docs}
    created_connections = []

    for conn_data in ai_connections:
        src_id = conn_data.get("source_id")
        tgt_id = conn_data.get("target_id")
        desc = conn_data.get("description", "")

        if src_id not in valid_ids or tgt_id not in valid_ids:
            continue
        if src_id == tgt_id:
            continue
        if _connection_exists(current_user.id, src_id, tgt_id):
            continue

        conn = Connection(
            user_id=current_user.id,
            source_doc_id=src_id,
            target_doc_id=tgt_id,
            description=desc,
        )
        db.session.add(conn)
        db.session.flush()
        created_connections.append(conn.to_dict())

    # Update positions
    positions = _compute_layout([d.id for d in docs])
    for doc in docs:
        pos = positions.get(str(doc.id))
        if pos:
            doc.position_x = pos["x"]
            doc.position_y = pos["y"]

    db.session.commit()

    return {
        "connections": created_connections,
        "positions": positions,
    }, 200
