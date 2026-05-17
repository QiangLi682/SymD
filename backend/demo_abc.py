"""Quick demo — parse an ABC file and print its SymD intervals."""
import sys
sys.path.insert(0, ".")
from parsers.abc_parser import parse_abc

path = sys.argv[1] if len(sys.argv) > 1 else "samples/speed_the_plough.abc"
result = parse_abc(path)

print(f"Title  : Speed the Plough")
print(f"Tonic  : {result['tonic']}")
print(f"Meter  : {result['time_signature']}")
print(f"Notes  : {len([n for n in result['notes'] if not n['rest']])} notes\n")

print(f"{'#':<4} {'Note':<6} {'Interval':>8} {'Staff pos':>10} {'Duration':>9} {'Offset':>8}")
print("-" * 52)

real_notes = [n for n in result["notes"] if not n["rest"]]
for i, n in enumerate(real_notes[:32]):   # first 32 notes
    print(f"{i+1:<4} {n['note']:<6} {n['interval']:>8} {n['staff_position']:>10} {n['duration']:>9.2f} {n['offset']:>8.2f}")

if len(real_notes) > 32:
    print(f"  ... and {len(real_notes) - 32} more notes")
