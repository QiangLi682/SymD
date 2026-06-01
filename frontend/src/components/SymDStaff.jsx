import { useRef, useEffect } from 'react';

export const BEAT_W   = 52;    // px per quarter note (time axis)
export const AXIS_W   = 88;    // width of the fixed left axis panel
const STAFF_PAD       = 16;    // left padding inside the scrollable staff

// Chromatic scale for computing note names from any tonic.
const CHROMATIC   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BLACK_NAMES = new Set(['C#','D#','F#','G#','A#']);

// Return 12 note names starting from clefTonic, and their black-key status.
function buildClefLabels(clefTonic) {
  const start = CHROMATIC.indexOf(clefTonic);
  const names = Array.from({ length: 12 }, (_, i) => CHROMATIC[(start + i) % 12]);
  const black = names.map(n => BLACK_NAMES.has(n));
  return { names, black };
}

const INNER_SPACE  = 20;
const OUTER_SPACE  = 38;
const LEDGER_SPACE = 24;
const NOTE_R       = 6;
const MARGIN_Y     = 50;

function buildLayout() {
  const L5 = MARGIN_Y + LEDGER_SPACE;
  const L4 = L5 + OUTER_SPACE;
  const L3 = L4 + INNER_SPACE;
  const L2 = L3 + INNER_SPACE;
  const L1 = L2 + OUTER_SPACE;
  return { L1, L2, L3, L4, L5 };
}

// Y for axis KEY RECTANGLES only — interval 0 sits just below interval 1,
// interval 12 (octave tonic) sits just above interval 11. Note dot positions unchanged.
function axisKeyY(interval, layout) {
  if (interval === 0)  return intervalToY(1, layout) + 13;   // adjacent below D#
  if (interval === 12) return intervalToY(11, layout) - 13;  // adjacent above C#
  return intervalToY(interval, layout);
}

function intervalToY(interval, layout) {
  const { L1, L2, L3, L4, L5 } = layout;
  return {
    0:  L1 + 13,
    1:  L1,
    2:  L2 + OUTER_SPACE * 2 / 3,
    3:  L2 + OUTER_SPACE / 3,
    4:  L2,
    5:  (L2 + L3) / 2,
    6:  L3,
    7:  (L3 + L4) / 2,
    8:  L4,
    9:  L5 + OUTER_SPACE * 2 / 3,
    10: L5 + OUTER_SPACE / 3,
    11: L5,
  }[interval] ?? L3;
}

const INTERVAL_NAMES = [
  'Tonic', 'min 2', 'maj 2', 'min 3', 'maj 3', 'P4',
  'Tritone', 'P5', 'min 6', 'maj 6', 'min 7', 'maj 7',
];

