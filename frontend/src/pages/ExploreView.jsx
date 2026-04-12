import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, User, FileText, Film, Music, X, Download } from 'lucide-react';
import api from '../api/axios';
import ConnectionLine from '../components/ConnectionLine';

const NODE_W = 160;
const NODE_H = 130;

const TYPE_ICONS = { pdf: FileText, video: Film, audio: Music };
const TYPE_COLORS = { pdf: 'text-magma-400', video: 'text-lava-400', audio: 'text-ember-400' };

function pairKey(a, b) {
  return [Math.min(a, b), Math.max(a, b)].join(':');
}

function ReadOnlyNode({ doc, canvasId, onClick }) {
  const Icon = TYPE_ICONS[doc.file_type] || FileText;
  const iconColor = TYPE_COLORS[doc.file_type] || 'text-gray-400';
  const thumbUrl = doc.has_thumbnail ? `${api.defaults.baseURL}/explore/${canvasId}/thumbnail/${doc.id}` : null;

  return (
    <div
      onClick={() => onClick(doc)}
      className="absolute rounded-xl border border-surface-500 bg-surface-800 shadow-lg shadow-black/30 flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer hover:border-lava-500/50 hover:shadow-lava-500/10 transition-all group"
      style={{
        left: doc.position_x,
        top: doc.position_y,
        width: NODE_W,
        height: NODE_H,
      }}
    >
      <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-t-xl bg-surface-700 relative">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={doc.original_name}
            className="w-full h-full object-cover"
            crossOrigin="use-credentials"
          />
        ) : (
          <Icon size={32} className={iconColor} />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-0.5 rounded">
            View
          </span>
        </div>
      </div>
      <div className="w-full px-2 py-1.5 bg-surface-800 border-t border-surface-600">
        <p className="text-[10px] text-gray-400 truncate text-center" title={doc.original_name}>
          {doc.original_name}
        </p>
      </div>
    </div>
  );
}

