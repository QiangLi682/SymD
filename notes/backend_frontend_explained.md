# Backend vs Frontend — How They Work Together

## The Big Picture

```
Browser (React/JS)          Internet          Server (Python/FastAPI)
──────────────────          ───────           ───────────────────────
Shows the UI           ←── JSON data ──←     Processes the music file
User clicks buttons    ──── file ────→→      Parses ABC / MusicXML
Draws the SVG staff                          Runs the conversion engine
Plays the audio                              Returns interval numbers
```

The browser and Python **never touch each other's code** — they only talk through
**HTTP requests**, the same protocol your browser uses to load any web page.

---

## How Data Travels: Step by Step

In the full SymD app (once M5 is built), the flow will be:

```
1. User drops an ABC file into the browser
        ↓
2. React sends the file to Python via HTTP POST
   POST https://your-server.com/convert
   Body: { file content, tonic: "C" }
        ↓
3. Python receives it, runs your engine:
   abc_parser.py  →  engine.py  →  builds the JSON
        ↓
4. Python sends JSON back in the HTTP response:
   { "tonic": "C", "notes": [ {interval:0, duration:1.0}, ... ] }
        ↓
5. React receives the JSON, passes it to <SymDStaff notes={...} />
        ↓
6. SVG draws on screen, Tone.js plays audio
```

---

## Right Now in the Project (M1–M3)

No HTTP yet — Python ran once offline to produce a file:

```
export_sample.py (Python)
   runs once → writes twinkle_symd.json to disk
                         ↓
App.jsx imports the JSON directly at build time:
   import twinkle from './data/twinkle_symd.json'
                         ↓
<SymDStaff notes={twinkle.notes} />
```

The browser reads a baked-in file — no running server needed.

---

## What Changes When Backend Is Added (M5)

**React side** — instead of importing a fixed file, call Python live:

```js
// Current (hardcoded file)
import twinkle from './data/twinkle_symd.json';

// Future (live API call)
const response = await fetch('http://localhost:8000/convert', {
  method: 'POST',
  body: formData,   // the ABC file the user uploaded
});
const result = await response.json();  // Python's JSON arrives here
```

**Python side** — FastAPI exposes a route:

```python
@app.post("/convert")
async def convert(file: UploadFile, tonic: str = None):
    content = await file.read()
    result = parse_abc(content, tonic)   # existing parser
    return result                         # FastAPI converts dict → JSON automatically
```

---

## Summary Table

|                | Frontend (React/JS)         | Backend (Python)              |
|----------------|-----------------------------|-------------------------------|
| **Runs in**    | User's browser              | A server (local or cloud)     |
| **Handles**    | UI, drawing, audio          | File parsing, math, computation |
| **Language**   | JavaScript                  | Python                        |
| **Talks via**  | `fetch()` HTTP calls        | FastAPI routes (`@app.post`)  |
| **Data format**| JSON                        | JSON (same — this is the bridge) |

**JSON is the universal translator** — Python `dict` becomes JSON,
JavaScript reads it as an object. Both sides speak JSON so the language
difference doesn't matter.

---

## SymD Call Chain (current)

```
export_sample.py
  └── parse_abc("samples/twinkle.abc", tonic="C")   ← abc_parser.py:13
        └── note_to_interval()                        ← engine.py
              └── (note_midi - tonic_midi) % 12       ← the core math
```
