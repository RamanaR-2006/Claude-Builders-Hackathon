import { useState } from 'react';
import { Loader2, X, Sparkles, Anchor, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export default function AutoLinkPanel({ selectedCount, anchorCount, onCancel, onAnalyze, analyzing }) {
  const [overallPrompt, setOverallPrompt] = useState('');
  const [rules, setRules] = useState(['']);
  const [collapsed, setCollapsed] = useState(false);

  const handleAddRule = () => setRules(prev => [...prev, '']);

  const handleRemoveRule = (idx) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRuleChange = (idx, value) => {
    setRules(prev => prev.map((r, i) => i === idx ? value : r));
  };

  const handleAnalyze = () => {
    onAnalyze({
      overallPrompt: overallPrompt.trim(),
      guidedRules: rules.map(r => r.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4" style={{ pointerEvents: 'none' }}>
      <div
        className="bg-surface-800/95 backdrop-blur-lg border border-surface-500 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header -- always visible */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-600 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-lava-400" />
            <h2 className="text-xs font-semibold text-white">Auto-Link</h2>
            <span className="text-[10px] text-gray-400 ml-1">
              <span className="font-semibold text-white">{selectedCount}</span> selected
              {anchorCount > 0 && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-ember-400">
                  <Anchor size={9} />
                  {anchorCount}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCollapsed(c => !c)} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer" title={collapsed ? 'Expand' : 'Collapse'}>
              {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={onCancel} disabled={analyzing} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Collapsible body */}
        {!collapsed && (
          <div className="overflow-y-auto px-4 py-3 space-y-3 max-h-[40vh]">
            {/* Overall prompt */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wide">Overall Context</label>
              <textarea
                value={overallPrompt}
                onChange={e => setOverallPrompt(e.target.value)}
                placeholder="Describe the overall theme… e.g. 'Research papers about climate change'"
                rows={2}
                className="w-full text-sm leading-relaxed border border-surface-500 bg-surface-700 text-white placeholder-gray-500 rounded-lg px-3 py-1.5 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 resize-y transition"
              />
            </div>

            {/* Guided connection rules */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wide">Connection Guidelines</label>
              <div className="space-y-1.5">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 w-3 text-right shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      value={rule}
                      onChange={e => handleRuleChange(idx, e.target.value)}
                      placeholder="e.g. 'Connect papers with same methodology'"
                      className="flex-1 px-2.5 py-1 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 transition"
                    />
                    {rules.length > 1 && (
                      <button
                        onClick={() => handleRemoveRule(idx)}
                        className="p-0.5 text-gray-500 hover:text-magma-400 cursor-pointer shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddRule}
                className="mt-1.5 flex items-center gap-1 text-[11px] text-lava-400 hover:text-lava-300 cursor-pointer transition"
              >
                <Plus size={10} />
                Add rule
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-600">
          <p className="text-[10px] text-gray-500">Select documents on canvas, then analyze</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={analyzing}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || selectedCount < 2}
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg bg-lava-600 hover:bg-lava-500 text-white transition disabled:opacity-50 cursor-pointer"
            >
              {analyzing ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
