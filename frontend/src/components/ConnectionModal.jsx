import { useState, useEffect, useRef } from 'react';
import { X, Trash2 } from 'lucide-react';

export default function ConnectionModal({ conn, docs, position, onSave, onDelete, onClose }) {
  const [desc, setDesc] = useState(conn.description || '');
  const textRef = useRef(null);

  useEffect(() => {
    setDesc(conn.description || '');
    setTimeout(() => textRef.current?.focus(), 50);
  }, [conn]);

  const srcName = docs.find(d => d.id === conn.source_doc_id)?.original_name || '?';
  const tgtName = docs.find(d => d.id === conn.target_doc_id)?.original_name || '?';

  const handleSave = () => {
    onSave(conn.id, desc);
    onClose();
  };

  return (
    <div
      className="absolute z-[60] w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4"
      style={{ left: position.x - 144, top: position.y + 12 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Connection</h3>
        <button onClick={onClose} className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer">
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-2 truncate">
        <span className="font-medium text-gray-600">{srcName}</span>
        {' → '}
        <span className="font-medium text-gray-600">{tgtName}</span>
      </p>

      <textarea
        ref={textRef}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Describe this connection…"
        className="w-full h-24 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none transition"
      />

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => { onDelete(conn.id); onClose(); }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition cursor-pointer"
        >
          <Trash2 size={13} /> Remove
        </button>
        <button
          onClick={handleSave}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  );
}
