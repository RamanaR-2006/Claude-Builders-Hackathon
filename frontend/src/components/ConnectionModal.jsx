import { useState, useEffect, useRef } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ConnectionModal({ conn, docs, position, onSave, onDelete, onClose, pairConns = [], onNavConn }) {
  const [desc, setDesc] = useState(conn.description || '');
  const textRef = useRef(null);

  useEffect(() => {
    setDesc(conn.description || '');
    setTimeout(() => textRef.current?.focus(), 50);
  }, [conn]);

  const srcName = docs.find(d => d.id === conn.source_doc_id)?.original_name || '?';
  const tgtName = docs.find(d => d.id === conn.target_doc_id)?.original_name || '?';

  const currentIdx = pairConns.findIndex(c => c.id === conn.id);
  const total = pairConns.length;
  const hasMultiple = total > 1;

  const handleSave = () => {
    onSave(conn.id, desc);
    onClose();
  };

  const handlePrev = () => {
    if (currentIdx > 0) onNavConn(pairConns[currentIdx - 1]);
  };

  const handleNext = () => {
    if (currentIdx < total - 1) onNavConn(pairConns[currentIdx + 1]);
  };

  return (
    <div
      className="absolute z-[60] w-80 bg-surface-800 rounded-xl shadow-xl shadow-black/40 border border-surface-500 p-4"
      style={{ left: position.x - 160, top: position.y + 12 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Connection</h3>
        {hasMultiple && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <button onClick={handlePrev} disabled={currentIdx <= 0} className="p-0.5 hover:text-gray-300 disabled:opacity-30 cursor-pointer">
              <ChevronLeft size={12} />
            </button>
            <span className="text-gray-400">{currentIdx + 1}/{total}</span>
            <button onClick={handleNext} disabled={currentIdx >= total - 1} className="p-0.5 hover:text-gray-300 disabled:opacity-30 cursor-pointer">
              <ChevronRight size={12} />
            </button>
          </div>
        )}
        <button onClick={onClose} className="p-0.5 text-gray-500 hover:text-gray-300 cursor-pointer shrink-0">
          <X size={14} />
        </button>
      </div>

      <div className="mb-3 space-y-0.5">
        <p className="text-xs text-gray-300 font-medium truncate" title={srcName}>{srcName}</p>
        <p className="text-[10px] text-gray-500">↓ connected to</p>
        <p className="text-xs text-gray-300 font-medium truncate" title={tgtName}>{tgtName}</p>
      </div>

      {hasMultiple && (
        <p className="text-[10px] text-gray-500 mb-2">{total} connections between these documents</p>
      )}

      <textarea
        ref={textRef}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Describe this connection…"
        className="w-full min-h-[6rem] max-h-[16rem] text-sm leading-relaxed border border-surface-500 bg-surface-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 resize-y transition"
      />

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => { onDelete(conn.id); onClose(); }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-magma-400 transition cursor-pointer"
        >
          <Trash2 size={13} /> Remove
        </button>
        <button
          onClick={handleSave}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-lava-600 hover:bg-lava-500 text-white transition cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  );
}
