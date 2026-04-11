import { useState } from 'react';
import { LogOut, Search, Loader2, Sparkles, List, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ onSearch, searching, selectMode, onAutoLink, onToggleSidebar, onOrganize, organizing }) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim());
    }
    if (e.key === 'Escape') {
      setQuery('');
      onSearch('');
    }
  };

  return (
    <nav className="h-14 bg-surface-800 border-b border-surface-600 flex items-center justify-between px-5 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight text-white">Lattice</h1>

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

        <div className="w-px h-6 bg-surface-600 mx-1" />

        <span className="text-xs text-gray-500 hidden sm:block">{user?.email}</span>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-600 transition cursor-pointer"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
