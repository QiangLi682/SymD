import { useState, useRef } from 'react';
import SymDStaff from './components/SymDStaff';
import { playSymD } from './playback';
import twinkle from './data/twinkle_symd.json';
import bach   from './data/bach_bwv133_symd.json';

const SONGS = [
  { id: 'twinkle', label: 'Twinkle Twinkle', data: twinkle },
  { id: 'bach',    label: 'Bach BWV 133.6',  data: bach   },
];

function App() {
  const [songId, setSongId]           = useState('twinkle');
  const [playing, setPlaying]         = useState(false);
  const [bpm, setBpm]                 = useState(120);
  const [currentBeat, setCurrentBeat] = useState(null);
  const [clefTonic, setClefTonic]     = useState('D');
  const stopRef     = useRef(null);
  const timerRef    = useRef(null);
  const intervalRef = useRef(null);

  const song      = SONGS.find(s => s.id === songId);
  const noteCount = song.data.notes.filter(n => !n.rest).length;

  const handleSelectSong = (id) => {
    if (playing) handleStop();
    setSongId(id);
  };

  const handlePlay = async () => {
    const { stop, totalSec } = await playSymD(song.data.notes, song.data.tonic, bpm);
    stopRef.current = stop;
    setPlaying(true);

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
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>SymD Staff Renderer</h1>

      {/* Song selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#555', marginRight: 4 }}>Song:</span>
        {SONGS.map(s => (
          <button key={s.id} onClick={() => handleSelectSong(s.id)} style={{
            padding: '5px 16px', fontSize: 13, cursor: 'pointer', borderRadius: 6,
            border: '1px solid #ccc',
            background: songId === s.id ? '#1a1a2e' : '#fff',
            color:      songId === s.id ? 'white'   : '#444',
            fontWeight: songId === s.id ? 'bold'    : 'normal',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
        {song.data.title && <><strong>{song.data.title}</strong> &nbsp;|&nbsp;</>}
        Tonic: <strong>{song.data.tonic}</strong> &nbsp;|&nbsp;
        Meter: <strong>{song.data.time_signature}</strong> &nbsp;|&nbsp;
        Notes: <strong>{noteCount}</strong>
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
        <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
          Clef reference:
          {['D', 'C'].map(t => (
            <button key={t} onClick={() => setClefTonic(t)} style={{
              padding: '4px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4,
              border: '1px solid #ccc',
              background: clefTonic === t ? '#1a1a2e' : '#fff',
              color: clefTonic === t ? 'white' : '#555',
              fontWeight: clefTonic === t ? 'bold' : 'normal',
            }}>{t}</button>
          ))}
        </label>
      </div>

      <div style={{ paddingBottom: 16 }}>
        <SymDStaff
          notes={song.data.notes}
          tonic={song.data.tonic}
          currentBeat={currentBeat}
          clefTonic={clefTonic}
        />
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
