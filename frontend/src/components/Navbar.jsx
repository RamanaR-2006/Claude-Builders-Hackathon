import { useState, useRef, useEffect } from 'react';
import { LogOut, Search, Loader2, Sparkles, List, LayoutGrid, Share2, Compass, MessageSquarePlus, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onSearch, searching, selectMode, onAutoLink, onToggleSidebar, onOrganize, organizing, onShare, onFeedback, onTutorial }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim());
    }
    if (e.key === 'Escape') {
      setQuery('');
      onSearch('');
    }
  };

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

  return (
    <nav className="h-14 bg-surface-800 border-b border-surface-600 flex items-center justify-between px-5 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="lattice-logo">Lattice</span>
        </h1>

        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-gray-500 hover:text-lava-400 hover:bg-surface-600 transition cursor-pointer"
          title="Document list"
        >
          <List size={18} />
        </button>

        <div className="relative">
          {searching ? (
            <Loader2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lava-400 animate-spin pointer-events-none" />
          ) : (
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          )}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents…"
            className={`w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg bg-surface-700 border text-white placeholder-gray-500 outline-none transition ${
              searching
                ? 'border-lava-500/50 ring-2 ring-lava-500/20'
                : 'border-surface-500 focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOrganize}
          disabled={organizing}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition cursor-pointer disabled:opacity-50"
          title="Organize canvas"
        >
          {organizing ? <Loader2 size={16} className="animate-spin" /> : <LayoutGrid size={16} />}
          Organize
        </button>

        <button
          onClick={onAutoLink}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer ${
            selectMode
              ? 'bg-lava-500/20 text-lava-400 ring-2 ring-lava-500/30'
              : 'bg-surface-600 text-gray-300 hover:bg-surface-500'
          }`}
        >
          <Sparkles size={16} />
          {selectMode ? 'Cancel' : 'Auto-Link'}
        </button>

        <button
          onClick={onShare}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition cursor-pointer"
          title="Share canvas"
        >
          <Share2 size={16} />
          Share
        </button>

        <button
          onClick={() => navigate('/explore')}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition cursor-pointer"
          title="Explore public canvases"
        >
          <Compass size={16} />
          Explore
        </button>

        <div className="w-px h-6 bg-surface-600 mx-1" />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(prev => !prev)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-lava-500 to-molten-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer ring-2 ring-transparent hover:ring-lava-400/40 transition-all"
            title={user?.email}
          >
            {initial}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface-800 border border-surface-600 rounded-xl shadow-xl shadow-black/40 overflow-hidden z-[60]">
              <div className="px-4 py-3 border-b border-surface-600">
                <p className="text-xs text-gray-500 mb-0.5">Signed in as</p>
                <p className="text-sm text-gray-200 truncate" title={user?.email}>{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); onTutorial?.(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-lava-400 hover:bg-lava-500/10 hover:text-lava-300 transition cursor-pointer border-b border-surface-600"
                >
                  <BookOpen size={16} />
                  View Tutorial
                </button>
                <button
                  onClick={() => { setProfileOpen(false); onFeedback?.(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-700 hover:text-lava-400 transition cursor-pointer"
                >
                  <MessageSquarePlus size={16} />
                  Feedback Survey
                </button>
                <button
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-700 hover:text-red-400 transition cursor-pointer"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
