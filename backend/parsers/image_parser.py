"""
OMR image parser: image file → SymD JSON
Pipeline: oemer (detects notes) → MusicXML → music21 → engine.py → SymD
"""
import os
import sys
import shutil
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from engine import note_to_interval, interval_to_staff_position


def parse_image(image_bytes: bytes, filename: str, tonic: str = None) -> dict:
    """
    Run oemer OMR on an uploaded image, then convert to SymD JSON.

    Args:
        image_bytes: raw bytes of the uploaded image
        filename:    original filename (used for the title and extension)
        tonic:       e.g. "C", "D", "G" — if None, music21 auto-detects it

    Returns:
        dict with keys: title, tonic, time_signature, notes
    """
    suffix = Path(filename).suffix.lower() or ".png"
    tmp_dir = tempfile.mkdtemp(prefix="symd_omr_")
    img_path = os.path.join(tmp_dir, f"input{suffix}")
    out_dir  = os.path.join(tmp_dir, "output")
    os.makedirs(out_dir, exist_ok=True)

    try:
        # 1. Write image to disk so oemer can read it
        with open(img_path, "wb") as f:
            f.write(image_bytes)

        # 2. Run oemer OMR → MusicXML
        #    oemer.ete.main() reads from sys.argv, so we set it before calling.
        import sys as _sys
        _old_argv = _sys.argv
        _sys.argv = ["oemer", img_path, "-o", out_dir]
        try:
            from oemer.ete import main as oemer_main
            oemer_main()
        finally:
            _sys.argv = _old_argv

        # 3. Find the MusicXML file oemer created
        xml_files = list(Path(out_dir).rglob("*.xml")) + list(Path(out_dir).rglob("*.mxl"))
        if not xml_files:
            raise RuntimeError("oemer produced no MusicXML output — is the image a clear, printed score?")
        xml_path = str(xml_files[0])

        # 4. Parse MusicXML with music21
        from music21 import converter
        score = converter.parse(xml_path)

        # 5. Detect tonic from key signature if not provided by the user
        if tonic is None:
            detected = score.analyze("key")
            tonic = detected.tonic.name   # e.g. "C", "D", "F#"

        # 6. Extract time signature
        ts_list = list(score.flatten().getElementsByClass("TimeSignature"))
        if ts_list:
            ts = ts_list[0]
            time_sig = f"{ts.numerator}/{ts.denominator}"
        else:
            time_sig = "4/4"

        # 7. Extract notes and convert to SymD
        flat  = score.flatten().notesAndRests
        notes = []
        for el in flat:
            offset = float(el.offset)
            dur    = float(el.duration.quarterLength)
            if dur == 0:
                continue

            if el.isRest:
                notes.append({"rest": True, "offset": offset, "duration": dur})
                continue

            # Chord: take the top (highest) pitch — soprano voice
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
        return {
            "title":          f"Uploaded: {stem}",
            "tonic":          tonic,
            "time_signature": time_sig,
            "notes":          notes,
        }

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
