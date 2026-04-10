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

  const hasDesc = !!conn.description;

  return (
    <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onClick(conn); }}>
      {/* Glow effect */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={hasDesc ? '#8b5cf6' : '#22d3ee'}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.15}
      />
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={hasDesc ? '#a78bfa' : '#22d3ee'}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* Invisible wider hit area */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="transparent"
        strokeWidth={14}
      />
      {/* Midpoint diamond */}
      <rect
        x={midX - 5} y={midY - 5}
        width={10} height={10}
        rx={2}
        fill={hasDesc ? '#8b5cf6' : '#06b6d4'}
        transform={`rotate(45 ${midX} ${midY})`}
      />
    </g>
  );
}
