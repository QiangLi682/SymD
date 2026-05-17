import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from parsers.abc_parser import parse_abc

SAMPLES = os.path.join(os.path.dirname(__file__), "..", "samples")

TWINKLE_ABC = """X:1
T:Test
M:4/4
L:1/4
K:C
C C G G | A A G2 |
"""

MINOR_ABC = """X:1
T:Test Minor
M:4/4
L:1/4
K:Am
A B c d |
"""

# ── return shape ──────────────────────────────────────────────────────────────

def test_returns_required_keys():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    assert "tonic" in result
    assert "time_signature" in result
    assert "notes" in result

def test_notes_is_list():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    assert isinstance(result["notes"], list)
    assert len(result["notes"]) > 0

def test_each_note_has_required_fields():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    for n in result["notes"]:
        assert "rest" in n
        assert "duration" in n
        assert "offset" in n
        if not n["rest"]:
            assert "interval" in n
            assert "staff_position" in n
            assert "note" in n

# ── interval correctness ──────────────────────────────────────────────────────

def test_tonic_note_is_interval_0():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    c_notes = [n for n in result["notes"] if not n["rest"] and n["note"].startswith("C")]
    assert all(n["interval"] == 0 for n in c_notes)

def test_g_is_interval_7_in_c():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    g_notes = [n for n in result["notes"] if not n["rest"] and n["note"].startswith("G")]
    assert all(n["interval"] == 7 for n in g_notes)

def test_a_is_interval_9_in_c():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    a_notes = [n for n in result["notes"] if not n["rest"] and n["note"].startswith("A")]
    assert all(n["interval"] == 9 for n in a_notes)

def test_intervals_in_range():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    for n in result["notes"]:
        if not n["rest"]:
            assert 0 <= n["interval"] <= 11

def test_staff_positions_in_range():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    for n in result["notes"]:
        if not n["rest"]:
            assert 1 <= n["staff_position"] <= 12

# ── ordering and duration ─────────────────────────────────────────────────────

def test_notes_sorted_by_offset():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    offsets = [n["offset"] for n in result["notes"]]
    assert offsets == sorted(offsets)

def test_duration_is_positive():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    for n in result["notes"]:
        assert n["duration"] > 0

# ── tonic and key ─────────────────────────────────────────────────────────────

def test_explicit_tonic_respected():
    result = parse_abc(TWINKLE_ABC, tonic="G")
    assert result["tonic"] == "G"
    # C in G = interval 5 (perfect fourth)
    c_notes = [n for n in result["notes"] if not n["rest"] and n["note"].startswith("C")]
    assert all(n["interval"] == 5 for n in c_notes)

def test_auto_key_detection_returns_string():
    result = parse_abc(TWINKLE_ABC)   # no tonic provided
    assert isinstance(result["tonic"], str)
    assert len(result["tonic"]) >= 1

def test_time_signature_parsed():
    result = parse_abc(TWINKLE_ABC, tonic="C")
    assert result["time_signature"] == "4/4"

# ── file-based parsing ────────────────────────────────────────────────────────

def test_parse_abc_file():
    path = os.path.join(SAMPLES, "twinkle.abc")
    result = parse_abc(path, tonic="C")
    assert len(result["notes"]) > 0
    assert result["tonic"] == "C"

def test_file_note_count_matches_score():
    path = os.path.join(SAMPLES, "twinkle.abc")
    result = parse_abc(path, tonic="C")
    real_notes = [n for n in result["notes"] if not n["rest"]]
    # Twinkle has 48 quarter-note beats across 3 lines (12 bars x 4 beats)
    # but some are half notes — count actual note events not beats
    assert len(real_notes) >= 36


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
