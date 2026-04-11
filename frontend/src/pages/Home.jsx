import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Canvas from '../components/Canvas';
import UploadModal from '../components/UploadModal';
import DocumentViewer from '../components/DocumentViewer';
import SearchResults from '../components/SearchResults';
import AutoLinkBar from '../components/AutoLinkBar';

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

  // Auto-link state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [autoLinking, setAutoLinking] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [newConnIds, setNewConnIds] = useState(new Set());

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

      // Apply new positions (triggers CSS transition on DocumentNode)
      setDocs(prev => prev.map(d => {
        const pos = positions[String(d.id)];
        if (pos) {
          return { ...d, position_x: pos.x, position_y: pos.y };
        }
        return d;
      }));

      // Stagger-add new connections one by one
      const connIdsToAnimate = new Set();
      for (let i = 0; i < newConns.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const conn = newConns[i];
        connIdsToAnimate.add(conn.id);
        setNewConnIds(new Set(connIdsToAnimate));
        setConnections(prev => [...prev, conn]);
      }

      // Wind down
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnimating(false);
      setSelectMode(false);
      setSelectedDocIds(new Set());
      setNewConnIds(new Set());
    } catch (err) {
      const msg = err.response?.data?.error || 'Auto-link failed';
      alert(msg);
    } finally {
      setAutoLinking(false);
    }
  };

  return (
    <div className="h-screen flex flex-col relative">
      <Navbar
        connectMode={connectMode}
        onToggleConnect={() => { setConnectMode(prev => !prev); setSelectMode(false); }}
        onUpload={() => setShowUpload(true)}
        onSearch={handleSearch}
        searching={searching}
        selectMode={selectMode}
        onAutoLink={handleToggleAutoLink}
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
      />

      {selectMode && (
        <AutoLinkBar
          selectedCount={selectedDocIds.size}
          onCancel={handleToggleAutoLink}
          onAnalyze={handleAutoLinkAnalyze}
          analyzing={autoLinking}
        />
      )}

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
    </div>
  );
}
