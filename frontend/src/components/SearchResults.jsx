import { useState } from 'react';
import { FileText, Film, Music, X, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_ICONS = { pdf: FileText, video: Film, audio: Music };
const TYPE_COLORS = { pdf: 'text-ruby-400', video: 'text-gem-400', audio: 'text-emerald-400' };

function HighlightedSnippet({ text, query }) {
  if (!text || !query) return null;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-gem-500/30 text-gem-400 rounded px-0.5">{part}</mark>
          : part
      )}
    </p>
  );
}

function MatchRow({ match, result, query, onSelect, Icon, iconColor }) {
  return (
    <button
      onClick={() => onSelect(result.doc_id, match.page, query)}
      className="w-full text-left px-4 py-3 hover:bg-surface-700 transition cursor-pointer flex items-start gap-3"
    >
      <Icon size={18} className={`${iconColor} shrink-0 mt-0.5`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-200 truncate">{result.original_name}</p>
        {match.page && (
          <span className="text-[10px] font-medium text-gem-400 bg-gem-500/10 rounded px-1.5 py-0.5 inline-block mt-1">
            Page {match.page}
          </span>
        )}
        {!match.page && !match.snippet && (
          <span className="text-[10px] font-medium text-gray-500 bg-surface-600 rounded px-1.5 py-0.5 inline-block mt-1">
            Filename match
          </span>
        )}
        {match.snippet && <HighlightedSnippet text={match.snippet} query={query} />}
      </div>
    </button>
  );
}

function DocumentGroup({ result, query, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[result.file_type] || FileText;
  const iconColor = TYPE_COLORS[result.file_type] || 'text-gray-400';

  const PREVIEW_COUNT = 3;
  const hasMore = result.matches.length > PREVIEW_COUNT;
  const visibleMatches = expanded ? result.matches : result.matches.slice(0, PREVIEW_COUNT);
  const hiddenCount = result.matches.length - PREVIEW_COUNT;

  return (
    <div className="border-b border-surface-600/50 last:border-0">
      {visibleMatches.map((match, idx) => (
        <MatchRow
          key={idx}
          match={match}
          result={result}
          query={query}
          onSelect={onSelect}
          Icon={Icon}
          iconColor={iconColor}
        />
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-gem-400 hover:text-gem-400/80 hover:bg-surface-700/50 transition cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              Show fewer
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              +{hiddenCount} more match{hiddenCount !== 1 ? 'es' : ''}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function SearchResults({ results, query, onSelect, onClose }) {
  if (!results || results.length === 0) {
    return (
      <div className="absolute top-14 left-0 right-0 z-40 flex justify-start px-5 pt-2">
        <div className="w-96 bg-surface-800 border border-surface-600 rounded-xl shadow-xl shadow-black/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Search Results</span>
            <button onClick={onClose} className="p-0.5 text-gray-500 hover:text-gray-300 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <p className="text-sm text-gray-500">No documents match &quot;{query}&quot;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-14 left-0 right-0 z-40 flex justify-start px-5 pt-2">
      <div className="w-96 max-h-[70vh] bg-surface-800 border border-surface-600 rounded-xl shadow-xl shadow-black/40 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600 shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {results.length} document{results.length !== 1 ? 's' : ''} found
          </span>
          <button onClick={onClose} className="p-0.5 text-gray-500 hover:text-gray-300 cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {results.map(result => (
            <DocumentGroup
              key={result.doc_id}
              result={result}
              query={query}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
