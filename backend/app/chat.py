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

    valid_doc_ids = [doc.id for doc in docs[:MAX_DOCS_IN_CONTEXT]]

    system_prompt = (
        "You are a knowledgeable research assistant. The user has uploaded documents, "
        "and you must answer questions using ONLY the content provided below.\n\n"
        "CITATION RULES — follow exactly:\n"
        "1. Use this format: [DOC:document_id:page_number:\"exact quote\"]\n"
        f"2. Only use these document IDs: {valid_doc_ids}. NEVER invent or guess an ID.\n"
        "3. The quote must be copied verbatim from the [Page N] section of the document text. "
        "Use the page number shown in the [Page N] label immediately before the quoted text. "
        "Copy the text character-for-character including punctuation — do NOT paraphrase.\n"
        "4. Keep quotes between 20 and 200 characters — long enough to be meaningful, "
        "short enough to be exact.\n"
        "5. If you cannot find a verbatim match in the provided text, OMIT the citation entirely "
        "rather than guessing or approximating.\n"
        "6. Only cite content you can directly see in the document text below.\n\n"
        "Answer the user's question accurately and completely. When you cite, place the citation "
        "marker immediately after the sentence that references that content.\n\n"
        f"Here are the user's documents:\n\n{docs_context}"
    )

    messages = []
    for h in history[-20:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role == "assistant":
            # Strip citation markers from history to avoid model confusing old IDs
            content = re.sub(r'\[DOC:\d+:\d+:"[^"]*?"\]', '[cited]', content)
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
