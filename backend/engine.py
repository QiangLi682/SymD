from music21 import pitch

# 13 vertical staff positions (0 = bottom, 12 = top).
# Intervals 0 and 12 both represent the tonic (octave apart) — tonic sits at top.
INTERVAL_TO_STAFF_POSITION = {
    0:   1,   # tonic — ledger space below bottom line
    1:   2,   # on L1 (bottom line)
    2:   3,   # outer space L1-L2, lower slot
    3:   4,   # outer space L1-L2, upper slot (mediant)
    4:   5,   # on L2
    5:   6,   # inner space L2-L3
    6:   7,   # on L3 — tritone, center line (bold)
    7:   8,   # inner space L3-L4
    8:   9,   # on L4
    9:  10,   # outer space L4-L5, lower slot (mediant)
    10: 11,   # outer space L4-L5, upper slot
    11: 12,   # on L5 (top line)
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
