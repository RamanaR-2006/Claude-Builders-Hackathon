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

const DASH_PATTERNS = [null, '10 5', '6 4', '3 3', '12 4 4 4'];

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

function quadBezierAt(x1, y1, cpx, cpy, x2, y2, t) {
  const u = 1 - t;
  return {
    x: u * u * x1 + 2 * u * t * cpx + t * t * x2,
    y: u * u * y1 + 2 * u * t * cpy + t * t * y2,
  };
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

  const isMulti = pairTotal > 1;
  const OFFSET_SPACING = 35;
  let offset = 0;
  if (isMulti) {
    offset = (pairIndex - (pairTotal - 1) / 2) * OFFSET_SPACING;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const cpx = (x1 + x2) / 2 + nx * offset;
  const cpy = (y1 + y2) / 2 + ny * offset;

  // Stagger the diamond along the curve so they don't overlap
  const diamondT = isMulti ? 0.35 + (pairIndex / Math.max(pairTotal - 1, 1)) * 0.3 : 0.5;
  const diamondPos = quadBezierAt(x1, y1, cpx, cpy, x2, y2, diamondT);
  const midX = diamondPos.x;
  const midY = diamondPos.y;

  const pathD = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
  const dashPattern = isMulti ? (DASH_PATTERNS[pairIndex % DASH_PATTERNS.length] || null) : null;
  const glowWidth = isMulti ? 4 : 6;
  const lineOpacity = isMulti ? 0.85 : 0.7;

  // Tooltip Y offset to prevent stacking
  const tooltipYOff = isMulti ? -56 - (pairIndex % 3) * 28 : -52;

  return (
    <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onClick(conn); }}>
      <path
        d={pathD}
        fill="none"
        stroke={palette.glow}
        strokeWidth={glowWidth}
        strokeLinecap="round"
        opacity={0.15}
        strokeDasharray={dashPattern || undefined}
        className={animateIn ? 'animate-line-draw' : ''}
      />
      <path
        d={pathD}
        fill="none"
        stroke={palette.line}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={lineOpacity}
        strokeDasharray={dashPattern || undefined}
        className={animateIn ? 'animate-line-draw' : ''}
      />
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
      />
      {/* Diamond hover zone */}
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
          y={midY + tooltipYOff}
          width={280}
          height={48}
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
