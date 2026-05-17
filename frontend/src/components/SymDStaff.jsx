// Staff layout constants — exported so App can calculate scroll position
export const BEAT_W    = 52;   // px per quarter note (time axis)
export const MARGIN_X  = 48;   // left margin

const INNER_SPACE  = 22;   // px between lines 2-3 and 3-4 (narrow)
const OUTER_SPACE  = 34;   // px between lines 1-2 and 4-5 (wide — fits shaded mediant)
const LEDGER_SPACE = 26;   // px above line 1 and below line 5 (tonic / leading tone)
const NOTE_R       = 6;    // note head radius
const MARGIN_Y     = 56;   // top/bottom padding

// Derive the 5 line Y positions from the top margin downward.
function buildLayout(marginY) {
  const line1 = marginY + LEDGER_SPACE;        // interval 2 on this line
  const line2 = line1 + OUTER_SPACE;           // interval 4
  const line3 = line2 + INNER_SPACE;           // interval 6 — center (bold)
  const line4 = line3 + INNER_SPACE;           // interval 8
  const line5 = line4 + OUTER_SPACE;           // interval 10
  return { line1, line2, line3, line4, line5 };
}

// Map a SymD interval (0–11) to a Y pixel position.
// Lines hold even intervals; spaces hold odd intervals; mediants in outer spaces.
function intervalToY(interval, layout) {
  const { line1, line2, line3, line4, line5 } = layout;
  return {
    0:  line1 - LEDGER_SPACE,                // tonic — above line 1
    1:  line1 - LEDGER_SPACE / 2,            // minor 2nd — top outer space
    2:  line1,                               // major 2nd — ON line 1
    3:  (line1 + line2) / 2,                 // minor 3rd (mediant) — shaded outer space
    4:  line2,                               // major 3rd — ON line 2
    5:  (line2 + line3) / 2,                 // perfect 4th — inner space
    6:  line3,                               // tritone — ON center line (bold)
    7:  (line3 + line4) / 2,                 // perfect 5th — inner space
    8:  line4,                               // minor 6th — ON line 4
    9:  (line4 + line5) / 2,                 // major 6th (mediant) — shaded outer space
    10: line5,                               // minor 7th — ON line 5
    11: line5 + LEDGER_SPACE / 2,            // major 7th — bottom outer space
  }[interval] ?? line3;
}

// Interval names for the hover / label display
const INTERVAL_NAMES = [
  'Tonic', 'min 2', 'maj 2', 'min 3', 'maj 3', 'P4',
  'Tritone', 'P5', 'min 6', 'maj 6', 'min 7', 'maj 7',
];

export default function SymDStaff({ notes = [], tonic = 'C', currentBeat = null }) {
  const realNotes = notes.filter(n => !n.rest);
  const maxOffset = realNotes.reduce((m, n) => Math.max(m, n.offset + n.duration), 0);
  const svgWidth  = MARGIN_X * 2 + maxOffset * BEAT_W;

  const layout  = buildLayout(MARGIN_Y);
  const { line1, line2, line3, line4, line5 } = layout;
  const svgHeight = line5 + LEDGER_SPACE + MARGIN_Y;

  const noteX = offset => MARGIN_X + offset * BEAT_W;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      style={{ display: 'block', background: '#fafaf7', borderRadius: 8 }}
    >
      {/* ── Shaded mediant spaces (intervals 3 and 9) ── */}
      <rect
        x={0} y={(line1 + line2) / 2 - OUTER_SPACE / 4}
        width={svgWidth} height={OUTER_SPACE / 2}
        fill="#e8eeff" opacity={0.7}
      />
      <rect
        x={0} y={(line4 + line5) / 2 - OUTER_SPACE / 4}
        width={svgWidth} height={OUTER_SPACE / 2}
        fill="#e8eeff" opacity={0.7}
      />

      {/* ── Staff lines ── */}
      {[line1, line2, line4, line5].map((y, i) => (
        <line key={i} x1={0} y1={y} x2={svgWidth} y2={y}
          stroke="#b0aaa0" strokeWidth={1} />
      ))}
      {/* Center line (tritone) — bold */}
      <line x1={0} y1={line3} x2={svgWidth} y2={line3}
        stroke="#1a1a2e" strokeWidth={2.5} />

      {/* ── Interval axis labels (left side) ── */}
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
      <text x={MARGIN_X - 10} y={intervalToY(0, layout) - 6}
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
            {/* Gold highlight ring when note is playing */}
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
