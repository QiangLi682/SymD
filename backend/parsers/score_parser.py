"""
Score parser: MusicXML / MIDI → SymD JSON
music21 reads these formats natively — no OMR needed.
"""
import os
import sys
import shutil
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from engine import note_to_interval, interval_to_staff_position


def parse_score(file_bytes: bytes, filename: str, tonic: str = None) -> dict:
    """
    Parse a MusicXML or MIDI file and convert to SymD JSON.

    Args:
        file_bytes: raw bytes of the uploaded file
        filename:   original filename (extension determines format)
        tonic:      e.g. "C", "D" — if None, music21 auto-detects it

    Returns:
        dict with keys: title, tonic, time_signature, notes
    """
    suffix = Path(filename).suffix.lower()
    tmp_dir = tempfile.mkdtemp(prefix="symd_score_")
    file_path = os.path.join(tmp_dir, f"input{suffix}")

    try:
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        from music21 import converter
        score = converter.parse(file_path)

        # Detect tonic if not provided
        if tonic is None:
            detected = score.analyze("key")
            tonic = detected.tonic.name   # e.g. "C", "F#"

        # Time signature
        ts_list = list(score.flatten().getElementsByClass("TimeSignature"))
        if ts_list:
            ts = ts_list[0]
            time_sig = f"{ts.numerator}/{ts.denominator}"
        else:
            time_sig = "4/4"

        # For multi-part scores (MusicXML), use the top part (melody / soprano).
        # For MIDI with one track, flatten everything.
        if len(score.parts) > 1:
            flat = score.parts[0].flatten().notesAndRests
        else:
            flat = score.flatten().notesAndRests

        notes = []
        for el in flat:
            offset = float(el.offset)
            dur    = float(el.duration.quarterLength)
            if dur == 0:
                continue

            if el.isRest:
                notes.append({"rest": True, "offset": offset, "duration": dur})
                continue

            # Chord: take the highest pitch
            p = el.pitches[-1] if el.isChord else el.pitch

            name     = p.name
            interval = note_to_interval(name, tonic)
            sp       = interval_to_staff_position(interval)
            notes.append({
                "note":           name,
                "interval":       interval,
                "staff_position": sp,
                "offset":         offset,
                "duration":       dur,
                "rest":           False,
            })

        notes.sort(key=lambda n: n["offset"])

        stem = Path(filename).stem
        fmt  = "MIDI" if suffix in (".mid", ".midi") else "MusicXML"
        return {
            "title":          f"{fmt}: {stem}",
            "tonic":          tonic,
            "time_signature": time_sig,
            "notes":          notes,
        }

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
