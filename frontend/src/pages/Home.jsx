import { useEffect, useState, useCallback } from 'react';
import { Plus, Link as LinkIcon } from 'lucide-react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Canvas from '../components/Canvas';
import UploadModal from '../components/UploadModal';
import DocumentViewer from '../components/DocumentViewer';
import SearchResults from '../components/SearchResults';
import AutoLinkBar from '../components/AutoLinkBar';
import DocSidebar from '../components/DocSidebar';
import Toast from '../components/Toast';

let toastId = 0;

function applyPositions(prevDocs, positions) {
  return prevDocs.map(d => {
    const pos = positions[String(d.id)];
    if (pos) return { ...d, position_x: pos.x, position_y: pos.y };
    return d;
  });
}

export default function Home() {
  const [docs, setDocs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPage, setSearchPage] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [organizing, setOrganizing] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [autoLinking, setAutoLinking] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [newConnIds, setNewConnIds] = useState(new Set());

  const addToast = useCallback((message, type = 'error') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/documents'),
      api.get('/connections'),
    ]).then(([docRes, connRes]) => {
      setDocs(docRes.data);
      setConnections(connRes.data);
    });
  }, []);

  const handleUploaded = (newDoc) => {
    setDocs(prev => [...prev, newDoc]);
  };

  const handleSearch = async (query) => {
    if (!query) {
      setSearchResults(null);
      setSearchQuery('');
      return;
    }
    setSearchQuery(query);
    setSearching(true);
    try {
      const res = await api.get('/documents/search', { params: { q: query } });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSelect = (docId, page, query) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    setViewingDoc(doc);
    setSearchPage(page);
    setSearchQuery(query);
    setSearchResults(null);
  };

  const handleCloseViewer = () => {
    setViewingDoc(null);
    setSearchPage(null);
    setSearchQuery('');
  };

  const handleToggleAutoLink = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedDocIds(new Set());
      setAutoLinking(false);
    } else {
      setConnectMode(false);
      setSelectMode(true);
      setSelectedDocIds(new Set());
    }
  };

  const handleToggleSelect = useCallback((docId) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }, []);

  const handleAutoLinkAnalyze = async () => {
    if (selectedDocIds.size < 2) return;
    setAutoLinking(true);

    try {
      const res = await api.post('/autolink', { doc_ids: Array.from(selectedDocIds) });
      const { connections: newConns, positions } = res.data;

      setAnimating(true);

      // Apply positions for ALL docs (backend returns positions for every doc)
      setDocs(prev => applyPositions(prev, positions));

      const connIdsToAnimate = new Set();
      for (let i = 0; i < newConns.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const conn = newConns[i];
        connIdsToAnimate.add(conn.id);
        setNewConnIds(new Set(connIdsToAnimate));
        setConnections(prev => [...prev, conn]);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setAnimating(false);
      setSelectMode(false);
      setSelectedDocIds(new Set());
      setNewConnIds(new Set());

      if (newConns.length > 0) {
        addToast(`Created ${newConns.length} connection${newConns.length !== 1 ? 's' : ''}`, 'success');
      } else {
        addToast('No new connections found between selected documents', 'info');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Auto-link failed';
      addToast(msg, 'error');
    } finally {
      setAutoLinking(false);
    }
  };

  const handleOrganize = async () => {
    if (docs.length === 0) return;
    setOrganizing(true);
    try {
      const res = await api.post('/organize');
      const { positions } = res.data;
      setAnimating(true);
      setDocs(prev => applyPositions(prev, positions));
      await new Promise(resolve => setTimeout(resolve, 900));
      setAnimating(false);
      addToast('Canvas organized', 'success');
    } catch {
      addToast('Failed to organize canvas', 'error');
    } finally {
      setOrganizing(false);
    }
  };

  const handleSidebarNavigate = (doc) => {
    setSidebarOpen(false);
    const el = document.querySelector(`[data-doc-id="${doc.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      el.animate([
        { boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.5)' },
        { boxShadow: '0 0 24px 8px rgba(249, 115, 22, 0.3)' },
        { boxShadow: '0 0 0 0 rgba(249, 115, 22, 0)' },
      ], { duration: 1200, easing: 'ease-out' });
    }
  };

  return (
    <div className="h-screen flex flex-col relative">
      <Navbar
        onSearch={handleSearch}
        searching={searching}
        selectMode={selectMode}
        onAutoLink={handleToggleAutoLink}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onOrganize={handleOrganize}
        organizing={organizing}
      />

      {searchResults !== null && (
        <SearchResults
          results={searchResults}
          query={searchQuery}
          onSelect={handleSearchSelect}
          onClose={() => setSearchResults(null)}
        />
      )}

      <Canvas
        docs={docs}
        setDocs={setDocs}
        connections={connections}
        setConnections={setConnections}
        connectMode={connectMode}
        setConnectMode={setConnectMode}
        onViewDoc={setViewingDoc}
        selectMode={selectMode}
        selectedIds={selectedDocIds}
        onToggleSelect={handleToggleSelect}
        animating={animating}
        newConnIds={newConnIds}
        onToast={addToast}
      />

      {/* Floating action buttons - bottom-right */}
      {!selectMode && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          <button
            onClick={() => { setConnectMode(prev => !prev); setSelectMode(false); }}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition cursor-pointer ${
              connectMode
                ? 'bg-molten-500 text-white shadow-molten-500/30 ring-2 ring-molten-400/40'
                : 'bg-surface-700 text-gray-300 border border-surface-500 hover:bg-surface-600 hover:text-white shadow-black/30'
            }`}
            title={connectMode ? 'Cancel connecting' : 'Connect documents'}
          >
            <LinkIcon size={20} />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="w-12 h-12 rounded-full bg-lava-600 hover:bg-lava-500 text-white flex items-center justify-center shadow-lg shadow-lava-600/30 transition cursor-pointer"
            title="Upload documents"
          >
            <Plus size={22} />
          </button>
        </div>
      )}

      {selectMode && (
        <AutoLinkBar
          selectedCount={selectedDocIds.size}
          onCancel={handleToggleAutoLink}
          onAnalyze={handleAutoLinkAnalyze}
          analyzing={autoLinking}
        />
      )}

      <DocSidebar
        docs={docs}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleSidebarNavigate}
      />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}

      {viewingDoc && (
        <DocumentViewer
          doc={viewingDoc}
          searchQuery={searchQuery}
          searchPage={searchPage}
          onClose={handleCloseViewer}
        />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast
              message={t.message}
              type={t.type}
              onDismiss={() => removeToast(t.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
