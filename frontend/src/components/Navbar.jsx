import { LogOut, Link as LinkIcon, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ connectMode, onToggleConnect, onUpload }) {
  const { user, logout } = useAuth();

  return (
    <nav className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0 z-50">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-gray-900">Lattice</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition cursor-pointer"
        >
          <Plus size={16} />
          Upload
        </button>

        <button
          onClick={onToggleConnect}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer ${
            connectMode
              ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <LinkIcon size={16} />
          {connectMode ? 'Connecting…' : 'Connect'}
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <span className="text-xs text-gray-400 hidden sm:block">{user?.email}</span>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
