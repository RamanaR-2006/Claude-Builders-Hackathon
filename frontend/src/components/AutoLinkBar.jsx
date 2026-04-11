import { useState } from 'react';
import { Loader2, X, Sparkles, Anchor } from 'lucide-react';

export default function AutoLinkBar({ selectedCount, anchorCount, onCancel, onAnalyze, analyzing }) {
  const [guidance, setGuidance] = useState('');

  const handleAnalyze = () => {
    onAnalyze(guidance.trim());
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex flex-col gap-2 px-5 py-3 rounded-2xl bg-surface-800/95 backdrop-blur-lg border border-surface-500 shadow-2xl shadow-black/40 min-w-[380px]">
        {/* Guidance input */}
        <input
          type="text"
          value={guidance}
          onChange={e => setGuidance(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && selectedCount >= 2) handleAnalyze(); }}
          placeholder="Guide connections (optional)… e.g. 'focus on methodology'"
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 transition"
        />

        {/* Status + buttons */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-300 flex-1">
            <span className="font-semibold text-white">{selectedCount}</span>{' '}
            selected
            {anchorCount > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-ember-400">
                <Anchor size={11} />
                {anchorCount} anchor{anchorCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            onClick={onCancel}
            disabled={analyzing}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition disabled:opacity-50 cursor-pointer"
          >
            <X size={14} />
            Cancel
          </button>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || selectedCount < 2}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg bg-lava-600 hover:bg-lava-500 text-white transition disabled:opacity-50 cursor-pointer"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analyzing…
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
    </div>
  );
}
