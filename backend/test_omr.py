"""
oemer OMR test script.
Usage:
  py test_omr.py                   # auto-generate a test image from Bach chorale
  py test_omr.py mysheet.png       # test with your own image
"""
import sys
import os
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))


def generate_test_image(out_path: str) -> bool:
    """Try to render the Bach chorale to PNG via music21 + MuseScore."""
    try:
        from music21 import corpus, environment
        # Point music21 at the MuseScore 3 executable
        us = environment.UserSettings()
        mscore = r"C:\Program Files\MuseScore 3\bin\MuseScore3.exe"
        if os.path.exists(mscore):
            us["musicxmlPath"]          = mscore
            us["musescoreDirectPNGPath"] = mscore
        print("Generating test image from Bach BWV 133.6 via music21...")
        score = corpus.parse("bach/bwv133.6")
        # Take just 4 measures of soprano so the image is small and clean
        soprano = None
        for part in score.parts:
            if "Soprano" in (part.partName or ""):
                soprano = part
                break
        if soprano is None:
            soprano = score.parts[0]
        excerpt = soprano.measures(1, 4)
        fp = excerpt.write("musicxml.png", fp=out_path)
        print(f"  Test image saved: {fp}")
        return True
    except Exception as e:
        print(f"  Could not auto-generate image: {e}")
        print("  (MuseScore may not be installed — provide your own image instead)")
        return False


def run_oemer(img_path: str, out_dir: str):
    """Run oemer OMR on img_path, write MusicXML to out_dir."""
    print(f"\nRunning oemer on: {img_path}")
    import sys as _sys
    _old = _sys.argv
    _sys.argv = ["oemer", img_path, "-o", out_dir]
    try:
        from oemer.ete import main as oemer_main
        oemer_main()
    finally:
        _sys.argv = _old


def parse_result(out_dir: str, tonic: str = None):
    """Parse the MusicXML oemer produced and print note summary."""
    xml_files = list(Path(out_dir).rglob("*.xml")) + list(Path(out_dir).rglob("*.mxl"))
    if not xml_files:
        print("ERROR: oemer produced no MusicXML output.")
        print("  The image may be too complex, low-resolution, or not sheet music.")
        return

    xml_path = str(xml_files[0])
    print(f"\nMusicXML output: {xml_path}")

    from music21 import converter
    score = converter.parse(xml_path)

    detected_key = score.analyze("key")
    if tonic is None:
        tonic = detected_key.tonic.name
    print(f"Detected key:    {detected_key}  (using tonic = {tonic})")

    from engine import note_to_interval, interval_to_staff_position
    flat       = score.flatten().notesAndRests
    real_notes = [el for el in flat if not el.isRest]
    print(f"Total notes:     {len(real_notes)}")

    print("\nFirst 20 notes (note → SymD interval):")
    print(f"  {'Note':<8} {'Interval':>8} {'Name':<12} {'Duration':>8}")
    print("  " + "-" * 40)

    INTERVAL_NAMES = [
        "Tonic", "min 2", "maj 2", "min 3", "maj 3", "P4",
        "Tritone", "P5",   "min 6", "maj 6", "min 7", "maj 7",
    ]

    for el in real_notes[:20]:
        p        = el.pitches[-1] if el.isChord else el.pitch
        interval = note_to_interval(p.name, tonic)
        name     = INTERVAL_NAMES[interval]
        dur      = float(el.duration.quarterLength)
        print(f"  {p.nameWithOctave:<8} {interval:>8}  {name:<12} {dur:>8.2f} beats")


def main():
    tmp_dir = tempfile.mkdtemp(prefix="symd_omr_test_")
    out_dir = os.path.join(tmp_dir, "output")
    os.makedirs(out_dir)

    keep = "--keep" in sys.argv
    try:
        if len(sys.argv) >= 2 and not sys.argv[1].startswith("--"):
            img_path = sys.argv[1]
            if not os.path.exists(img_path):
                print(f"File not found: {img_path}")
                sys.exit(1)
        else:
            # Try to generate a test image automatically
            img_path = os.path.join(tmp_dir, "test_bach.png")
            ok = generate_test_image(img_path)
            if not ok:
                print("\nProvide a sheet music image:")
                print("  py test_omr.py mysheet.png")
                sys.exit(1)
            if not os.path.exists(img_path):
                # music21 may have added suffix
                candidates = list(Path(tmp_dir).glob("test_bach*"))
                if candidates:
                    img_path = str(candidates[0])
                else:
                    print("Image generation failed — provide your own image.")
                    sys.exit(1)

        run_oemer(img_path, out_dir)
        parse_result(out_dir)

    finally:
        if keep:
            print(f"\nTemp files kept at: {tmp_dir}")
        else:
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
