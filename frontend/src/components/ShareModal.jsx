import { useEffect, useState } from 'react';
import { X, Share2, Trash2, FileText, Film, Music, Loader2 } from 'lucide-react';
import api from '../api/axios';

const TYPE_ICONS = { pdf: FileText, video: Film, audio: Music };

export default function ShareModal({ docs, connections, onClose, onToast }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set(docs.map(d => d.id)));
  const [publishing, setPublishing] = useState(false);
  const [myCanvases, setMyCanvases] = useState([]);
  const [loadingCanvases, setLoadingCanvases] = useState(true);

  useEffect(() => {
    api.get('/share').then(res => setMyCanvases(res.data)).catch(() => {}).finally(() => setLoadingCanvases(false));
  }, []);

  const toggleDoc = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(docs.map(d => d.id)));
  const selectNone = () => setSelectedIds(new Set());

  const connCount = connections.filter(c =>
    selectedIds.has(c.source_doc_id) && selectedIds.has(c.target_doc_id)
  ).length;

  const handlePublish = async () => {
    if (!title.trim()) {
      onToast?.('Title is required', 'error');
      return;
    }
    if (selectedIds.size === 0) {
      onToast?.('Select at least one document', 'error');
      return;
    }
    setPublishing(true);
    try {
      const res = await api.post('/share', {
        title: title.trim(),
        description: description.trim(),
        doc_ids: Array.from(selectedIds),
      });
      setMyCanvases(prev => [{ ...res.data, doc_count: selectedIds.size, conn_count: connCount }, ...prev]);
      setTitle('');
      setDescription('');
      onToast?.('Canvas published!', 'success');
    } catch (err) {
      onToast?.(err.response?.data?.error || 'Failed to publish', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (canvasId) => {
    try {
      await api.delete(`/share/${canvasId}`);
      setMyCanvases(prev => prev.filter(c => c.id !== canvasId));
      onToast?.('Canvas deleted', 'success');
    } catch {
      onToast?.('Failed to delete', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600 shrink-0">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-lava-400" />
            <h2 className="text-base font-semibold text-white">Share Canvas</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Title & Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My research canvas"
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 resize-none"
            />
          </div>

          {/* Document selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-400">Documents to include</label>
              <div className="flex gap-2 text-[10px]">
                <button onClick={selectAll} className="text-lava-400 hover:text-lava-300 cursor-pointer">All</button>
                <button onClick={selectNone} className="text-gray-500 hover:text-gray-300 cursor-pointer">None</button>
              </div>
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-surface-600 bg-surface-700/50">
              {docs.map(doc => {
                const Icon = TYPE_ICONS[doc.file_type] || FileText;
                return (
                  <label key={doc.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-600/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="accent-lava-500 w-3.5 h-3.5"
                    />
                    <Icon size={14} className="text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-300 truncate">{doc.original_name}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">
              {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''}, {connCount} connection{connCount !== 1 ? 's' : ''} will be shared
            </p>
          </div>

          {/* Publish */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full py-2.5 rounded-lg bg-lava-600 hover:bg-lava-500 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
            Publish Snapshot
          </button>

          {/* Existing canvases */}
          {(myCanvases.length > 0 || loadingCanvases) && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Your shared canvases</h3>
              {loadingCanvases ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-gray-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {myCanvases.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2.5 bg-surface-700/50 border border-surface-600 rounded-lg">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-sm font-medium text-gray-200 truncate">{c.title}</p>
                        <p className="text-[10px] text-gray-500">
                          {c.doc_count} doc{c.doc_count !== 1 ? 's' : ''} · {c.conn_count} conn{c.conn_count !== 1 ? 's' : ''}
                          {c.created_at && ` · ${new Date(c.created_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 cursor-pointer transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
