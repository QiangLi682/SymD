import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine import note_to_interval, interval_to_staff_position, notes_to_symd

# ── note_to_interval ──────────────────────────────────────────────────────────

def test_all_12_intervals_from_c():
    cases = [
        ("C",  0),  ("C#", 1),  ("D",  2),  ("D#", 3),
        ("E",  4),  ("F",  5),  ("F#", 6),  ("G",  7),
        ("G#", 8),  ("A",  9),  ("A#", 10), ("B",  11),
    ]
    for note, expected in cases:
        assert note_to_interval(note, "C") == expected, f"{note} in C: expected {expected}"

def test_enharmonic_equivalents():
    assert note_to_interval("F#", "C") == note_to_interval("Gb", "C")
    assert note_to_interval("C#", "C") == note_to_interval("Db", "C")
    assert note_to_interval("A#", "C") == note_to_interval("Bb", "C")
    assert note_to_interval("D#", "C") == note_to_interval("Eb", "C")
    assert note_to_interval("G#", "C") == note_to_interval("Ab", "C")

def test_tonic_is_always_0():
    for tonic in ["C", "F#", "Bb", "G", "D"]:
        assert note_to_interval(tonic, tonic) == 0, f"tonic {tonic} should be interval 0"

def test_perfect_fifth_is_7():
    pairs = [("G", "C"), ("A", "D"), ("E", "A"), ("D", "G"), ("C", "F")]
    for note, tonic in pairs:
        assert note_to_interval(note, tonic) == 7, f"P5: {note} over {tonic}"

def test_tritone_is_6():
    assert note_to_interval("F#", "C") == 6
    assert note_to_interval("A", "Eb") == 6   # tritone above Eb is A (not Bb, which is P5)

def test_octave_wraps_to_0():
    assert note_to_interval("C5", "C4") == 0
    assert note_to_interval("G5", "G4") == 0

def test_non_c_tonic():
    assert note_to_interval("A", "F") == 4    # major third up from F
    assert note_to_interval("C", "G") == 5    # perfect fourth up from G
    assert note_to_interval("F#", "B") == 7   # perfect fifth up from B

# ── interval_to_staff_position ────────────────────────────────────────────────

def test_staff_position_range():
    for i in range(12):
        pos = interval_to_staff_position(i)
        assert 1 <= pos <= 12, f"interval {i} → position {pos} out of range"

def test_tritone_is_center():
    assert interval_to_staff_position(6) == 6

def test_tonic_is_top():
    assert interval_to_staff_position(0) == 12

def test_leading_tone_is_second():
    assert interval_to_staff_position(11) == 1

def test_staff_positions_are_unique():
    positions = [interval_to_staff_position(i) for i in range(12)]
    assert len(set(positions)) == 12, "every interval must map to a unique staff position"

# ── notes_to_symd ─────────────────────────────────────────────────────────────

def test_notes_to_symd_shape():
    results = notes_to_symd(["C", "E", "G"], "C")
    assert len(results) == 3
    for r in results:
        assert "note" in r and "interval" in r and "staff_position" in r

def test_notes_to_symd_c_major_chord():
    results = notes_to_symd(["C", "E", "G"], "C")
    assert results[0]["interval"] == 0   # root
    assert results[1]["interval"] == 4   # major third
    assert results[2]["interval"] == 7   # perfect fifth

def test_notes_to_symd_enharmonic_same_output():
    r1 = notes_to_symd(["F#"], "C")
    r2 = notes_to_symd(["Gb"], "C")
    assert r1[0]["interval"] == r2[0]["interval"]
    assert r1[0]["staff_position"] == r2[0]["staff_position"]


if __name__ == "__main__":
    import traceback
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL  {t.__name__}: {e}")
            traceback.print_exc()
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
