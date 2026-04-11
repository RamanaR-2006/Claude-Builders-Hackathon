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

    if doc.file_type in ("audio", "video"):
        if doc.transcription:
            return doc.transcription[:MAX_CHARS_PER_DOC].strip()
        if doc.transcription_status == "failed":
            return f'[{doc.file_type.capitalize()}: "{doc.original_name}" — transcription failed]'
        return f'[{doc.file_type.capitalize()}: "{doc.original_name}" — transcription pending]'

    return f'[File: "{doc.original_name}" (type: {doc.file_type})]'


def _extract_text_full(doc, upload_dir, max_chars=6000):
    """Extract more text for chat context."""
    if doc.file_type == "pdf":
        filepath = os.path.join(upload_dir, doc.filename)
        if not os.path.exists(filepath):
            return f'[File: "{doc.original_name}"]'
        try:
            import fitz

            pdf = fitz.open(filepath)
            text = ""
            for page_num, page in enumerate(pdf):
                page_text = page.get_text("text")
                text += f"\n[Page {page_num + 1}]\n{page_text}"
                if len(text) > max_chars:
                    break
            pdf.close()
            return text[:max_chars].strip() or f'[File: "{doc.original_name}"]'
        except Exception:
            return f'[File: "{doc.original_name}"]'

    if doc.file_type in ("audio", "video"):
        if doc.transcription:
            # Wrap in a single page marker so citations work
            return f"[Page 1]\n{doc.transcription[:max_chars].strip()}"
        if doc.transcription_status == "failed":
            return f'[{doc.file_type.capitalize()}: "{doc.original_name}" — transcription failed]'
        return f'[{doc.file_type.capitalize()}: "{doc.original_name}" — transcription pending]'

    return f'[File: "{doc.original_name}" (type: {doc.file_type})]'


def _find_clusters(doc_ids, connections):
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

    min_x = min((p["x"] for p in positions.values()), default=0)
    min_y = min((p["y"] for p in positions.values()), default=0)
    if min_x < 40 or min_y < 40:
        dx = max(0, 40 - min_x)
        dy = max(0, 40 - min_y)
        for p in positions.values():
            p["x"] = round(p["x"] + dx)
            p["y"] = round(p["y"] + dy)

    return positions


CATEGORIES = {'THEMATIC', 'METHODOLOGICAL', 'CONTRADICTORY', 'COMPLEMENTARY', 'CAUSAL', 'COMPARATIVE'}


def _extract_category(description):
    """Extract the leading category label from a description like 'THEMATIC: ...'"""
    if not description:
        return None
    upper = description.strip().upper()
    for cat in CATEGORIES:
        if upper.startswith(cat):
            return cat
    return None


def _get_existing_categories(user_id, src_id, tgt_id):
    """Return the set of category labels already used between a pair of docs."""
    existing = Connection.query.filter(
        Connection.user_id == user_id,
        ((Connection.source_doc_id == src_id) & (Connection.target_doc_id == tgt_id))
        | ((Connection.source_doc_id == tgt_id) & (Connection.target_doc_id == src_id)),
    ).all()
    return {_extract_category(c.description or '') for c in existing} - {None}


