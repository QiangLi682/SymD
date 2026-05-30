"""Export a Bach piece from music21 corpus to SymD JSON for the frontend."""
import json, os, sys
sys.path.insert(0, ".")
from music21 import corpus
from engine import note_to_interval, interval_to_staff_position

TONIC = "D"
PIECE = "bach/bwv133.6"   # Chorale in D major, 15 measures

score = corpus.parse(PIECE)

# Use the Soprano part (index 0 or labeled 'Soprano')
soprano = None
for part in score.parts:
    if 'Soprano' in (part.partName or ''):
        soprano = part
        break
if soprano is None:
    soprano = score.parts[0]

flat = soprano.flatten().notesAndRests

notes = []
for el in flat:
    offset  = float(el.offset)
    dur     = float(el.duration.quarterLength)
    if dur == 0:
        continue

    if el.isRest:
        notes.append({"rest": True, "offset": offset, "duration": dur})
        continue

    # Chord: take the top note (soprano voice)
    if el.isChord:
        p = el.pitches[-1]
    else:
        p = el.pitch

    name     = p.name          # e.g. "C", "D#", "F#"
    interval = note_to_interval(name, TONIC)
    sp       = interval_to_staff_position(interval)

    notes.append({
        "note":           name,
        "interval":       interval,
        "staff_position": sp,
        "offset":         offset,
        "duration":       dur,
        "rest":           False,
    })

# Sort by offset so the staff renders left-to-right.
notes.sort(key=lambda n: n["offset"])

result = {
    "title":          "Bach Chorale BWV 133.6 — Ich freue mich in dir (D major)",
    "tonic":          TONIC,
    "time_signature": "4/4",
    "notes":          notes,
}

out = os.path.join("..", "frontend", "src", "data", "bach_bwv133_symd.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(result, f, indent=2)

real = [n for n in notes if not n["rest"]]
print(f"Written {len(real)} notes ({len(notes)} total incl. rests) to {out}")
