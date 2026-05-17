"""Export ABC parser output to JSON for the frontend demo."""
import json, sys, os
sys.path.insert(0, ".")
from parsers.abc_parser import parse_abc

result = parse_abc("samples/twinkle.abc", tonic="C")
out = os.path.join("..", "frontend", "src", "data", "twinkle_symd.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(result, f, indent=2)
print(f"Written {len(result['notes'])} notes to {out}")
