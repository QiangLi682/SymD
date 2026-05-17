import { useState, useRef, useEffect } from 'react';
import SymDStaff, { BEAT_W, MARGIN_X } from './components/SymDStaff';
import { playSymD } from './playback';
import twinkle from './data/twinkle_symd.json';

function App() {
  const [playing, setPlaying]       = useState(false);
  const [bpm, setBpm]               = useState(120);
  const [currentBeat, setCurrentBeat] = useState(null);
  const stopRef     = useRef(null);
  const timerRef    = useRef(null);
  const intervalRef = useRef(null);
  const scrollRef   = useRef(null);

  // Auto-scroll to keep the active note centred in the container
  useEffect(() => {
    if (currentBeat === null || !scrollRef.current) return;
    const noteX = MARGIN_X + currentBeat * BEAT_W;
    const container = scrollRef.current;
    container.scrollLeft = Math.max(0, noteX - container.clientWidth / 2);
  }, [currentBeat]);

  const noteCount = twinkle.notes.filter(n => !n.rest).length;

  const handlePlay = async () => {
    const { stop, totalSec } = await playSymD(twinkle.notes, twinkle.tonic, bpm);
    stopRef.current = stop;
    setPlaying(true);

    // Track playback position in quarter-note beats.
    // Add 50 ms offset to match the Tone.js scheduling delay in playback.js.
    const secPerBeat = 60 / bpm;
    const startMs = Date.now() + 50;
    intervalRef.current = setInterval(() => {
      setCurrentBeat((Date.now() - startMs) / (secPerBeat * 1000));
    }, 40);

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setPlaying(false);
      setCurrentBeat(null);
    }, (totalSec + 0.5) * 1000);
  };

  const handleStop = () => {
    stopRef.current?.();
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setPlaying(false);
    setCurrentBeat(null);
  };

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', background: '#f7f6f1', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>SymD Staff Renderer — M3 Demo</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
        Tonic: <strong>{twinkle.tonic}</strong> &nbsp;|&nbsp;
        Meter: <strong>{twinkle.time_signature}</strong> &nbsp;|&nbsp;
        Notes: <strong>{noteCount}</strong>
        &nbsp;(Twinkle Twinkle — ABC to SymD)
      </p>

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <button
          onClick={playing ? handleStop : handlePlay}
          style={{
            padding: '8px 28px', fontSize: 14, cursor: 'pointer', borderRadius: 6, border: 'none',
            background: playing ? '#c94f1e' : '#1a1a2e', color: 'white', fontWeight: 600,
          }}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 8 }}>
          BPM: <strong style={{ minWidth: 28 }}>{bpm}</strong>
          <input
            type="range" min={60} max={200} value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            disabled={playing}
            style={{ width: 120 }}
          />
        </label>
        {playing && (
          <span style={{ fontSize: 13, color: '#2d5be3' }}>Playing...</span>
        )}
      </div>

      <div ref={scrollRef} style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <SymDStaff notes={twinkle.notes} tonic={twinkle.tonic} currentBeat={currentBeat} />
      </div>

      <div style={{ marginTop: 32, fontSize: 13, color: '#555' }}>
        <strong>Legend</strong>
        <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
          <span><span style={{ color: '#1a1a2e' }}>●</span> Regular interval</span>
          <span><span style={{ color: '#2d5be3' }}>●</span> Mediant (3 or 9) — shaded region</span>
          <span><span style={{ color: '#c94f1e' }}>●</span> Tritone (6) — center line</span>
        </div>
      </div>
    </div>
  );
}

export default App;
