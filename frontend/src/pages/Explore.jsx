import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, FileText, Link as LinkIcon, Loader2, User } from 'lucide-react';
import api from '../api/axios';

export default function Explore() {
  const navigate = useNavigate();
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/explore')
      .then(res => setCanvases(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      {/* Header */}
      <header className="h-14 bg-surface-800 border-b border-surface-600 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-600 transition cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft size={18} />
          </button>
          <Compass size={20} className="text-lava-400" />
          <h1 className="text-lg font-bold tracking-tight">
            <span className="lattice-logo">Explore</span>
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-lava-400" />
          </div>
        ) : canvases.length === 0 ? (
          <div className="text-center py-20">
            <Compass size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500 text-lg">No shared canvases yet</p>
            <p className="text-gray-600 text-sm mt-1">Be the first to share your work!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {canvases.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/explore/${c.id}`)}
                className="text-left bg-surface-800 border border-surface-600 rounded-xl p-5 hover:border-lava-500/40 hover:shadow-lg hover:shadow-lava-500/5 transition-all cursor-pointer group"
              >
                <h3 className="text-base font-semibold text-gray-200 group-hover:text-lava-400 transition truncate">
                  {c.title}
                </h3>
                {c.description && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{c.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {c.author_email}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-600">
                  <span className="flex items-center gap-1">
                    <FileText size={11} />
                    {c.doc_count} doc{c.doc_count !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <LinkIcon size={11} />
                    {c.conn_count} conn{c.conn_count !== 1 ? 's' : ''}
                  </span>
                  {c.created_at && (
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
