import { useState, useCallback, useRef } from 'react';
import api from '../api/axios';
import DocumentNode from './DocumentNode';
import ConnectionLine from './ConnectionLine';
import ConnectionModal from './ConnectionModal';

export default function Canvas({ docs, setDocs, connections, setConnections, connectMode, setConnectMode }) {
  const [connectFirst, setConnectFirst] = useState(null);
  const [activeConn, setActiveConn] = useState(null);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

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
    } catch {
      // connection may already exist
    }
    setConnectFirst(null);
    setConnectMode(false);
  }, [connectMode, connectFirst, setConnections, setConnectMode]);

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

  const handleCanvasClick = () => {
    if (connectMode) {
      setConnectFirst(null);
      setConnectMode(false);
    }
    setActiveConn(null);
  };

  // Compute canvas size to fit all docs
  const maxX = docs.reduce((m, d) => Math.max(m, d.position_x + 200), 1200);
  const maxY = docs.reduce((m, d) => Math.max(m, d.position_y + 200), 800);

  return (
    <div
      ref={canvasRef}
      className="relative flex-1 overflow-auto bg-[#f8f9fb]"
      onClick={handleCanvasClick}
    >
      <div className="relative" style={{ minWidth: maxX, minHeight: maxY }}>
        {/* SVG layer for connections */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: maxX, height: maxY }}
        >
          <g className="pointer-events-auto">
            {connections.map(conn => (
              <ConnectionLine
                key={conn.id}
                conn={conn}
                docs={docs}
                onClick={handleLineClick}
              />
            ))}
          </g>
        </svg>

        {/* Document nodes */}
        {docs.map(doc => (
          <DocumentNode
            key={doc.id}
            doc={doc}
            selected={connectFirst === doc.id}
            connectMode={connectMode}
            onPositionChange={handlePositionChange}
            onToggleLock={handleToggleLock}
            onDelete={handleDelete}
            onClick={handleNodeClick}
          />
        ))}

        {/* Connection description modal */}
        {activeConn && (
          <ConnectionModal
            conn={activeConn}
            docs={docs}
            position={modalPos}
            onSave={handleSaveConn}
            onDelete={handleDeleteConn}
            onClose={() => setActiveConn(null)}
          />
        )}

        {/* Empty state */}
        {docs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-300 text-lg font-medium">No documents yet</p>
              <p className="text-gray-300 text-sm mt-1">Click Upload to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
