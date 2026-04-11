import { FileText, Film, Music, X } from 'lucide-react';

const TYPE_ICONS = { pdf: FileText, video: Film, audio: Music };
const TYPE_COLORS = { pdf: 'text-magma-400', video: 'text-lava-400', audio: 'text-ember-400' };

export default function DocSidebar({ docs, open, onClose, onNavigate }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      )}

      {/* Panel */}
      <div className={`fixed top-0 left-0 h-full w-72 z-50 bg-surface-800/95 backdrop-blur-lg border-r border-surface-600 shadow-2xl shadow-black/50 transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-surface-600 shrink-0">
          <h2 className="text-sm font-semibold text-white tracking-wide">All Documents</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {docs.length === 0 && (
            <p className="text-sm text-gray-500 px-4 py-6 text-center">No documents uploaded</p>
          )}
          {docs.map(doc => {
            const Icon = TYPE_ICONS[doc.file_type] || FileText;
            const iconColor = TYPE_COLORS[doc.file_type] || 'text-gray-400';
            return (
              <button
                key={doc.id}
                onClick={() => onNavigate(doc)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-700/70 transition text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center shrink-0 group-hover:bg-surface-600">
                  <Icon size={14} className={iconColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200 truncate">{doc.original_name}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{doc.file_type}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
