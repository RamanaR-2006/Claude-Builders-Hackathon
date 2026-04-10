# Lattice

A document workspace where you upload PDFs, audio, and video, then organise and connect them on an interactive canvas.

## Quick Start

### Backend (Flask)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

The API runs on `http://localhost:5001`.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` (proxies `/api` requests to the backend).

## Features

- **User authentication** — email/password registration and login
- **Document upload** — PDF, audio (MP3/WAV/OGG), video (MP4/WebM/MOV)
- **Interactive canvas** — drag documents to arrange them, lock in place
- **Connections** — link any two documents with a line, add a description
- **Per-user isolation** — every user has their own private document space
