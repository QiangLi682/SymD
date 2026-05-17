import * as Tone from 'tone';

// Tonic name → MIDI number (octave 4 as base)
const TONIC_MIDI = {
  'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
  'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71,
};

/**
 * Play a SymD note list through the browser.
 * Returns { stop, totalSec } — call stop() to cancel early.
 */
export async function playSymD(notes, tonic, bpm = 120) {
  await Tone.start();

  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.4 },
    volume: -6,
  }).toDestination();

  const tonicMidi = TONIC_MIDI[tonic] ?? 60;
  const secPerBeat = 60 / bpm;
  const now = Tone.now() + 0.05;

  const realNotes = notes.filter(n => !n.rest);
  realNotes.forEach(n => {
    const midi = tonicMidi + n.interval;
    const freq = Tone.Frequency(midi, 'midi').toFrequency();
    const startTime = now + n.offset * secPerBeat;
    const dur = Math.max(n.duration * secPerBeat * 0.88, 0.05); // slight gap between notes
    synth.triggerAttackRelease(freq, dur, startTime);
  });

  const last = realNotes.at(-1);
  const totalSec = last ? (last.offset + last.duration) * secPerBeat : 0;

  return {
    stop: () => synth.dispose(),
    totalSec,
  };
}
