import { useState } from 'react';

const NODE_W = 160;
const NODE_H = 130;

const LINE_COLORS = [
  { glow: '#f97316', line: '#fb923c', diamond: '#f97316' },
  { glow: '#eab308', line: '#fbbf24', diamond: '#eab308' },
  { glow: '#ef4444', line: '#f87171', diamond: '#ef4444' },
  { glow: '#f59e0b', line: '#fcd34d', diamond: '#f59e0b' },
  { glow: '#dc2626', line: '#fb7185', diamond: '#dc2626' },
  { glow: '#d97706', line: '#fde047', diamond: '#d97706' },
  { glow: '#c2410c', line: '#fdba74', diamond: '#c2410c' },
  { glow: '#b91c1c', line: '#fca5a5', diamond: '#b91c1c' },
];

function strengthToColor(strength) {
  if (strength <= 2) return { glow: '#ef4444', line: '#f87171', diamond: '#ef4444' };
  if (strength <= 4) return { glow: '#f97316', line: '#fb923c', diamond: '#f97316' };
  if (strength <= 6) return { glow: '#eab308', line: '#fbbf24', diamond: '#eab308' };
  if (strength <= 8) return { glow: '#84cc16', line: '#a3e635', diamond: '#84cc16' };
  return { glow: '#22c55e', line: '#4ade80', diamond: '#22c55e' };
}

function truncate(str, max = 60) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function ConnectionLine({ conn, docs, onClick, animateIn, colorIndex = 0, pairIndex = 0, pairTotal = 1 }) {
  const [hovered, setHovered] = useState(false);
  const src = docs.find(d => d.id === conn.source_doc_id);
  const tgt = docs.find(d => d.id === conn.target_doc_id);
  if (!src || !tgt) return null;

  const x1 = src.position_x + NODE_W / 2;
  const y1 = src.position_y + NODE_H / 2;
  const x2 = tgt.position_x + NODE_W / 2;
  const y2 = tgt.position_y + NODE_H / 2;

  const hasStrength = conn.strength != null;
  const palette = hasStrength ? strengthToColor(conn.strength) : LINE_COLORS[colorIndex % LINE_COLORS.length];
  const desc = conn.description || '';
  const tooltipText = hasStrength
    ? `${truncate(desc, 100)} (Strength: ${Number(conn.strength).toFixed(1)}/10)`
    : truncate(desc, 120);

  // Compute perpendicular offset for parallel connections between the same pair
  const OFFSET_SPACING = 20;
  let offset = 0;
  if (pairTotal > 1) {
    offset = (pairIndex - (pairTotal - 1) / 2) * OFFSET_SPACING;
  }

  // Perpendicular direction
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  // Control point for quadratic bezier at midpoint + perpendicular offset
  const cpx = (x1 + x2) / 2 + nx * offset;
  const cpy = (y1 + y2) / 2 + ny * offset;

  // Midpoint of the actual curve (at t=0.5 for a quadratic bezier)
  const midX = 0.25 * x1 + 0.5 * cpx + 0.25 * x2;
  const midY = 0.25 * y1 + 0.5 * cpy + 0.25 * y2;

  const pathD = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;

  return (
    <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onClick(conn); }}>
      {/* Glow */}
      <path
        d={pathD}
        fill="none"
        stroke={palette.glow}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.15}
        className={animateIn ? 'animate-line-draw' : ''}
      />
      <path
        d={pathD}
        fill="none"
        stroke={palette.line}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.7}
        className={animateIn ? 'animate-line-draw' : ''}
      />
      {/* Wider hit area */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
      />
      {/* Midpoint diamond hover zone */}
      <rect
        x={midX - 14} y={midY - 14}
        width={28} height={28}
        fill="transparent"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <rect
        x={midX - 5} y={midY - 5}
        width={10} height={10}
        rx={2}
        fill={palette.diamond}
        transform={`rotate(45 ${midX} ${midY})`}
        className={animateIn ? 'animate-diamond-pop' : ''}
        style={{ pointerEvents: 'none' }}
      />

      {hasStrength && (
        <text
          x={midX}
          y={midY + 18}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={palette.diamond}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {Number(conn.strength).toFixed(1)}
        </text>
      )}

      {hovered && desc && (
        <foreignObject
          x={midX - 140}
          y={midY - 52}
          width={280}
          height={46}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              background: '#17130f',
              border: '1px solid #3d332b',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              color: '#ede8e3',
              lineHeight: '1.4',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              maxWidth: '280px',
              wordBreak: 'break-word',
            }}
          >
            {tooltipText}
          </div>
        </foreignObject>
      )}
    </g>
  );
}
