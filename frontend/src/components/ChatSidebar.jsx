import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, FileText, Trash2 } from 'lucide-react';

function CitationChip({ citation, onClick }) {
  const label = citation.doc_name
    ? (citation.doc_name.length > 20 ? citation.doc_name.slice(0, 20) + '…' : citation.doc_name)
    : `Doc ${citation.doc_id}`;

  return (
    <button
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-lava-600/20 border border-lava-500/30 text-lava-400 text-[10px] font-medium hover:bg-lava-600/30 transition cursor-pointer mr-1 mb-0.5"
      title={`${citation.doc_name} — p.${citation.page}: "${citation.quote}"`}
    >
      <FileText size={9} />
      {label} p.{citation.page}
    </button>
  );
}

function formatMarkdownLine(line, keyPrefix) {
  const parts = [];
  let remaining = line;
  let partIdx = 0;

  // Process bold and italic inline markers
  const inlineRegex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-${partIdx++}`}>{remaining.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<strong key={`${keyPrefix}-${partIdx++}`}><em>{match[2]}</em></strong>);
    } else if (match[3]) {
      parts.push(<strong key={`${keyPrefix}-${partIdx++}`}>{match[3]}</strong>);
    } else if (match[4]) {
      parts.push(<em key={`${keyPrefix}-${partIdx++}`}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(<code key={`${keyPrefix}-${partIdx++}`} className="px-1 py-0.5 rounded bg-surface-600 text-lava-300 text-[11px]">{match[5]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(<span key={`${keyPrefix}-${partIdx++}`}>{remaining.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={`${keyPrefix}-0`}>{line}</span>];
}

function renderAssistantMessage(text, citations, onCitationClick, docs) {
  // Replace citation markers with placeholder tokens
  const citationPattern = /\[DOC:(\d+):(\d+):"([^"]*?)"\]/g;
  const citationMap = {};
  let citIdx = 0;
  const cleanText = text.replace(citationPattern, (full, docId, page, quote) => {
    const token = `__CIT_${citIdx}__`;
    citationMap[token] = { docId: parseInt(docId), page: parseInt(page), quote };
    citIdx++;
    return token;
  });

  const lines = cleanText.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="pl-4 space-y-0.5 my-1">
          {listItems.map((item, i) => <li key={i} className="list-disc text-sm text-gray-200 leading-relaxed">{item}</li>)}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<div key={`br-${lineIdx}`} className="h-1.5" />);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<p key={`h3-${lineIdx}`} className="text-xs font-bold text-white mt-2 mb-0.5">{renderLineWithCitations(trimmed.slice(4), citationMap, onCitationClick, docs, `h3-${lineIdx}`)}</p>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<p key={`h2-${lineIdx}`} className="text-sm font-bold text-white mt-2 mb-0.5">{renderLineWithCitations(trimmed.slice(3), citationMap, onCitationClick, docs, `h2-${lineIdx}`)}</p>);
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<p key={`h1-${lineIdx}`} className="text-sm font-bold text-white mt-2 mb-0.5">{renderLineWithCitations(trimmed.slice(2), citationMap, onCitationClick, docs, `h1-${lineIdx}`)}</p>);
      return;
    }

    // Bullet / numbered lists
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (bulletMatch || numberedMatch) {
      const content = bulletMatch ? bulletMatch[1] : numberedMatch[1];
      listItems.push(renderLineWithCitations(content, citationMap, onCitationClick, docs, `li-${lineIdx}`));
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${lineIdx}`} className="text-sm text-gray-200 leading-relaxed">
        {renderLineWithCitations(trimmed, citationMap, onCitationClick, docs, `p-${lineIdx}`)}
      </p>
    );
  });

  flushList();

  if (citIdx > 0) {
    elements.push(
      <CitationSources key="sources" citationMap={citationMap} docs={docs} onCitationClick={onCitationClick} />
    );
  }

  return elements;
}

