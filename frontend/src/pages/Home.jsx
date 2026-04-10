import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Canvas from '../components/Canvas';
import UploadModal from '../components/UploadModal';
import DocumentViewer from '../components/DocumentViewer';
import SearchResults from '../components/SearchResults';

export default function Home() {
  const [docs, setDocs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPage, setSearchPage] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

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
    try {
      const res = await api.get('/documents/search', { params: { q: query } });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
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

  return (
    <div className="h-screen flex flex-col relative">
      <Navbar
        connectMode={connectMode}
        onToggleConnect={() => setConnectMode(prev => !prev)}
        onUpload={() => setShowUpload(true)}
        onSearch={handleSearch}
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
    </div>
  );
}
