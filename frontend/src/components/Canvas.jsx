import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import api from '../api/axios';
import DocumentNode from './DocumentNode';
import ConnectionLine from './ConnectionLine';
import ConnectionModal from './ConnectionModal';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.025;

function pairKey(a, b) {
  return [Math.min(a, b), Math.max(a, b)].join(':');
}

function LatticeBackground() {
  const { nodes, edges } = useMemo(() => {
    const COLS = 11;
    const ROWS = 8;
    const ns = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const baseX = (c + 0.5) / COLS * 100;
        const baseY = (r + 0.5) / ROWS * 100;
        const jx = Math.sin(r * 7.3 + c * 13.1) * 4.5;
        const jy = Math.cos(r * 11.7 + c * 4.9) * 4.5;
        ns.push({ x: baseX + jx, y: baseY + jy });
      }
    }
    const es = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        if (c < COLS - 1) es.push([i, i + 1]);
        if (r < ROWS - 1) es.push([i, i + COLS]);
        if (c < COLS - 1 && r < ROWS - 1 && (r + c) % 2 === 0) es.push([i, i + COLS + 1]);
        if (c > 0 && r < ROWS - 1 && (r + c) % 2 === 1) es.push([i, i + COLS - 1]);
        if (c < COLS - 2 && r < ROWS - 1 && (r * c) % 7 === 0) es.push([i, i + COLS + 2]);
        if (c < COLS - 1 && r < ROWS - 2 && (r * c) % 5 === 0) es.push([i, i + COLS * 2 + 1]);
      }
    }
    return { nodes: ns, edges: es };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        {edges.map(([i, j], idx) => (
          <line
            key={idx}
            x1={`${nodes[i].x}%`} y1={`${nodes[i].y}%`}
            x2={`${nodes[j].x}%`} y2={`${nodes[j].y}%`}
            stroke="#fb923c"
            strokeWidth="0.6"
            opacity="0.08"
          />
        ))}
        {nodes.map((node, i) => (
          <circle
            key={i}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r="1.5"
            fill="#fb923c"
            opacity="0.2"
          />
        ))}
      </svg>
    </div>
  );
}

