"""M1 demo — hardcoded note list → SymD intervals printed to console."""
from engine import notes_to_symd

TONIC = "C"

# A simple melody: C major scale + a few chromatic notes
NOTES = ["C", "D", "E", "F", "G", "A", "B",
         "C#", "F#", "Bb", "Gb"]   # Gb = enharmonic of F#

print(f"Tonic: {TONIC}\n")
print(f"{'Note':<6} {'Interval':>8} {'Staff pos':>10}   Staff visualization")
print("-" * 56)

results = notes_to_symd(NOTES, TONIC)
for r in results:
    bar = "-" * (r["staff_position"] - 1) + "*"
    center = " <- tritone" if r["interval"] == 6 else ""
    center += " <- tonic" if r["interval"] == 0 else ""
    print(f"{r['note']:<6} {r['interval']:>8} {r['staff_position']:>10}   {bar}{center}")
