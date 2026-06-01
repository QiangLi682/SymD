"""
SymD FastAPI backend
Run with:  py -m uvicorn api:app --reload --port 8000
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from parsers.score_parser import parse_score
from parsers.abc_parser   import parse_abc

app = FastAPI(title="SymD API")

# Allow the Vite dev server (port 5173/5174) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

SCORE_EXTS = {".xml", ".mxl", ".musicxml", ".mid", ".midi"}
ABC_EXTS   = {".abc"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload(
    file:  UploadFile = File(...),
    tonic: str        = Form(None),
):
    """
    Accept an image, MusicXML, or MIDI file and return SymD JSON.
    - Images  → oemer OMR pipeline
    - MusicXML / MIDI → music21 reads directly (faster, no OMR)
    """
    filename = file.filename or "upload"
    suffix   = Path(filename).suffix.lower()

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    tonic_arg = tonic if tonic else None

    try:
        if suffix in ABC_EXTS:
            import tempfile, shutil
            tmp = tempfile.mkdtemp()
            try:
                p = os.path.join(tmp, filename)
                with open(p, "wb") as f:
                    f.write(file_bytes)
                result = parse_abc(p, tonic=tonic_arg)
                if not result.get("title"):
                    result["title"] = Path(filename).stem
            finally:
                shutil.rmtree(tmp, ignore_errors=True)
        elif suffix in SCORE_EXTS:
            result = parse_score(file_bytes, filename, tonic=tonic_arg)
        else:
            accepted = sorted(SCORE_EXTS | ABC_EXTS)
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{suffix}'. Accepted: {', '.join(accepted)}",
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
