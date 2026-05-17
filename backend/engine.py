from music21 import pitch

# 13 vertical staff positions (0 = bottom, 12 = top).
# Intervals 0 and 12 both represent the tonic (octave apart) — tonic sits at top.
INTERVAL_TO_STAFF_POSITION = {
    0:  12,   # tonic
    1:  11,
    2:  10,
    3:   9,   # mediant
    4:   8,
    5:   7,
    6:   6,   # tritone — center line (bold)
    7:   5,
    8:   4,
    9:   3,   # mediant
    10:  2,
    11:  1,
}


def note_to_interval(note_name: str, tonic_name: str) -> int:
    """Return the SymD interval (0–11) for a note relative to a tonic."""
    n = pitch.Pitch(note_name)
    t = pitch.Pitch(tonic_name)
    return (n.midi - t.midi) % 12


def interval_to_staff_position(interval: int) -> int:
    """Map a SymD interval (0–11) to a staff position (1–12)."""
    return INTERVAL_TO_STAFF_POSITION[interval % 12]


def notes_to_symd(note_names: list[str], tonic_name: str) -> list[dict]:
    """Convert a list of note names to SymD interval + staff position data."""
    result = []
    for name in note_names:
        interval = note_to_interval(name, tonic_name)
        result.append({
            "note": name,
            "interval": interval,
            "staff_position": interval_to_staff_position(interval),
        })
    return result
