import { Loader2, X, Sparkles } from 'lucide-react';

export default function AutoLinkBar({ selectedCount, onCancel, onAnalyze, analyzing }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface-800/95 backdrop-blur-lg border border-surface-500 shadow-2xl shadow-black/40">
        <span className="text-sm text-gray-300">
          <span className="font-semibold text-white">{selectedCount}</span>{' '}
          document{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="w-px h-5 bg-surface-600" />

        <button
          onClick={onCancel}
          disabled={analyzing}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition disabled:opacity-50 cursor-pointer"
        >
          <X size={14} />
          Cancel
        </button>

        <button
          onClick={onAnalyze}
          disabled={analyzing || selectedCount < 2}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg bg-lava-600 hover:bg-lava-500 text-white transition disabled:opacity-50 cursor-pointer"
        >
          {analyzing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analyzing with AI…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Analyze
            </>
          )}
        </button>
      </div>
    </div>
  );
}
