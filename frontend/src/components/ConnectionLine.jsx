const NODE_W = 160;
const NODE_H = 130;

export default function ConnectionLine({ conn, docs, onClick }) {
  const src = docs.find(d => d.id === conn.source_doc_id);
  const tgt = docs.find(d => d.id === conn.target_doc_id);
  if (!src || !tgt) return null;

  const x1 = src.position_x + NODE_W / 2;
  const y1 = src.position_y + NODE_H / 2;
  const x2 = tgt.position_x + NODE_W / 2;
  const y2 = tgt.position_y + NODE_H / 2;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onClick(conn); }}>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#c7d2fe"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Invisible wider hit area */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="transparent"
        strokeWidth={14}
      />
      {/* Small dot at midpoint */}
      <circle cx={midX} cy={midY} r={5} fill="#818cf8" />
      {conn.description && (
        <circle cx={midX} cy={midY} r={5} fill="#4f46e5" />
      )}
    </g>
  );
}
