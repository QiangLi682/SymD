# SymD Converter — Agent Coding Guide

## Project Identity

**SymD (Symmetric Dodecaphonic Harmony)** is a music notation system patented by Yaodong Chen (US Patent 12,406,594 B2, Sep 2, 2025). This web app converts standard Western music notation into SymD notation.

**Core idea:** Instead of note names (C, D#, Bb), SymD uses interval numbers **0–11** measured from a chosen tonic, displayed on a symmetrical 5-line staff centered on the tritone (interval 6). No key signatures or accidentals needed.

---

## Architecture

Three independently testable layers:

```
Input Formats          Backend (Python)          Frontend (React)
─────────────          ────────────────          ────────────────
ABC notation     →     Input Parser        →     App Shell (upload, key selector)
MusicXML         →     Conversion Engine   →     SymD Staff Renderer (SVG)
MP3 / WAV        →     FastAPI REST API    →     Export (SVG / PDF)
```

**Data contract** (backend → frontend JSON):
```json
{
  "tonic": "C",
  "time_signature": "4/4",
  "notes": [
    { "interval": 0, "duration": 1.0, "offset": 0.0, "voice": 0 },
    { "interval": 7, "duration": 0.5, "offset": 1.0, "voice": 0 }
  ]
}
```

---

## Domain Knowledge — SymD System

### Interval Mapping (Western → SymD)
| Semitones from tonic | SymD Interval | Common name |
|---|---|---|
| 0 | 0 | Unison / Tonic |
| 1 | 1 | Minor 2nd |
| 2 | 2 | Major 2nd |
| 3 | 3 | Minor 3rd (mediant) |
| 4 | 4 | Major 3rd |
| 5 | 5 | Perfect 4th |
| 6 | 6 | Tritone (staff center) |
| 7 | 7 | Perfect 5th |
| 8 | 8 | Minor 6th |
| 9 | 9 | Major 6th (mediant) |
| 10 | 10 | Minor 7th |
| 11 | 11 | Major 7th |

**Core formula:** `interval = (note_midi - tonic_midi) % 12`

Enharmonic equivalents (F# and G♭) map to the same interval — always normalize via MIDI.

### SymD Staff Layout
The staff has **5 lines** with **asymmetric spacing** — outer gaps are wider than inner gaps:

```
Line 1  ──────────────  intervals: 11, 0, 1   (above top line space wider)
        [outer space]
Line 2  ──────────────  intervals: 9, 10
        [inner space]
Line 3  ══════════════  intervals: 5, 6, 7     ← CENTER LINE (tritone), bold
        [inner space]
Line 4  ──────────────  intervals: 3, 4
        [outer space]
Line 5  ──────────────  intervals: 1, 2, 3
```

**13 vertical positions** (0–12) map to intervals 0–11:
- Outer gaps (above line 1, below line 5) are 1.5–3× wider than inner gaps
- Intervals 3 & 9 (mediants) may be shaded per patent Fig. 8
- Line 3 (interval 6) is always bold

### Staff Position Map
```python
INTERVAL_TO_STAFF_POSITION = {
    0: 12,   # tonic — top ledger position
    1: 11,
    2: 10,
    3: 9,    # mediant (shade space)
    4: 8,
    5: 7,
    6: 6,    # tritone — center line (bold)
    7: 5,
    8: 4,
    9: 3,    # mediant (shade space)
    10: 2,
    11: 1,
}
```

---

## Tech Stack

| Role | Technology | Why |
|---|---|---|
| Frontend | React + SVG | SVG for precise staff drawing; React for state |
| Styling | Tailwind CSS | Fast prototyping, responsive |
| Backend API | Python + FastAPI | music21 runs in Python |
| Music parsing | music21 | Handles ABC, MusicXML, key detection, durations |
| Audio transcription | Spotify basic-pitch | Best open-source AMT model |
| PDF export | jsPDF (client) or Puppeteer (server) | SVG → PDF |
| Frontend hosting | Vercel | Free, one-command deploy |
| Backend hosting | Render | Free Python service tier |

---

## Project Structure

```
symd/
├── backend/
│   ├── main.py              # FastAPI app, /convert endpoint
│   ├── engine.py            # Core conversion logic (no I/O)
│   ├── parsers/
│   │   ├── abc_parser.py    # ABC → NoteList via music21
│   │   ├── xml_parser.py    # MusicXML → NoteList via music21
│   │   └── audio_parser.py  # MP3/WAV → NoteList via basic-pitch
│   └── tests/
│       └── test_engine.py   # Unit tests for every interval mapping
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── SymDStaff.jsx      # SVG staff renderer
│   │   │   ├── FileUpload.jsx
│   │   │   ├── KeySelector.jsx
│   │   │   └── IntervalPanel.jsx  # Educational reference
│   │   └── api.js                 # fetch wrapper for backend
│   └── package.json
└── agent.md
```

---

## Milestone Tracker

**Phases** are domains of work (engine, parsers, renderer, UI, polish).
**Milestones** are ordered delivery checkpoints — they interleave across phases by dependency, not by phase order.
Phase 2 (Input Parsers) is intentionally split across M2, M4, and M6 so you always have something runnable before adding the next parser.

```
Build order:
  Phase 1 ── M1  prove the math
  Phase 2 ── M2  ABC parser (enough to feed the renderer)
  Phase 3 ── M3  renderer    (needs M1 + M2 to test)
  Phase 2 ── M4  MusicXML    (same pipeline as M2)
  Phase 4 ── M5  full UI     (wraps M1–M4)
  Phase 2 ── M6  audio       (hardest; not needed to ship M1–M5)
  Phase 5 ── M7  polish
```

Update status as you go. Claude Code reads this to know where to pick up.

| ID | Phase | Milestone | Status | Notes |
|---|---|---|---|---|
| M1 | 1 — Engine | Hardcoded notes → SymD intervals printed to console | `[ ] not started` | |
| M2 | 2 — Parsers | ABC file parsed with music21, outputs SymD interval list | `[ ] not started` | |
| M3 | 3 — Renderer | SymD staff drawn in browser from interval JSON | `[ ] not started` | |
| M4 | 2 — Parsers | MusicXML input added via music21 | `[ ] not started` | |
| M5 | 4 — UI | File upload, key selector, SVG/PDF export working | `[ ] not started` | |
| M6 | 2 — Parsers | MP3/WAV transcription via basic-pitch with review step | `[ ] not started` | |
| M7 | 5 — Polish | Educational panel, side-by-side view, harmonic highlighting | `[ ] not started` | |

**Status values:** `[ ] not started` → `[~] in progress` → `[x] done`

---

## Development Phases & Current State

### Phase 1 — Core Conversion Engine (START HERE)
Build and fully test the math before touching any UI or I/O.

**Goal:** Given a note name and tonic, return the correct SymD interval (0–11).

```python
from music21 import pitch

def note_to_symd(note_name: str, tonic_name: str) -> int:
    note_pitch = pitch.Pitch(note_name)
    tonic_pitch = pitch.Pitch(tonic_name)
    return (note_pitch.midi - tonic_pitch.midi) % 12

# Expected outputs:
# note_to_symd('G', 'C')   → 7
# note_to_symd('F#', 'C')  → 6
# note_to_symd('Bb', 'C')  → 10
# note_to_symd('Gb', 'C')  → 6  (same as F#)
```

**M1 done when:** A hardcoded note list prints correct SymD intervals to console.

### Phase 2 — Input Parsers
Build in priority order: ABC → MusicXML → Audio (audio is significantly harder).

```python
# ABC parser target output
def parse_abc(abc_string: str, tonic: str) -> list[dict]:
    # Returns: [{"interval": 7, "duration": 1.0, "offset": 0.0}, ...]
```

### Phase 3 — SymD Staff Renderer
Standalone React component — accepts JSON note array, renders SVG staff.

```jsx
// Target interface
<SymDStaff notes={[{interval: 0, duration: 1.0}, ...]} width={800} />
```

### Phase 4 — App Shell & UI
File upload, key selector, export controls. Wire frontend to backend API.

### Phase 5 — Polish & Education
Interval hover tooltips, harmonic region highlighting, side-by-side comparison, embedded tutorial.

---

## Key Challenges

**Key detection:** Use music21's Krumhansl-Schmuckler (`stream.analyze('key')`). Always let user override — detection is imperfect.

**Polyphony:** Group simultaneous notes by offset. Stack chord notes vertically on the SVG staff. Data model must carry a `voice` or `chord_id` field.

**Staff spacing:** Outer gaps must be 1.5–3× wider than inner gaps (patent spec). Compute pixel positions from a constants object, not hardcoded numbers.

**Enharmonic normalization:** Always convert via MIDI (`.midi` property), never string-compare note names.

**Audio accuracy:** basic-pitch is good but imperfect on chords and fast passages. Add a note review step before conversion — never auto-convert audio without user confirmation.

**Rhythm preservation:** SymD only changes pitch representation. Preserve all durations, ties, beams, and time signatures exactly.

---

## Coding Rules for This Project

- **Engine first:** `engine.py` must have zero I/O — pure functions only. Tests run without a server.
- **Unit test every interval:** All 12 intervals × multiple tonics must be covered in `test_engine.py`.
- **SVG positions from constants:** Define `STAFF_LINE_Y` and `INTERVAL_Y_OFFSET` as constants — never hardcode pixel positions inline.
- **Backend returns NoteList, not SVG:** Frontend owns all rendering. Backend returns structured JSON only.
- **Key detection is always overridable:** Never silently apply auto-detected key — surface it in the UI with a visible override control.
- **Install:** `pip install music21` for backend. `npm create vite@latest frontend -- --template react` for frontend.

---

## Useful References

- music21 docs: web.mit.edu/music21/doc
- Spotify basic-pitch: basicpitch.spotify.com
- ABC notation: abcnotation.com
- MusicXML standard: musicxml.com
- SymD patent: US 12,406,594 B2 (Sep 2, 2025) — Yaodong Chen
