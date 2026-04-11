import { useRef, useState, useCallback } from 'react';
import { FileText, Film, Music, Lock, Unlock, Trash2, Eye, Check, Anchor } from 'lucide-react';

const TYPE_ICONS = {
  pdf: FileText,
  video: Film,
  audio: Music,
};

const TYPE_COLORS = {
  pdf: 'text-magma-400',
  video: 'text-lava-400',
  audio: 'text-ember-400',
};

export default function DocumentNode({
  doc,
  selected,
  connectMode,
  selectMode,
  isSelected,
  isAnchor,
  animating,
  onPositionChange,
  onToggleLock,
  onDelete,
  onClick,
  onView,
  onToggleSelect,
  onToggleAnchor,
}) {
  const nodeRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  const handlePointerDown = useCallback((e) => {
    if (doc.is_locked || connectMode || selectMode) return;
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
  }, [doc.is_locked, doc.position_x, doc.position_y, connectMode, selectMode]);

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
    if (selectMode) {
      e.stopPropagation();
      onToggleSelect(doc.id);
      return;
    }
    if (connectMode) {
      e.stopPropagation();
      onClick(doc.id);
    }
  };

  const Icon = TYPE_ICONS[doc.file_type] || FileText;
  const iconColor = TYPE_COLORS[doc.file_type] || 'text-gray-400';
  const thumbnailUrl = doc.has_thumbnail ? `/api/documents/${doc.id}/thumbnail` : null;

  const getCursor = () => {
    if (selectMode) return 'pointer';
    if (connectMode) return 'crosshair';
    if (doc.is_locked) return 'default';
    return 'grab';
  };

  const getSelectionStyle = () => {
    if (isAnchor) return 'bg-surface-700 border-ember-400 shadow-lg shadow-ember-400/20 ring-2 ring-ember-400/30';
    if (isSelected) return 'bg-surface-700 border-lava-500 shadow-lg shadow-lava-500/20 ring-2 ring-lava-500/30 animate-pulse-lava';
    return '';
  };

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
        cursor: getCursor(),
        touchAction: 'none',
        transition: animating ? 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
      }}
    >
      <div
        className={`rounded-xl border transition-all overflow-hidden ${
          (isSelected || isAnchor)
            ? getSelectionStyle()
            : selected
              ? 'bg-surface-700 border-molten-400 shadow-lg shadow-molten-400/20 ring-2 ring-molten-400/30'
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

        {/* Selection checkbox + anchor toggle */}
        {selectMode && (
          <>
            <div className="absolute top-1.5 left-1.5">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                isAnchor
                  ? 'bg-ember-500 border-ember-400'
                  : isSelected
                    ? 'bg-lava-600 border-lava-500'
                    : 'bg-surface-800/80 border-surface-500'
              }`}>
                {isAnchor ? <Anchor size={11} className="text-white" /> : isSelected ? <Check size={12} className="text-white" /> : null}
              </div>
            </div>

            {/* Anchor toggle button -- only visible when selected */}
            {isSelected && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleAnchor(doc.id); }}
                className={`absolute top-1.5 right-1.5 p-1 rounded-md border cursor-pointer transition ${
                  isAnchor
                    ? 'bg-ember-500/20 border-ember-400/50 text-ember-400'
                    : 'bg-surface-800/80 border-surface-500 text-gray-500 hover:text-ember-400'
                }`}
                title={isAnchor ? 'Remove anchor' : 'Set as anchor'}
              >
                <Anchor size={12} />
              </button>
            )}
          </>
        )}

        {/* Actions -- visible on hover, hidden in select mode */}
        {!selectMode && (
          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onView(doc); }}
              className="p-1 rounded-md bg-surface-800/90 backdrop-blur border border-surface-500 text-gray-400 hover:text-lava-400 cursor-pointer"
              title="View"
            >
              <Eye size={13} />
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onToggleLock(doc.id); }}
              className="p-1 rounded-md bg-surface-800/90 backdrop-blur border border-surface-500 text-gray-400 hover:text-molten-400 cursor-pointer"
              title={doc.is_locked ? 'Unlock' : 'Lock'}
            >
              {doc.is_locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
              className="p-1 rounded-md bg-surface-800/90 backdrop-blur border border-surface-500 text-gray-400 hover:text-magma-400 cursor-pointer"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* Lock indicator */}
        {doc.is_locked && !selectMode && (
          <div className="absolute top-1.5 left-1.5">
            <Lock size={11} className="text-molten-400" />
          </div>
        )}
      </div>
    </div>
  );
}
