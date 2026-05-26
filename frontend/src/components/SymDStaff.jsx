// Staff layout constants — exported so App can calculate scroll position
export const BEAT_W    = 52;   // px per quarter note (time axis)
export const MARGIN_X  = 48;   // left margin

// Lines L1 (bottom) to L5 (top) in musical terms.
// In SVG y increases downward, so L1 has the largest Y, L5 the smallest.
const INNER_SPACE  = 20;   // L2-L3 and L3-L4: one note slot each (narrow)
const OUTER_SPACE  = 38;   // L1-L2 and L4-L5: two note slots each (wide)
const LEDGER_SPACE = 24;   // below L1 (tonic) and above L5 (octave)
const NOTE_R       = 6;    // note head radius
const MARGIN_Y     = 50;   // top/bottom padding

// Build the 5 line Y positions. L5 (top line) sits just below the top margin.
function buildLayout() {
  const L5 = MARGIN_Y + LEDGER_SPACE;   // interval 11 — top line
  const L4 = L5 + OUTER_SPACE;          // interval 8
  const L3 = L4 + INNER_SPACE;          // interval 6 — center (tritone, bold)
  const L2 = L3 + INNER_SPACE;          // interval 4
  const L1 = L2 + OUTER_SPACE;          // interval 1 — bottom line
  return { L1, L2, L3, L4, L5 };
}

// Map a SymD interval (0–11) to a Y pixel position.
// Higher interval = higher pitch = smaller Y (higher on screen).
// Outer spaces (L1-L2 and L4-L5) each hold two note slots.
function intervalToY(interval, layout) {
  const { L1, L2, L3, L4, L5 } = layout;
  return {
    0:  L1 + LEDGER_SPACE,              // tonic — ledger space below L1
    1:  L1,                             // ON L1 (bottom line)
    2:  L2 + OUTER_SPACE * 2 / 3,      // outer space L1-L2, lower slot
    3:  L2 + OUTER_SPACE / 3,          // outer space L1-L2, upper slot (mediant)
    4:  L2,                             // ON L2
    5:  (L2 + L3) / 2,                 // inner space L2-L3
    6:  L3,                             // ON L3 — tritone, center (bold)
    7:  (L3 + L4) / 2,                 // inner space L3-L4
    8:  L4,                             // ON L4
    9:  L5 + OUTER_SPACE * 2 / 3,      // outer space L4-L5, lower slot (mediant)
    10: L5 + OUTER_SPACE / 3,          // outer space L4-L5, upper slot
    11: L5,                             // ON L5 (top line)
  }[interval] ?? L3;
}

// Interval names for hover tooltips
const INTERVAL_NAMES = [
  'Tonic', 'min 2', 'maj 2', 'min 3', 'maj 3', 'P4',
  'Tritone', 'P5', 'min 6', 'maj 6', 'min 7', 'maj 7',
];

export default function SymDStaff({ notes = [], tonic = 'C', currentBeat = null }) {
  const realNotes = notes.filter(n => !n.rest);
  const maxOffset = realNotes.reduce((m, n) => Math.max(m, n.offset + n.duration), 0);
  const svgWidth  = MARGIN_X * 2 + maxOffset * BEAT_W;

  const layout = buildLayout();
  const { L1, L2, L3, L4, L5 } = layout;
  const svgHeight = L1 + LEDGER_SPACE + MARGIN_Y;

  const noteX = offset => MARGIN_X + offset * BEAT_W;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      style={{ display: 'block', background: '#fafaf7', borderRadius: 8 }}
    >
      {/* ── Shaded outer spaces (hold the mediant intervals 3 and 9) ── */}
      <rect x={0} y={L5} width={svgWidth} height={OUTER_SPACE}
        fill="#e8eeff" opacity={0.6} />
      <rect x={0} y={L2} width={svgWidth} height={OUTER_SPACE}
        fill="#e8eeff" opacity={0.6} />

      {/* ── Staff lines (L1 bottom, L5 top) ── */}
      {[L1, L2, L4, L5].map((y, i) => (
        <line key={i} x1={0} y1={y} x2={svgWidth} y2={y}
          stroke="#b0aaa0" strokeWidth={1} />
      ))}
      {/* Center line (tritone) — bold */}
      <line x1={0} y1={L3} x2={svgWidth} y2={L3}
        stroke="#1a1a2e" strokeWidth={2.5} />

      {/* ── Interval axis labels (left side, 0 at bottom → 11 at top) ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const y = intervalToY(i, layout);
        const isMediant = i === 3 || i === 9;
        const isTritone = i === 6;
        return (
          <text key={i} x={MARGIN_X - 10} y={y + 4}
            textAnchor="end" fontSize={10} fontFamily="monospace"
            fill={isTritone ? '#1a1a2e' : isMediant ? '#2d5be3' : '#888'}
            fontWeight={isTritone ? 'bold' : 'normal'}
          >
            {i}
          </text>
        );
      })}

      {/* ── Tonic label ── */}
      <text x={MARGIN_X - 10} y={intervalToY(0, layout) + 14}
        textAnchor="end" fontSize={9} fontFamily="monospace" fill="#c94f1e"
      >
        {tonic}
      </text>

      {/* ── Note heads ── */}
      {realNotes.map((n, i) => {
        const x = noteX(n.offset);
        const y = intervalToY(n.interval, layout);
        const isTritone = n.interval === 6;
        const isMediant = n.interval === 3 || n.interval === 9;
        const color = isTritone ? '#c94f1e' : isMediant ? '#2d5be3' : '#1a1a2e';
        const isActive = currentBeat !== null
          && n.offset <= currentBeat
          && currentBeat < n.offset + n.duration;
        return (
          <g key={i}>
            <title>{`${n.note}  interval ${n.interval}  (${INTERVAL_NAMES[n.interval]})`}</title>
            {isActive && (
              <circle cx={x} cy={y} r={NOTE_R + 5} fill="#ffd700" opacity={0.35} />
            )}
            {isActive && (
              <circle cx={x} cy={y} r={NOTE_R + 3} fill="none"
                stroke="#ffd700" strokeWidth={2} opacity={0.9} />
            )}
            <circle cx={x} cy={y} r={isActive ? NOTE_R + 1 : NOTE_R}
              fill={color} opacity={isActive ? 1 : 0.75} />
            <text x={x} y={y - NOTE_R - 2}
              textAnchor="middle" fontSize={9} fontFamily="monospace"
              fill={isActive ? '#b8860b' : color}
              fontWeight={isActive ? 'bold' : 'normal'}
            >
              {n.interval}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
