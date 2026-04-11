import os
import re

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

from .autolink import _extract_text_full
from .models import Document

chat_bp = Blueprint("chat", __name__)

MAX_DOCS_IN_CONTEXT = 20
MAX_TOTAL_CHARS = 50000


@chat_bp.route("/chat", methods=["POST"])
@login_required
def chat():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY environment variable is not set"}, 500

    data = request.get_json()
    user_message = (data.get("message") or "").strip()
    history = data.get("history", [])

    if not user_message:
        return {"error": "Message is required"}, 400

    docs = Document.query.filter_by(user_id=current_user.id).order_by(Document.uploaded_at).all()
    if not docs:
        return jsonify({
            "reply": "You haven't uploaded any documents yet. Upload some documents first, and I'll be able to answer questions about them.",
            "citations": [],
        }), 200

    upload_dir = current_app.config["UPLOAD_FOLDER"]

    doc_summaries = []
    total_chars = 0
    for doc in docs[:MAX_DOCS_IN_CONTEXT]:
        text = _extract_text_full(doc, upload_dir)
        if total_chars + len(text) > MAX_TOTAL_CHARS:
            text = text[: MAX_TOTAL_CHARS - total_chars]
        doc_summaries.append(f'[DOC_ID:{doc.id}] "{doc.original_name}"\n{text}')
        total_chars += len(text)
        if total_chars >= MAX_TOTAL_CHARS:
            break

    docs_context = "\n\n---\n\n".join(doc_summaries)

    system_prompt = (
        "You are a knowledgeable research assistant. The user has uploaded documents, "
        "and you should use their contents to answer questions accurately.\n\n"
        "When referencing specific content from a document, include inline citations using "
        "this exact format: [DOC:document_id:page_number:\"exact quote\"]. "
        "The page_number should be the page where the quote appears (use 1 if unknown). "
        "The quote should be the exact text from the document (keep it under 100 characters). "
        "Include citations whenever you reference, paraphrase, or quote document content.\n\n"
        "If the user asks for quotes, excerpts, or specific passages, provide them with "
        "proper citations so they can locate them in the original documents.\n\n"
        f"Here are the user's documents:\n\n{docs_context}"
    )

    messages = []
    for h in history[-20:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system_prompt,
            messages=messages,
        )

        reply_text = response.content[0].text.strip()
    except Exception as e:
        return {"error": f"Chat failed: {str(e)}"}, 502

    citations = _parse_citations(reply_text, docs)

    return jsonify({
        "reply": reply_text,
        "citations": citations,
    }), 200


def _parse_citations(text, docs):
    """Parse [DOC:id:page:"quote"] markers from the response."""
    doc_map = {d.id: d for d in docs}
    citations = []
    pattern = r'\[DOC:(\d+):(\d+):"([^"]*?)"\]'

    for match in re.finditer(pattern, text):
        doc_id = int(match.group(1))
        page = int(match.group(2))
        quote = match.group(3)

        if doc_id in doc_map:
            citations.append({
                "doc_id": doc_id,
                "page": page,
                "quote": quote,
                "doc_name": doc_map[doc_id].original_name,
            })

    return citations