export default function Canvas({
  docs, setDocs, connections, setConnections,
  connectMode, setConnectMode, onViewDoc,
  selectMode, selectedIds, anchorIds, onToggleSelect, onToggleAnchor,
  animating, newConnIds, onToast,
}) {
  const [connectFirst, setConnectFirst] = useState(null);
  const [activeConn, setActiveConn] = useState(null);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);
  const innerRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ active: false, startX: 0, startY: 0, camX: 0, camY: 0, moved: false });

  const pairIndexMap = {};
  const pairCounts = {};
  connections.forEach(c => {
    const key = pairKey(c.source_doc_id, c.target_doc_id);
    pairCounts[key] = (pairCounts[key] || 0) + 1;
  });
  connections.forEach(c => {
    const key = pairKey(c.source_doc_id, c.target_doc_id);
    if (!pairIndexMap[key]) pairIndexMap[key] = 0;
    c._pairIndex = pairIndexMap[key]++;
    c._pairTotal = pairCounts[key];
  });

  const applyTransform = useCallback(() => {
    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px) scale(${zoomRef.current})`;
    }
  }, []);

  const handlePositionChange = useCallback((id, x, y, persist) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, position_x: x, position_y: y } : d));
    if (persist) {
      api.put(`/documents/${id}/position`, { position_x: x, position_y: y }).catch(() => {});
    }
  }, [setDocs]);

  const handleToggleLock = useCallback(async (id) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    const newLocked = !doc.is_locked;
    setDocs(prev => prev.map(d => d.id === id ? { ...d, is_locked: newLocked } : d));
    await api.put(`/documents/${id}/position`, { is_locked: newLocked }).catch(() => {});
  }, [docs, setDocs]);

  const handleDelete = useCallback(async (id) => {
    await api.delete(`/documents/${id}`).catch(() => {});
    setDocs(prev => prev.filter(d => d.id !== id));
    setConnections(prev => prev.filter(c => c.source_doc_id !== id && c.target_doc_id !== id));
  }, [setDocs, setConnections]);

  const handleNodeClick = useCallback(async (id) => {
    if (!connectMode) return;
    if (!connectFirst) {
      setConnectFirst(id);
      return;
    }
    if (connectFirst === id) {
      setConnectFirst(null);
      return;
    }

    try {
      const res = await api.post('/connections', {
        source_doc_id: connectFirst,
        target_doc_id: id,
      });
      setConnections(prev => [...prev, res.data]);
      if (res.data.warning) {
        onToast?.(res.data.warning, 'info');
      }
    } catch {
      onToast?.('Failed to create connection', 'error');
    }
    setConnectFirst(null);
    setConnectMode(false);
  }, [connectMode, connectFirst, setConnections, setConnectMode, onToast]);

  const handleLineClick = (conn) => {
    const src = docs.find(d => d.id === conn.source_doc_id);
    const tgt = docs.find(d => d.id === conn.target_doc_id);
    if (!src || !tgt) return;
    setModalPos({
      x: (src.position_x + tgt.position_x) / 2 + 80,
      y: (src.position_y + tgt.position_y) / 2 + 65,
    });
    setActiveConn(conn);
  };

  const handleSaveConn = async (connId, description) => {
    try {
      const res = await api.put(`/connections/${connId}`, { description });
      setConnections(prev => prev.map(c => c.id === connId ? res.data : c));
    } catch {
      // ignore
    }
  };

  const handleDeleteConn = async (connId) => {
    await api.delete(`/connections/${connId}`).catch(() => {});
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  const handleCanvasPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-doc-id]')) return;
    if (e.target.closest('.cursor-pointer')) return;
    panRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      camX: cameraRef.current.x,
      camY: cameraRef.current.y,
      moved: false,
    };
    setIsPanning(true);
    canvasRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handleCanvasPointerMove = useCallback((e) => {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panRef.current.moved = true;
    const newX = panRef.current.camX + dx;
    const newY = panRef.current.camY + dy;
    cameraRef.current = { x: newX, y: newY };
    applyTransform();
  }, [applyTransform]);

  const handleCanvasPointerUp = useCallback(() => {
    if (!panRef.current.active) return;
    panRef.current.active = false;
    setIsPanning(false);
    setCamera({ ...cameraRef.current });
  }, []);

  const handleWheelRef = useRef(null);
  handleWheelRef.current = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldZoom = zoomRef.current;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta));
    if (newZoom === oldZoom) return;

    const worldX = (mouseX - cameraRef.current.x) / oldZoom;
    const worldY = (mouseY - cameraRef.current.y) / oldZoom;

    const newCamX = mouseX - worldX * newZoom;
    const newCamY = mouseY - worldY * newZoom;

    zoomRef.current = newZoom;
    cameraRef.current = { x: newCamX, y: newCamY };
    applyTransform();
    setZoom(newZoom);
    setCamera({ x: newCamX, y: newCamY });
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => handleWheelRef.current(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const handleCanvasClick = () => {
    if (panRef.current.moved) {
      panRef.current.moved = false;
      return;
    }
    if (connectMode) {
      setConnectFirst(null);
      setConnectMode(false);
    }
    setActiveConn(null);
  };

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, zoomRef.current + ZOOM_STEP);
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = (cx - cameraRef.current.x) / zoomRef.current;
    const worldY = (cy - cameraRef.current.y) / zoomRef.current;
    cameraRef.current = { x: cx - worldX * newZoom, y: cy - worldY * newZoom };
    zoomRef.current = newZoom;
    applyTransform();
    setZoom(newZoom);
    setCamera({ ...cameraRef.current });
  }, [applyTransform]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, zoomRef.current - ZOOM_STEP);
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = (cx - cameraRef.current.x) / zoomRef.current;
    const worldY = (cy - cameraRef.current.y) / zoomRef.current;
    cameraRef.current = { x: cx - worldX * newZoom, y: cy - worldY * newZoom };
    zoomRef.current = newZoom;
    applyTransform();
    setZoom(newZoom);
    setCamera({ ...cameraRef.current });
  }, [applyTransform]);

  const handleFitToView = useCallback(() => {
    if (docs.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX2 = -Infinity, maxY2 = -Infinity;
    docs.forEach(d => {
      minX = Math.min(minX, d.position_x);
      minY = Math.min(minY, d.position_y);
      maxX2 = Math.max(maxX2, d.position_x + 160);
      maxY2 = Math.max(maxY2, d.position_y + 130);
    });
    const contentW = maxX2 - minX;
    const contentH = maxY2 - minY;
    const padding = 80;
    const scaleX = (rect.width - padding * 2) / contentW;
    const scaleY = (rect.height - padding * 2) / contentH;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(scaleX, scaleY)));
    const centerX = (minX + maxX2) / 2;
    const centerY = (minY + maxY2) / 2;
    const newCamX = rect.width / 2 - centerX * newZoom;
    const newCamY = rect.height / 2 - centerY * newZoom;

    zoomRef.current = newZoom;
    cameraRef.current = { x: newCamX, y: newCamY };
    applyTransform();
    setZoom(newZoom);
    setCamera({ x: newCamX, y: newCamY });
  }, [docs, applyTransform]);

  const pairConnsForActive = activeConn
    ? connections.filter(c => pairKey(c.source_doc_id, c.target_doc_id) === pairKey(activeConn.source_doc_id, activeConn.target_doc_id))
    : [];

  const handleNavConn = (conn) => {
    setActiveConn(conn);
  };

  const maxX = Math.max(docs.reduce((m, d) => Math.max(m, d.position_x + 200), 0), 3000);
  const maxY = Math.max(docs.reduce((m, d) => Math.max(m, d.position_y + 200), 0), 2000);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={canvasRef}
      className={`relative flex-1 overflow-hidden bg-surface-900 select-none ${
        connectMode ? '' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onClick={handleCanvasClick}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
    >
      <LatticeBackground />

      {docs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-600 text-lg font-medium">No documents yet</p>
            <p className="text-gray-600 text-sm mt-1">Click the upload button to get started</p>
          </div>
        </div>
      )}

      <div
        ref={innerRef}
        className="absolute origin-top-left"
        style={{
          width: maxX,
          height: maxY,
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
          willChange: 'transform',
        }}
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: maxX, height: maxY }}
        >
          <g className="pointer-events-auto">
            {connections.map((conn, idx) => (
              <ConnectionLine
                key={conn.id}
                conn={conn}
                docs={docs}
                onClick={handleLineClick}
                animateIn={newConnIds?.has(conn.id)}
                colorIndex={idx}
                pairIndex={conn._pairIndex || 0}
                pairTotal={conn._pairTotal || 1}
              />
            ))}
          </g>
        </svg>

        {docs.map(doc => (
          <DocumentNode
            key={doc.id}
            doc={doc}
            selected={connectFirst === doc.id}
            connectMode={connectMode}
            selectMode={selectMode}
            isSelected={selectedIds?.has(doc.id)}
            isAnchor={anchorIds?.has(doc.id)}
            animating={animating}
            zoom={zoom}
            onPositionChange={handlePositionChange}
            onToggleLock={handleToggleLock}
            onDelete={handleDelete}
            onClick={handleNodeClick}
            onView={onViewDoc}
            onToggleSelect={onToggleSelect}
            onToggleAnchor={onToggleAnchor}
          />
        ))}

        {activeConn && (
          <ConnectionModal
            conn={activeConn}
            docs={docs}
            position={modalPos}
            onSave={handleSaveConn}
            onDelete={handleDeleteConn}
            onClose={() => setActiveConn(null)}
            pairConns={pairConnsForActive}
            onNavConn={handleNavConn}
          />
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-surface-800/90 backdrop-blur-sm border border-surface-600 rounded-xl px-2 py-1.5 shadow-lg shadow-black/30">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition cursor-pointer disabled:opacity-30 disabled:cursor-default"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-[11px] text-gray-400 font-medium w-10 text-center tabular-nums select-none">
          {zoomPercent}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition cursor-pointer disabled:opacity-30 disabled:cursor-default"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-5 bg-surface-600 mx-0.5" />
        <button
          onClick={handleFitToView}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition cursor-pointer"
          title="Fit all documents in view"
        >
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
}