function renderLineWithCitations(line, citationMap, onCitationClick, docs, keyPrefix) {
  const tokenPattern = /__CIT_(\d+)__/g;
  const parts = line.split(tokenPattern);
  const elements = [];

  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) elements.push(...formatMarkdownLine(part, `${keyPrefix}-t${i}`));
    } else {
      const token = `__CIT_${part}__`;
      const citData = citationMap[token];
      if (citData) {
        const doc = docs?.find(d => d.id === citData.docId);
        const cit = {
          doc_id: citData.docId,
          page: citData.page,
          quote: citData.quote,
          doc_name: doc?.original_name || `Doc ${citData.docId}`,
        };
        elements.push(<CitationChip key={`${keyPrefix}-c${i}`} citation={cit} onClick={onCitationClick} />);
      }
    }
  });

  return elements;
}

function CitationSources({ citationMap, docs, onCitationClick }) {
  const byDoc = {};
  Object.values(citationMap).forEach(({ docId, page, quote }) => {
    if (!byDoc[docId]) {
      const doc = docs?.find(d => d.id === docId);
      byDoc[docId] = { docId, name: doc?.original_name || `Doc ${docId}`, entries: [] };
    }
    // avoid exact duplicate chips (same page+quote)
    const already = byDoc[docId].entries.some(e => e.page === page && e.quote === quote);
    if (!already) byDoc[docId].entries.push({ page, quote });
  });

  const sources = Object.values(byDoc);
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-surface-600/60">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Sources</p>
      <div className="flex flex-col gap-1">
        {sources.map(({ docId, name, entries }) => (
          <div key={docId} className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-gray-500 shrink-0 max-w-[130px] truncate" title={name}>{name}</span>
            <span className="text-gray-700 text-[9px]">—</span>
            {entries.map((e, i) => (
              <button
                key={i}
                onClick={() => onCitationClick({ doc_id: docId, page: e.page, quote: e.quote, doc_name: name })}
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-600 border border-surface-500 text-lava-400 hover:bg-surface-500 transition cursor-pointer"
                title={`p.${e.page}: "${e.quote}"`}
              >
                p.{e.page}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatSidebar({ open, onToggle, messages, loading, onSend, onCitationClick, onReset, docs }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    onSend(text);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <>
      {/* Tab handle */}
      {!open && (
        <button
          onClick={onToggle}
          className="fixed top-1/2 -translate-y-1/2 right-0 z-40 flex items-center gap-1 px-2 py-3 rounded-l-xl bg-surface-800/95 backdrop-blur-lg border border-r-0 border-surface-500 shadow-lg shadow-black/30 text-lava-400 hover:text-lava-300 hover:bg-surface-700 transition cursor-pointer"
          title="Open Chat"
        >
          <MessageSquare size={16} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
            CHAT
          </span>
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={onToggle} />
      )}

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-[380px] z-50 bg-surface-800/95 backdrop-blur-lg border-l border-surface-600 shadow-2xl shadow-black/50 transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-surface-600 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-lava-400" />
            <h2 className="text-sm font-semibold text-white">Chat</h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={onReset}
                className="p-1 text-gray-500 hover:text-magma-400 transition cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onToggle} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={32} className="text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">Ask questions about your documents</p>
              <p className="text-[11px] text-gray-600 mt-1">I'll reference your uploaded files to provide answers with citations.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-lava-600/80 text-white rounded-br-md'
                  : 'bg-surface-700 text-gray-200 rounded-bl-md border border-surface-500'
              }`}>
                {msg.role === 'assistant'
                  ? renderAssistantMessage(msg.content, msg.citations || [], onCitationClick, docs)
                  : <span className="text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                }
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-700 border border-surface-500 rounded-xl rounded-bl-md px-3 py-2 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-lava-400" />
                <span className="text-sm text-gray-400">Thinking…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-surface-600">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about your documents… (Shift+Enter for newline)"
              disabled={loading}
              rows={1}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 transition disabled:opacity-50 resize-none overflow-y-auto"
              style={{ minHeight: '36px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-2 rounded-lg bg-lava-600 hover:bg-lava-500 text-white transition disabled:opacity-30 cursor-pointer shrink-0 mb-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
