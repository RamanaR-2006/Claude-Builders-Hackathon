import json
import math
import os

from flask import Blueprint, current_app, request
from flask_login import current_user, login_required

from .models import Connection, Document, db

autolink_bp = Blueprint("autolink", __name__)

MAX_CHARS_PER_DOC = 2000

NODE_W = 160
NODE_H = 130
NODE_PAD = 50
CELL_W = NODE_W + NODE_PAD
CELL_H = NODE_H + NODE_PAD


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


def _find_clusters(doc_ids, connections):
    """Find connected components among doc_ids given connections."""
    adj = {d: set() for d in doc_ids}
    id_set = set(doc_ids)
    for c in connections:
        s, t = c.source_doc_id, c.target_doc_id
        if s in id_set and t in id_set:
            adj[s].add(t)
            adj[t].add(s)

    visited = set()
    clusters = []
    for d in doc_ids:
        if d in visited:
            continue
        cluster = []
        stack = [d]
        while stack:
            node = stack.pop()
            if node in visited:
                continue
            visited.add(node)
            cluster.append(node)
            for nb in adj[node]:
                if nb not in visited:
                    stack.append(nb)
        clusters.append(cluster)
    return clusters


def _layout_cluster_circle(ids, cx, cy):
    """Lay out a cluster of doc IDs in a circle centered at (cx, cy)."""
    n = len(ids)
    if n == 1:
        return {str(ids[0]): {"x": round(cx), "y": round(cy)}}

    min_spacing = max(CELL_W, CELL_H)
    radius = max(min_spacing, (n * min_spacing) / (2 * math.pi))

    positions = {}
    for i, doc_id in enumerate(ids):
        angle = (2 * math.pi * i / n) - math.pi / 2
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        positions[str(doc_id)] = {"x": round(x), "y": round(y)}
    return positions


def _compute_smart_layout(all_doc_ids, connections, start_x=120, start_y=120):
    """Lay out documents with no overlaps. Connected clusters form circles, arranged in a grid of clusters."""
    clusters = _find_clusters(all_doc_ids, connections)

    positions = {}
    cursor_x = start_x
    cursor_y = start_y
    row_height = 0
    max_row_width = 1200

    for cluster in clusters:
        n = len(cluster)
        if n == 1:
            bbox_w = CELL_W
            bbox_h = CELL_H
        else:
            min_spacing = max(CELL_W, CELL_H)
            radius = max(min_spacing, (n * min_spacing) / (2 * math.pi))
            bbox_w = 2 * radius + CELL_W
            bbox_h = 2 * radius + CELL_H

        if cursor_x + bbox_w > max_row_width and cursor_x > start_x:
            cursor_x = start_x
            cursor_y += row_height + NODE_PAD
            row_height = 0

        cx = cursor_x + bbox_w / 2
        cy = cursor_y + bbox_h / 2

        cluster_positions = _layout_cluster_circle(cluster, cx, cy)
        positions.update(cluster_positions)

        cursor_x += bbox_w + NODE_PAD
        row_height = max(row_height, bbox_h)

    # Ensure no position is negative
    min_x = min((p["x"] for p in positions.values()), default=0)
    min_y = min((p["y"] for p in positions.values()), default=0)
    if min_x < 40 or min_y < 40:
        dx = max(0, 40 - min_x)
        dy = max(0, 40 - min_y)
        for p in positions.values():
            p["x"] = round(p["x"] + dx)
            p["y"] = round(p["y"] + dy)

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

    # Compute layout for ALL user documents using ALL connections
    all_docs = Document.query.filter_by(user_id=current_user.id).all()
    all_doc_ids = [d.id for d in all_docs]
    all_connections = Connection.query.filter_by(user_id=current_user.id).all()

    positions = _compute_smart_layout(all_doc_ids, all_connections)

    for doc in all_docs:
        pos = positions.get(str(doc.id))
        if pos:
            doc.position_x = pos["x"]
            doc.position_y = pos["y"]

    db.session.commit()

    return {
        "connections": created_connections,
        "positions": positions,
    }, 200


@autolink_bp.route("/organize", methods=["POST"])
@login_required
def organize():
    """Reorganize all documents on the canvas with no overlapping thumbnails."""
    all_docs = Document.query.filter_by(user_id=current_user.id).all()
    if not all_docs:
        return {"positions": {}}, 200

    all_doc_ids = [d.id for d in all_docs]
    all_connections = Connection.query.filter_by(user_id=current_user.id).all()

    positions = _compute_smart_layout(all_doc_ids, all_connections)

    for doc in all_docs:
        pos = positions.get(str(doc.id))
        if pos:
            doc.position_x = pos["x"]
            doc.position_y = pos["y"]

    db.session.commit()

    return {"positions": positions}, 200
