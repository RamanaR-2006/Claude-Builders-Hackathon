import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Canvas from '../components/Canvas';
import UploadModal from '../components/UploadModal';
import DocumentViewer from '../components/DocumentViewer';

export default function Home() {
  const [docs, setDocs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

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

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        connectMode={connectMode}
        onToggleConnect={() => setConnectMode(prev => !prev)}
        onUpload={() => setShowUpload(true)}
      />

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
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
