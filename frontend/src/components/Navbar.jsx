import { LogOut, Link as LinkIcon, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ connectMode, onToggleConnect, onUpload }) {
  const { user, logout } = useAuth();

  return (
    <nav className="h-14 bg-surface-800 border-b border-surface-600 flex items-center justify-between px-5 shrink-0 z-50">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-white">Lattice</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-gem-600 hover:bg-gem-500 text-white transition cursor-pointer"
        >
          <Plus size={16} />
          Upload
        </button>

        <button
          onClick={onToggleConnect}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer ${
            connectMode
              ? 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-500/30'
              : 'bg-surface-600 text-gray-300 hover:bg-surface-500'
          }`}
        >
          <LinkIcon size={16} />
          {connectMode ? 'Connecting…' : 'Connect'}
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