function PublicDocViewer({ doc, canvasId, onClose }) {
  const fileUrl = `/api/explore/${canvasId}/file/${doc.id}`;
  const [transcription, setTranscription] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState('na');

  useEffect(() => {
    if (doc.file_type === 'audio' || doc.file_type === 'video') {
      api.get(`/explore/${canvasId}/transcription/${doc.id}`)
        .then(res => {
          setTranscription(res.data.transcription);
          setTranscriptionStatus(res.data.status);
        })
        .catch(() => {});
    }
  }, [doc.id, doc.file_type, canvasId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-surface-800 rounded-2xl shadow-2xl shadow-black/50 border border-surface-600 w-full mx-4 flex flex-col overflow-hidden ${doc.file_type === 'audio' ? 'max-w-2xl h-[75vh]' : 'max-w-3xl max-h-[85vh]'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-600 shrink-0">
          <h2 className="text-sm font-semibold text-white truncate mr-4">{doc.original_name}</h2>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={doc.original_name}
              className="p-1.5 rounded-lg text-gray-400 hover:text-lava-400 hover:bg-surface-600 transition cursor-pointer"
              title="Download"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-600 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {doc.file_type === 'pdf' && (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[70vh]"
              title={doc.original_name}
            />
          )}

          {doc.file_type === 'video' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center p-6 bg-black">
                <video src={fileUrl} controls autoPlay className="max-w-full max-h-[60vh] rounded">
                  Your browser does not support the video element.
                </video>
              </div>
              {transcriptionStatus === 'done' && transcription && (
                <div className="flex-1 overflow-y-auto px-8 py-5 min-h-0 border-t border-surface-600">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-3">Transcript</p>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{transcription}</p>
                </div>
              )}
            </div>
          )}

          {doc.file_type === 'audio' && (
            <div className="flex flex-col h-full">
              <div className="flex flex-col items-center gap-4 px-8 py-6 border-b border-surface-600 shrink-0">
                <div className="w-16 h-16 rounded-full bg-ember-500/10 flex items-center justify-center">
                  <Music size={28} className="text-ember-400" />
                </div>
                <audio src={fileUrl} controls autoPlay className="w-full max-w-md">
                  Your browser does not support the audio element.
                </audio>
              </div>
              <div className="flex-1 overflow-y-auto px-8 py-5 min-h-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-3">Transcript</p>
                {transcriptionStatus === 'pending' && (
                  <p className="text-sm text-ember-400">Transcribing…</p>
                )}
                {transcriptionStatus === 'failed' && (
                  <p className="text-sm text-magma-400">Transcription failed.</p>
                )}
                {transcriptionStatus === 'na' && (
                  <p className="text-sm text-gray-500">No transcription available.</p>
                )}
                {transcriptionStatus === 'done' && transcription && (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{transcription}</p>
                )}
              </div>
            </div>
          )}

          {!['pdf', 'video', 'audio'].includes(doc.file_type) && (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <FileText size={48} className="text-gray-500" />
              <p className="text-sm text-gray-400">Preview not available for this file type.</p>
              <a href={fileUrl} download={doc.original_name} className="text-sm text-lava-400 hover:text-lava-400/80 font-medium">
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyConnectionModal({ conn, onClose }) {
  if (!conn) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-lava-400 mb-2">Connection</h3>
        {conn.strength != null && (
          <p className="text-xs text-gray-500 mb-2">Strength: {Number(conn.strength).toFixed(1)}/10</p>
        )}
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{conn.description || 'No description'}</p>
        <button onClick={onClose} className="mt-4 px-4 py-1.5 text-sm rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition cursor-pointer">
          Close
        </button>
      </div>
    </div>
  );
}

export default function ExploreView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [canvas, setCanvas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedConn, setSelectedConn] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    api.get(`/explore/${id}`)
      .then(res => setCanvas(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const docs = canvas?.snapshot?.documents || [];
  const connections = canvas?.snapshot?.connections || [];

  const pairCounts = useMemo(() => {
    const map = {};
    connections.forEach(c => {
      const key = pairKey(c.source_doc_id, c.target_doc_id);
      if (!map[key]) map[key] = { count: 0, indices: {} };
      map[key].indices[c.id] = map[key].count;
      map[key].count++;
    });
    return map;
  }, [connections]);

  const { canvasWidth, canvasHeight } = useMemo(() => {
    if (docs.length === 0) return { canvasWidth: 800, canvasHeight: 600 };
    let maxX = 0, maxY = 0;
    docs.forEach(d => {
      maxX = Math.max(maxX, d.position_x + NODE_W + 40);
      maxY = Math.max(maxY, d.position_y + NODE_H + 40);
    });
    return { canvasWidth: Math.max(maxX, 800), canvasHeight: Math.max(maxY, 600) };
  }, [docs]);

  const handleDocClick = useCallback((doc) => {
    setViewingDoc(doc);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-lava-400" />
      </div>
    );
  }

  if (!canvas) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center text-gray-500">
        Canvas not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white flex flex-col">
      <header className="h-14 bg-surface-800 border-b border-surface-600 flex items-center justify-between px-5 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/explore')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-600 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">{canvas.title}</h1>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <User size={10} />
              <span>{canvas.author_email}</span>
              {canvas.created_at && (
                <span>· {new Date(canvas.created_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {canvas.description && (
        <div className="px-5 py-2 bg-surface-800/60 border-b border-surface-600/50">
          <p className="text-xs text-gray-500 max-w-2xl">{canvas.description}</p>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-surface-900">
        <div className="relative" style={{ width: canvasWidth, height: canvasHeight, minWidth: '100%', minHeight: 'calc(100vh - 56px)' }}>
          <svg className="absolute inset-0" width={canvasWidth} height={canvasHeight} style={{ pointerEvents: 'none' }}>
            <g style={{ pointerEvents: 'auto' }}>
              {connections.map((conn, idx) => {
                const key = pairKey(conn.source_doc_id, conn.target_doc_id);
                const pair = pairCounts[key] || { count: 1, indices: {} };
                return (
                  <ConnectionLine
                    key={conn.id}
                    conn={conn}
                    docs={docs}
                    onClick={setSelectedConn}
                    animateIn={false}
                    colorIndex={idx}
                    pairIndex={pair.indices[conn.id] || 0}
                    pairTotal={pair.count}
                  />
                );
              })}
            </g>
          </svg>
          {docs.map(doc => (
            <ReadOnlyNode key={doc.id} doc={doc} canvasId={id} onClick={handleDocClick} />
          ))}
        </div>
      </div>

      {selectedConn && (
        <ReadOnlyConnectionModal conn={selectedConn} onClose={() => setSelectedConn(null)} />
      )}

      {viewingDoc && (
        <PublicDocViewer doc={viewingDoc} canvasId={id} onClose={() => setViewingDoc(null)} />
      )}
    </div>
  );
}
