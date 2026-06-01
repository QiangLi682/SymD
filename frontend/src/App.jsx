import { useState, useRef } from 'react';
import SymDStaff from './components/SymDStaff';
import { playSymD } from './playback';
import twinkle from './data/twinkle_symd.json';
import bach   from './data/bach_bwv133_symd.json';

const BUILT_IN_SONGS = [
  { id: 'twinkle', label: 'Twinkle Twinkle', data: twinkle },
  { id: 'bach',    label: 'Bach BWV 133.6',  data: bach   },
];

const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function App() {
  const [songs, setSongs]             = useState(BUILT_IN_SONGS);
  const [songId, setSongId]           = useState('twinkle');
  const [playing, setPlaying]         = useState(false);
  const [bpm, setBpm]                 = useState(120);
  const [currentBeat, setCurrentBeat] = useState(null);
  const [clefTonic, setClefTonic]     = useState('D');

  // Upload state
  const [uploadFile, setUploadFile]   = useState(null);
  const [uploadTonic, setUploadTonic] = useState('');   // '' = auto-detect
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | loading | error
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const stopRef     = useRef(null);
  const timerRef    = useRef(null);
  const intervalRef = useRef(null);

  const song      = songs.find(s => s.id === songId);
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

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploadStatus('loading');
    setUploadError('');

    try {
      const form = new FormData();
      form.append('file', uploadFile);
      if (uploadTonic) form.append('tonic', uploadTonic);

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Upload failed');
      }

      const data = await res.json();
      if (!data.notes || data.notes.length === 0) {
        throw new Error('No notes detected — try a clearer image of printed sheet music');
      }

      // Add the uploaded song to the list and select it
      const id = `upload_${Date.now()}`;
      setSongs(prev => [...prev, { id, label: data.title, data }]);
      setSongId(id);
      setUploadStatus('idle');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setUploadStatus('error');
      setUploadError(e.message);
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', background: '#f7f6f1', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>SymD Staff Renderer</h1>

      {/* Song selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <label htmlFor="song-select" style={{ fontSize: 13, color: '#555' }}>Song:</label>
        <select
          id="song-select"
          value={songId}
          onChange={e => handleSelectSong(e.target.value)}
          style={{
            fontSize: 13, padding: '5px 10px', borderRadius: 6,
            border: '1px solid #ccc', background: '#fff', cursor: 'pointer',
          }}
        >
          {songs.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
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
        {playing && <span style={{ fontSize: 13, color: '#2d5be3' }}>Playing...</span>}
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

      {/* Staff */}
      <div style={{ paddingBottom: 16 }}>
        <SymDStaff
          notes={song.data.notes}
          tonic={song.data.tonic}
          currentBeat={currentBeat}
          clefTonic={clefTonic}
        />
      </div>

      {/* Upload section */}
      <div style={{
        marginTop: 32, padding: '20px 24px', borderRadius: 8,
        border: '1px solid #ddd', background: '#fff', maxWidth: 520,
      }}>
        <h2 style={{ fontSize: 15, margin: '0 0 12px', color: '#1a1a2e' }}>
          Upload Sheet Music
        </h2>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 1.5 }}>
          <strong>MusicXML</strong> (.xml, .mxl) — export from MuseScore, Finale, Sibelius<br/>
          <strong>MIDI</strong> (.mid) — from any DAW or music software<br/>
          <strong>ABC</strong> (.abc) — plain text notation
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* File picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.mxl,.musicxml,.mid,.midi,.abc"
              onChange={e => setUploadFile(e.target.files[0] || null)}
              style={{ fontSize: 13, flex: 1 }}
            />
          </div>

          {/* Tonic selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>
              Key (tonic):
            </label>
            <select
              value={uploadTonic}
              onChange={e => setUploadTonic(e.target.value)}
              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
            >
              <option value="">Auto-detect</option>
              {CHROMATIC.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: '#aaa' }}>
              Set manually if auto-detect is wrong
            </span>
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!uploadFile || uploadStatus === 'loading'}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 24px', fontSize: 13, borderRadius: 6, border: 'none',
              cursor: uploadFile && uploadStatus !== 'loading' ? 'pointer' : 'not-allowed',
              background: uploadFile && uploadStatus !== 'loading' ? '#2d5be3' : '#bbb',
              color: 'white', fontWeight: 600,
            }}
          >
            {uploadStatus === 'loading' ? 'Analyzing... (please wait)' : 'Analyze & Add to Staff'}
          </button>

          {/* Status messages */}
          {uploadStatus === 'error' && (
            <p style={{ fontSize: 12, color: '#c94f1e', margin: 0 }}>
              Error: {uploadError}
            </p>
          )}
          {uploadStatus === 'loading' && (
            <p style={{ fontSize: 12, color: '#2d5be3', margin: 0 }}>
              Parsing... usually done in 1–2 seconds.
            </p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 24, fontSize: 13, color: '#555' }}>
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
