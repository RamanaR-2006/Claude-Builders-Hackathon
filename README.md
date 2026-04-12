# Lattice

A collaborative document workspace where you upload PDFs, audio, and video, then organise, connect, and explore them on an interactive canvas. Powered by AI for automatic connection discovery and a context-aware chat assistant.

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) An [Anthropic API key](https://console.anthropic.com/) for Auto-Link and Chat features
- (Optional) An [OpenAI API key](https://platform.openai.com/) for audio/video transcription

### Backend (Flask)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

Start the server:

```bash
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

### Core

- **User authentication** -- email/password registration and login with password strength validation
- **Document upload** -- PDF, audio (MP3/WAV/OGG), video (MP4/WebM/MOV) with multi-file upload and 300 MB cap per upload
- **Interactive canvas** -- drag documents to arrange them, lock in place, pan to navigate
- **Document viewer** -- view PDFs inline with highlighting, play audio/video with transcription panel
- **Connections** -- link any two documents with a line and description; multiple connections per pair supported with distinct visual styles

### AI-Powered

- **Auto-Link** -- select documents and let Claude analyse their content to discover and create meaningful connections with strength scores (1-10); supports anchor documents, guided prompts, and connection rules
- **Chat assistant** -- a slide-out sidebar where you can ask questions about your documents; the AI cites specific passages that you can click to jump to the source
- **Audio/video transcription** -- automatic transcription via OpenAI Whisper, searchable alongside PDF content

### Search and Highlights

- **Full-text search** -- search across PDFs and audio/video transcripts with highlighted snippets
- **Custom highlights** -- add persistent colour-coded highlight terms per document
- **Search-to-highlight** -- pin search terms as permanent highlights in the document viewer

### Organisation

- **Organise button** -- one-click layout that arranges linked clusters in clean circular patterns with no overlap
- **Document sidebar** -- quick-access list of all uploaded documents with click-to-navigate
- **Connection visuals** -- colour-coded lines by strength, staggered diamonds, dash patterns for parallel connections

### Sharing

- **Share snapshots** -- publish a selection of documents and their connections as a read-only snapshot
- **Explore gallery** -- browse other users' shared canvases and view their documents

### Profile

- **Profile dropdown** -- avatar menu with email display, feedback survey, and sign out
- **Feedback survey** -- star rating and text responses sent directly to the development team

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS v4, React Router, Axios, Lucide icons |
| Backend | Flask, Flask-SQLAlchemy, Flask-Login, Flask-CORS |
| Database | SQLite |
| AI | Anthropic Claude (connections, chat), OpenAI Whisper (transcription) |
| PDF | PyMuPDF (text extraction, highlighting), pdf2image (thumbnails) |
| Media | FFmpeg (audio extraction, video thumbnails), Pillow (image processing) |

## Project Structure

```
backend/
  app/
    __init__.py      # App factory, blueprint registration, migrations
    auth.py          # Registration, login, session management
    autolink.py      # AI-powered connection discovery and canvas layout
    canvas.py        # Manual connections and position updates
    chat.py          # AI chat with document context and citations
    config.py        # Flask configuration
    documents.py     # Upload, serve, search, highlights
    models.py        # SQLAlchemy models (User, Document, Connection, Highlight, SharedCanvas)
    share.py         # Snapshot sharing and public explore endpoints
  run.py             # Entry point
  requirements.txt

frontend/
  src/
    components/
      AutoLinkPanel.jsx    # Auto-link configuration panel
      Canvas.jsx           # Main interactive canvas with pan and zoom
      ChatSidebar.jsx      # AI chat slide-out panel
      ConnectionLine.jsx   # SVG connection rendering with diamonds
      ConnectionModal.jsx  # Connection description viewer/editor
      DocSidebar.jsx       # Document list sidebar
      DocumentNode.jsx     # Draggable document thumbnail
      DocumentViewer.jsx   # Full document viewer (PDF, audio, video)
      FeedbackModal.jsx    # User feedback survey form
      Navbar.jsx           # Top navigation with profile dropdown
      SearchResults.jsx    # Search results dropdown
      ShareModal.jsx       # Snapshot publishing modal
      Toast.jsx            # Notification toasts
      UploadModal.jsx      # Multi-file upload modal
    pages/
      Explore.jsx          # Public canvas gallery
      ExploreView.jsx      # Read-only shared canvas viewer
      Home.jsx             # Main workspace orchestrator
      Login.jsx            # Login page
      Register.jsx         # Registration page
    contexts/
      AuthContext.jsx       # Authentication state provider
    api/
      axios.js             # Axios instance with base URL
    App.jsx                # Route definitions
    index.css              # Tailwind theme (volcano palette)
    main.jsx               # React entry point
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/documents` | List documents |
| POST | `/api/documents/upload` | Upload files |
| GET | `/api/documents/:id/file` | Serve document |
| GET | `/api/documents/:id/thumbnail` | Serve thumbnail |
| GET | `/api/documents/search?q=` | Full-text search |
| GET | `/api/documents/:id/transcription` | Get transcription |
| GET/POST/DELETE | `/api/documents/:id/highlights` | Manage highlights |
| GET | `/api/connections` | List connections |
| POST | `/api/connections` | Create connection |
| PUT | `/api/connections/:id` | Update description |
| DELETE | `/api/connections/:id` | Delete connection |
| PUT | `/api/documents/:id/position` | Update position |
| PUT | `/api/documents/:id/lock` | Toggle lock |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/autolink` | AI auto-link analysis |
| POST | `/api/organize` | Auto-arrange canvas |
| POST | `/api/chat` | AI chat message |
| POST | `/api/share` | Publish snapshot |
| GET | `/api/share` | List own snapshots |
| DELETE | `/api/share/:id` | Delete snapshot |
| GET | `/api/explore` | Public gallery |
| GET | `/api/explore/:id` | View shared canvas |
| GET | `/api/explore/:id/file/:docId` | Serve shared document |
| GET | `/api/explore/:id/thumbnail/:docId` | Serve shared thumbnail |
