import { useState, useEffect, useCallback } from 'react';
import { X, Download, FileText, Music, Plus, Pin } from 'lucide-react';
import api from '../api/axios';

const COLOR_PRESETS = [
  '#fb923c', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316',
];

function HighlightPill({ hl, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium border border-surface-500 bg-surface-700">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hl.color }} />
      <span className="text-gray-200 max-w-[100px] truncate">{hl.term}</span>
      <button onClick={() => onRemove(hl.id)} className="p-0.5 text-gray-500 hover:text-magma-400 cursor-pointer">
        <X size={10} />
      </button>
    </span>
  );
}

function SearchHighlightPill({ term, onPersist, onDismiss }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium border border-lava-500/30 bg-lava-500/10">
      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-lava-500" />
      <span className="text-lava-400 max-w-[100px] truncate">{term}</span>
      <button onClick={onPersist} className="p-0.5 text-lava-400 hover:text-lava-400/80 cursor-pointer" title="Save this highlight">
        <Pin size={10} />
      </button>
      <button onClick={onDismiss} className="p-0.5 text-gray-500 hover:text-magma-400 cursor-pointer" title="Remove">
        <X size={10} />
      </button>
    </span>
  );
}

export default function DocumentViewer({ doc, searchQuery, searchPage, onClose }) {
  const fileUrl = `/api/documents/${doc.id}/file`;
  const [highlights, setHighlights] = useState([]);
  const [newTerm, setNewTerm] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [showSearch, setShowSearch] = useState(!!searchQuery);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (doc.file_type === 'pdf') {
      api.get(`/documents/${doc.id}/highlights`).then(res => setHighlights(res.data)).catch(() => {});
    }
  }, [doc.id, doc.file_type]);

  // Re-show search highlight whenever a new searchQuery arrives (e.g. from a new citation click)
  useEffect(() => {
    if (searchQuery) {
      setShowSearch(true);
    }
  }, [searchQuery]);

  const buildPdfSrc = useCallback(() => {
    const pairs = highlights.map(h => `${encodeURIComponent(h.term)}:${h.color.replace('#', '')}`);
    if (showSearch && searchQuery) {
      pairs.push(`${encodeURIComponent(searchQuery)}:fb923c`);
    }
    let src = fileUrl;
    if (pairs.length) {
      src += `?highlights=${pairs.join(',')}`;
    }
    if (searchPage && showSearch) {
      src += (pairs.length ? '' : '?') + `#page=${searchPage}`;
    }
    return src;
  }, [highlights, showSearch, searchQuery, searchPage, fileUrl]);

  const handleAddHighlight = async () => {
    const term = newTerm.trim();
    if (!term) return;
    try {
      const res = await api.post(`/documents/${doc.id}/highlights`, { term, color: newColor });
      setHighlights(prev => [...prev, res.data]);
      setNewTerm('');
      setIframeKey(k => k + 1);
    } catch { /* ignore */ }
  };

  const handleRemoveHighlight = async (hlId) => {
    try {
      await api.delete(`/documents/${doc.id}/highlights/${hlId}`);
      setHighlights(prev => prev.filter(h => h.id !== hlId));
      setIframeKey(k => k + 1);
    } catch { /* ignore */ }
  };

  const handlePersistSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await api.post(`/documents/${doc.id}/highlights`, { term: searchQuery, color: '#fb923c' });
      setHighlights(prev => [...prev, res.data]);
      setShowSearch(false);
      setIframeKey(k => k + 1);
    } catch { /* ignore */ }
  };

  const handleDismissSearch = () => {
    setShowSearch(false);
    setIframeKey(k => k + 1);
  };

  const pdfSrc = buildPdfSrc();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-800 rounded-2xl shadow-2xl shadow-black/50 border border-surface-600 w-full max-w-3xl max-h-[85vh] mx-4 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Highlight bar (PDF only) */}
        {doc.file_type === 'pdf' && (
          <div className="px-5 py-2 border-b border-surface-600 flex items-center gap-2 flex-wrap shrink-0">
            {highlights.map(hl => (
              <HighlightPill key={hl.id} hl={hl} onRemove={handleRemoveHighlight} />
            ))}

            {showSearch && searchQuery && (
              <SearchHighlightPill
                term={searchQuery}
                onPersist={handlePersistSearch}
                onDismiss={handleDismissSearch}
              />
            )}

            {/* Add highlight form */}
            <div className="inline-flex items-center gap-1.5 ml-1">
              <input
                type="text"
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddHighlight(); }}
                placeholder="Add term…"
                className="w-24 px-2 py-0.5 text-[11px] rounded-md bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 transition"
              />
              <div className="flex gap-0.5">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-4 h-4 rounded-full cursor-pointer transition-transform"
                    style={{
                      background: c,
                      outline: newColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)',
                      outlineOffset: '1px',
                      transform: newColor === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleAddHighlight}
                disabled={!newTerm.trim()}
                className="p-1 rounded-md bg-lava-600 hover:bg-lava-500 text-white disabled:opacity-30 cursor-pointer transition"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0">
          {doc.file_type === 'pdf' && (
            <iframe
              key={iframeKey}
              src={pdfSrc}
              className="w-full h-full min-h-[70vh]"
              title={doc.original_name}
            />
          )}

          {doc.file_type === 'video' && (
            <div className="flex items-center justify-center p-6 bg-black">
              <video src={fileUrl} controls autoPlay className="max-w-full max-h-[70vh] rounded">
                Your browser does not support the video element.
              </video>
            </div>
          )}

          {doc.file_type === 'audio' && (
            <div className="flex flex-col items-center justify-center p-12 gap-6">
              <div className="w-24 h-24 rounded-full bg-ember-500/10 flex items-center justify-center">
                <Music size={40} className="text-ember-400" />
              </div>
              <p className="text-sm text-gray-400">{doc.original_name}</p>
              <audio src={fileUrl} controls autoPlay className="w-full max-w-md">
                Your browser does not support the audio element.
              </audio>
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