def _has_similar_description(user_id, src_id, tgt_id, new_desc):
    """Check if a near-identical description already exists between this pair."""
    existing = Connection.query.filter(
        Connection.user_id == user_id,
        ((Connection.source_doc_id == src_id) & (Connection.target_doc_id == tgt_id))
        | ((Connection.source_doc_id == tgt_id) & (Connection.target_doc_id == src_id)),
    ).all()
    if not existing:
        return False
    new_lower = new_desc.strip().lower()
    if not new_lower:
        return False
    for c in existing:
        existing_lower = (c.description or "").strip().lower()
        if not existing_lower:
            continue
        if new_lower == existing_lower:
            return True
        if new_lower in existing_lower or existing_lower in new_lower:
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
    anchor_ids = set(data.get("anchor_ids", []))
    overall_prompt = (data.get("overall_prompt") or "").strip()
    guided_rules = data.get("guided_rules", [])
    # Backward compat: accept old single "guidance" field
    old_guidance = (data.get("guidance") or "").strip()

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
        anchor_tag = " [ANCHOR]" if doc.id in anchor_ids else ""
        doc_summaries.append(f'[Doc ID: {doc.id}]{anchor_tag} "{doc.original_name}"\n{text}')

    prompt_body = "\n\n---\n\n".join(doc_summaries)

    system_parts = [
        "You analyze documents and identify deep, specific connections between them. "
        "Given summaries of documents, identify which pairs are meaningfully related and explain precisely how. "
        "You may create at most 3 connections between the same pair of documents, but EACH must "
        "use a STRICTLY DIFFERENT category. The available categories are: "
        "THEMATIC (shared topics or subject matter), "
        "METHODOLOGICAL (similar methods, approaches, or techniques), "
        "CONTRADICTORY (opposing viewpoints or conflicting evidence), "
        "COMPLEMENTARY (different angles that reinforce each other), "
        "CAUSAL (cause-and-effect or dependency), "
        "COMPARATIVE (explicit comparison of findings or concepts). "
        "HARD RULE: for any given pair of documents, each connection must use a DIFFERENT category. "
        "You CANNOT have two THEMATIC connections between the same pair — that is always wrong. "
        "If the only relationship you can find is thematic, create only ONE connection. "
        "Only create multiple connections between the same pair when you can identify genuinely "
        "distinct relationship dimensions (e.g., THEMATIC + METHODOLOGICAL + CONTRADICTORY). "
        "Start each description with the category label, e.g. 'THEMATIC: ...' "
        "DESCRIPTION QUALITY REQUIREMENTS — each description must: "
        "(1) Name the specific concept, finding, term, or methodology that links the documents — not just the general topic. "
        "(2) Reference concrete evidence from each document, e.g. a specific claim, section, argument, or data point found in the text. "
        "(3) Explain WHY this relationship matters or what insight it reveals. "
        "Write 2-3 sentences. Avoid vague statements like 'both discuss X' — be analytical and specific. "
        "Return ONLY valid JSON with this exact structure: "
        '{"connections": [{"source_id": <int>, "target_id": <int>, "description": "<category: 2-3 sentence specific description>", "strength": <float 1-10>}]}. '
        "The strength field: 1-3 = superficial/tangential, 4-6 = moderate with clear overlap, 7-9 = strong shared core, 10 = inseparable. "
        "Only connect documents that have a genuine, substantive relationship. "
        "Do not connect every document to every other. Be selective — quality over quantity."
    ]

    if anchor_ids:
        system_parts.append(
            " Documents marked [ANCHOR] are central reference points. "
            "Prioritize connecting other documents TO these anchors. "
            "Non-anchor connections are still allowed if the relationship is strong."
        )

    if overall_prompt:
        system_parts.append(f" Additional context: {overall_prompt}")

    system_prompt = "".join(system_parts)

    user_msg = f"Analyze these {len(docs)} documents and identify connections:\n\n{prompt_body}"

    if guided_rules and any(r.strip() for r in guided_rules):
        rules_text = "\n".join(
            f"{i + 1}) {r.strip()}" for i, r in enumerate(guided_rules) if r.strip()
        )
        user_msg += f"\n\nAdditionally, apply these connection guidelines:\n{rules_text}"
    elif old_guidance:
        user_msg += f"\n\nFocus connections on the following theme or criteria: {old_guidance}"

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_msg}],
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
    pair_counts_new = {}   # pk -> int: connection count added this batch
    pair_cats_new = {}     # pk -> set: categories used this batch (+ existing)

    def _pair_key(a, b):
        return (min(a, b), max(a, b))

    MAX_CONNECTIONS_PER_PAIR = 3

    for conn_data in ai_connections:
        src_id = conn_data.get("source_id")
        tgt_id = conn_data.get("target_id")
        desc = conn_data.get("description", "")
        strength = conn_data.get("strength")

        if src_id not in valid_ids or tgt_id not in valid_ids:
            continue
        if src_id == tgt_id:
            continue
        if _has_similar_description(current_user.id, src_id, tgt_id, desc):
            continue

        pk = _pair_key(src_id, tgt_id)

        # Enforce per-pair category uniqueness (server-side safety net)
        new_cat = _extract_category(desc)
        if pk not in pair_cats_new:
            pair_cats_new[pk] = _get_existing_categories(current_user.id, src_id, tgt_id)
        if new_cat and new_cat in pair_cats_new[pk]:
            continue  # same category already exists for this pair — skip

        # Enforce per-pair connection cap
        existing_count = Connection.query.filter(
            Connection.user_id == current_user.id,
            ((Connection.source_doc_id == src_id) & (Connection.target_doc_id == tgt_id))
            | ((Connection.source_doc_id == tgt_id) & (Connection.target_doc_id == src_id)),
        ).count()
        batch_count = pair_counts_new.get(pk, 0)
        if existing_count + batch_count >= MAX_CONNECTIONS_PER_PAIR:
            continue
        pair_counts_new[pk] = batch_count + 1
        if new_cat:
            pair_cats_new[pk].add(new_cat)

        if strength is not None:
            try:
                strength = max(1.0, min(10.0, float(strength)))
            except (ValueError, TypeError):
                strength = None

        conn = Connection(
            user_id=current_user.id,
            source_doc_id=src_id,
            target_doc_id=tgt_id,
            description=desc,
            strength=strength,
        )
        db.session.add(conn)
        db.session.flush()
        created_connections.append(conn.to_dict())

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
