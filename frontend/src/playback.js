import * as Tone from 'tone';

const TONIC_MIDI = {
  'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
  'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71,
};

// Salamander Grand Piano — loaded once, reused across plays.
let samplerReady = null;
let sampler      = null;

function getSampler() {
  if (samplerReady) return samplerReady;

  samplerReady = new Promise((resolve, reject) => {
    sampler = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
        A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
        A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
        A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
        A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
        A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
        A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
        A7: 'A7.mp3', C8: 'C8.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload:  () => resolve(sampler),
      onerror: reject,
    }).toDestination();
  });

  return samplerReady;
}

export async function playSymD(notes, tonic, bpm = 120) {
  await Tone.start();
  const piano = await getSampler();

  // Stop and clear any previous playback before starting new one
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  piano.releaseAll();

  const tonicMidi  = TONIC_MIDI[tonic] ?? 60;
  const secPerBeat = 60 / bpm;

  const realNotes = notes.filter(n => !n.rest);

  // Schedule every note through the Transport so stop() cancels them all
  realNotes.forEach(n => {
    const midi     = tonicMidi + n.interval;
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    const dur      = Math.max(n.duration * secPerBeat * 0.9, 0.05);
    const offset   = n.offset * secPerBeat;   // seconds from Transport start

    Tone.getTransport().schedule((time) => {
      piano.triggerAttackRelease(noteName, dur, time);
    }, offset);
  });

  Tone.getTransport().start();

  const last     = realNotes.at(-1);
  const totalSec = last ? (last.offset + last.duration) * secPerBeat : 0;

  return {
    stop: () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      piano.releaseAll();
    },
    totalSec,
  };
}
