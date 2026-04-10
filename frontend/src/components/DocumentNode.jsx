import { useRef, useState, useCallback } from 'react';
import { FileText, Film, Music, Lock, Unlock, Trash2, Eye } from 'lucide-react';

const TYPE_ICONS = {
  pdf: FileText,
  video: Film,
  audio: Music,
};

const TYPE_COLORS = {
  pdf: 'text-ruby-400',
  video: 'text-gem-400',
  audio: 'text-emerald-400',
};

export default function DocumentNode({
  doc,
  selected,
  connectMode,
  onPositionChange,
  onToggleLock,
  onDelete,
  onClick,
  onView,
}) {
  const nodeRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  const handlePointerDown = useCallback((e) => {
    if (doc.is_locked || connectMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      origX: doc.position_x,
      origY: doc.position_y,
    };
    nodeRef.current?.setPointerCapture(e.pointerId);
  }, [doc.is_locked, doc.position_x, doc.position_y, connectMode]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newX = Math.max(0, dragStart.current.origX + dx);
    const newY = Math.max(0, dragStart.current.origY + dy);
    onPositionChange(doc.id, newX, newY, false);
  }, [dragging, doc.id, onPositionChange]);

  const handlePointerUp = useCallback((e) => {
    if (!dragging) return;
    setDragging(false);
    nodeRef.current?.releasePointerCapture(e.pointerId);
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newX = Math.max(0, dragStart.current.origX + dx);
    const newY = Math.max(0, dragStart.current.origY + dy);
    onPositionChange(doc.id, newX, newY, true);
  }, [dragging, doc.id, onPositionChange]);

  const handleClick = (e) => {
    if (connectMode) {
      e.stopPropagation();
      onClick(doc.id);
    }
  };

  const Icon = TYPE_ICONS[doc.file_type] || FileText;
  const iconColor = TYPE_COLORS[doc.file_type] || 'text-gray-400';
  const thumbnailUrl = doc.has_thumbnail ? `/api/documents/${doc.id}/thumbnail` : null;

  return (
    <div
      ref={nodeRef}
      data-doc-id={doc.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className={`absolute select-none group ${dragging ? 'z-50' : 'z-10'}`}
      style={{
        left: doc.position_x,
        top: doc.position_y,
        width: 160,
        cursor: connectMode ? 'crosshair' : doc.is_locked ? 'default' : 'grab',
        touchAction: 'none',
      }}
    >
      <div
        className={`rounded-xl border transition-all overflow-hidden ${
          selected
            ? 'bg-surface-700 border-cyan-500 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/30'
            : 'bg-surface-800 border-surface-600 shadow-md shadow-black/30 hover:border-surface-500 hover:shadow-lg hover:shadow-black/40'
        }`}
      >
        {/* Thumbnail area */}
        <div className="h-24 bg-surface-700 flex items-center justify-center overflow-hidden">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon size={36} className={iconColor} />
          )}
        </div>

        {/* Label */}
        <div className="px-3 py-2 border-t border-surface-600">
          <p className="text-xs font-medium text-gray-300 truncate" title={doc.original_name}>
            {doc.original_name}
          </p>
        </div>

        {/* Actions – visible on hover. onPointerDown stops drag from starting on buttons */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onView(doc); }}
            className="p-1 rounded-md bg-surface-800/90 backdrop-blur border border-surface-500 text-gray-400 hover:text-gem-400 cursor-pointer"
            title="View"
          >
            <Eye size={13} />
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleLock(doc.id); }}
            className="p-1 rounded-md bg-surface-800/90 backdrop-blur border border-surface-500 text-gray-400 hover:text-cyan-400 cursor-pointer"
            title={doc.is_locked ? 'Unlock' : 'Lock'}
          >
            {doc.is_locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
            className="p-1 rounded-md bg-surface-800/90 backdrop-blur border border-surface-500 text-gray-400 hover:text-ruby-400 cursor-pointer"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Lock indicator */}
        {doc.is_locked && (
          <div className="absolute top-1.5 left-1.5">
            <Lock size={11} className="text-cyan-400" />
          </div>
        )}
      </div>
    </div>
  );
}
