from music21 import converter, note, chord, stream
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from engine import note_to_interval, interval_to_staff_position


def parse_abc(source: str, tonic: str = None) -> dict:
    """
    Parse ABC notation (string or file path) and return SymD interval data.

    If tonic is None, music21's key detection is used.
    Returns the data contract dict consumed by the frontend renderer.
    """
    score = converter.parse(source)

    # Key / tonic detection
    if tonic is None:
        detected = score.analyze("key")
        tonic = detected.tonic.name

    time_sig = "4/4"
    ts = score.recurse().getElementsByClass("TimeSignature").first()
    if ts:
        time_sig = f"{ts.numerator}/{ts.denominator}"

    notes = []
    for part_idx, part in enumerate(score.parts):
        for element in part.flatten().notesAndRests:
            if isinstance(element, note.Rest):
                notes.append({
                    "rest": True,
                    "duration": float(element.duration.quarterLength),
                    "offset": float(element.offset),
                    "voice": part_idx,
                })
            elif isinstance(element, note.Note):
                interval = note_to_interval(element.pitch.name, tonic)
                notes.append({
                    "rest": False,
                    "note": element.pitch.nameWithOctave,
                    "interval": interval,
                    "staff_position": interval_to_staff_position(interval),
                    "duration": float(element.duration.quarterLength),
                    "offset": float(element.offset),
                    "voice": part_idx,
                })
            elif isinstance(element, chord.Chord):
                for p in element.pitches:
                    interval = note_to_interval(p.name, tonic)
                    notes.append({
                        "rest": False,
                        "note": p.nameWithOctave,
                        "interval": interval,
                        "staff_position": interval_to_staff_position(interval),
                        "duration": float(element.duration.quarterLength),
                        "offset": float(element.offset),
                        "voice": part_idx,
                    })

    notes.sort(key=lambda n: n["offset"])

    # Extract title from ABC metadata (T: field) if present
    title = ""
    try:
        if score.metadata and score.metadata.title:
            title = score.metadata.title
    except Exception:
        pass

    return {
        "title": title,
        "tonic": tonic,
        "time_signature": time_sig,
        "notes": notes,
    }
