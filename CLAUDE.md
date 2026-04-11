# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lattice** is a multi-document canvas workspace where users upload PDFs/audio/video, organize them on an interactive canvas, draw connections between documents, and use Claude AI for auto-linking and chat-based Q&A over document content.

## Running the App

**Backend** (Flask, port 5001):
```bash
cd backend
source venv/bin/activate
python run.py
```

**Frontend** (Vite, port 5173):
```bash
cd frontend
npm run dev       # Dev server with HMR (proxies /api to port 5001)
npm run build     # Production build
npm run lint      # ESLint
```

No test suite exists in this project.

## Architecture

### Backend (`backend/app/`)

Flask app with blueprints — each file is a blueprint:
- `auth.py` — login/register/logout (Flask-Login sessions, werkzeug hashing)
- `documents.py` — file upload, serve, search, highlight management (PyMuPDF/pdf2image)
- `canvas.py` — document position and connection CRUD
- `autolink.py` — Claude AI auto-linking: extracts document text, sends to Claude for relationship analysis, returns scored connections, applies circular cluster layout
- `chat.py` — Claude-powered Q&A: sends document content as context (up to 50K chars), returns answers with inline citations in `[DOC:id:page:"quote"]` format
- `models.py` — SQLAlchemy ORM: `User`, `Document`, `Connection`, `Highlight`
- `config.py` — SQLite at `lattice.db`, 300MB upload limit, upload/thumbnail folder paths

**Key constraint**: Every DB query must be scoped to `current_user.id` for per-user isolation.

### Frontend (`frontend/src/`)

React 19 + Vite SPA:
- `components/Canvas.jsx` — the main workspace; document nodes are absolutely positioned, dragged via native pointer events (no DnD library), connections rendered as SVG `<line>` overlay
- `components/DocumentNode.jsx` — individual draggable document card
- `components/AutoLinkPanel.jsx` — UI for Claude auto-linking with anchor docs and custom prompts
- `components/ChatSidebar.jsx` — Q&A chat with citation rendering
- `pages/` — Login, Register, Home
- `contexts/AuthContext.jsx` — auth state; consume via `useAuth()` hook
- `api/axios.js` — shared Axios instance (all API calls must go through this)

**Styling**: Tailwind CSS v4 only — no custom CSS unless truly unavoidable. Icons via `lucide-react`.

### AI Integration

Both `autolink.py` and `chat.py` call the Anthropic Claude API (`claude-sonnet-4-20250514`). Auto-linking extracts up to 2000 chars per document, sends summaries as a batch, and returns connections with strength scores (1–10). Chat sends up to 6000 chars per document (max 20 docs).

### Database Schema

| Model | Key Fields |
|-------|-----------|
| `User` | id, email, password_hash |
| `Document` | id, user_id, filename, original_name, file_type, thumbnail_path, position_x/y, is_locked |
| `Connection` | id, user_id, source_doc_id, target_doc_id, description, strength (float 1–10) |
| `Highlight` | id, user_id, doc_id, term, color (hex) |

All models cascade-delete on user deletion. Files live in `backend/uploads/`, thumbnails in `backend/thumbnails/` (both git-ignored).