export default function SymDStaff({ notes = [], tonic = 'C', currentBeat = null, clefTonic = 'D' }) {
  const { names: clefNames, black: isBlack } = buildClefLabels(clefTonic);
  const scrollRef  = useRef(null);
  const realNotes  = notes.filter(n => !n.rest);
  const maxOffset  = realNotes.reduce((m, n) => Math.max(m, n.offset + n.duration), 0);
  const staffWidth = STAFF_PAD * 2 + maxOffset * BEAT_W;

  const layout = buildLayout();
  const { L1, L2, L3, L4, L5 } = layout;
  const svgHeight = L1 + MARGIN_Y;

  const noteX = offset => STAFF_PAD + offset * BEAT_W;

  // Auto-scroll to keep active note centred
  useEffect(() => {
    if (currentBeat === null || !scrollRef.current) return;
    const x = STAFF_PAD + currentBeat * BEAT_W;
    const container = scrollRef.current;
    container.scrollLeft = Math.max(0, x - container.clientWidth / 2);
  }, [currentBeat]);

  const bg = '#fafaf7';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>

      {/* ── Fixed left axis ── */}
      <svg
        width={AXIS_W} height={svgHeight}
        style={{ flexShrink: 0, background: bg }}
      >
        {/* Shade outer spaces to match the scrollable staff */}
        <rect x={0} y={L5} width={AXIS_W} height={OUTER_SPACE} fill="#e8eeff" opacity={0.6} />
        <rect x={0} y={L2} width={AXIS_W} height={OUTER_SPACE} fill="#e8eeff" opacity={0.6} />

        {/* Render intervals 0–11 plus interval 12 (octave tonic) */}
        {[...Array.from({ length: 12 }, (_, i) => i), 12].map(i => {
          const isOctave = i === 12;
          const idx      = isOctave ? 0 : i;          // clefNames index
          const y        = axisKeyY(i, layout);
          const black    = isBlack[idx];
          const onLine   = [1,4,6,8,11].includes(i);
          const mismatch = onLine && !black;
          const label    = clefNames[idx] + (isOctave ? "'" : '');
          const isTonic  = i === 0 || isOctave;
          return (
            <g key={i}>
              <rect x={6} y={y - 6} width={14} height={12}
                fill={black ? '#1a1a2e' : '#ffffff'}
                stroke={mismatch ? '#c94f1e' : isTonic ? '#c94f1e' : '#888'}
                strokeWidth={mismatch || isTonic ? 1.5 : 0.8} rx={1}
              />
              <text x={26} y={y + 4}
                textAnchor="start" fontSize={10} fontFamily="monospace"
                fill={mismatch ? '#c94f1e' : isTonic ? '#c94f1e' : black ? '#1a1a2e' : '#555'}
                fontWeight={black || mismatch || isTonic ? 'bold' : 'normal'}
              >
                {label}
              </text>
              <text x={AXIS_W - 6} y={y + 4}
                textAnchor="end" fontSize={10} fontFamily="monospace"
                fill={i === 6 ? '#1a1a2e' : isTonic ? '#c94f1e' : '#aaa'}
                fontWeight={i === 6 || isTonic ? 'bold' : 'normal'}
              >
                {isOctave ? "0'" : i}
              </text>
            </g>
          );
        })}

        {/* Clef label — sits below the D key (interval 0) */}
        <text x={6} y={axisKeyY(0, layout) + 16}
          fontSize={8} fontFamily="monospace" fill="#c94f1e"
        >
          {clefTonic} clef
        </text>

        {/* Right border to separate axis from staff */}
        <line x1={AXIS_W - 1} y1={0} x2={AXIS_W - 1} y2={svgHeight}
          stroke="#d8d4c8" strokeWidth={1} />
      </svg>

      {/* ── Scrollable staff ── */}
      <div ref={scrollRef} style={{ overflowX: 'auto', flex: 1 }}>
        <svg
          width={staffWidth} height={svgHeight}
          style={{ display: 'block', background: bg }}
        >
          {/* Shaded outer spaces */}
          <rect x={0} y={L5} width={staffWidth} height={OUTER_SPACE} fill="#e8eeff" opacity={0.6} />
          <rect x={0} y={L2} width={staffWidth} height={OUTER_SPACE} fill="#e8eeff" opacity={0.6} />

          {/* Staff lines */}
          {[L1, L2, L4, L5].map((y, i) => (
            <line key={i} x1={0} y1={y} x2={staffWidth} y2={y}
              stroke="#b0aaa0" strokeWidth={1} />
          ))}
          <line x1={0} y1={L3} x2={staffWidth} y2={L3}
            stroke="#1a1a2e" strokeWidth={2.5} />

          {/* Note heads */}
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
                {isActive && <circle cx={x} cy={y} r={NOTE_R + 5} fill="#ffd700" opacity={0.35} />}
                {isActive && <circle cx={x} cy={y} r={NOTE_R + 3} fill="none" stroke="#ffd700" strokeWidth={2} opacity={0.9} />}
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
      </div>
    </div>
  );
}
