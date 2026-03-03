"""
Tamil Gaming Video Aggregation Platform — AI Classification Service
FastAPI + CLIP microservice

Endpoints:
  GET  /health    — liveness probe
  GET  /genres    — list of supported genres
  POST /classify  — classify a video by thumbnail + text
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from classifier import GENRE_PROMPTS, get_classifier

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai-service")


# ── Lifespan: pre-load model on startup ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("⏳ Pre-loading CLIP model...")
    get_classifier()  # Warms up singleton
    logger.info("✅ CLIP model ready")
    yield
    logger.info("Shutting down AI service")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TGVAP AI Classification Service",
    description="OpenAI CLIP-based Tamil gaming video genre classifier",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────
class ClassifyRequest(BaseModel):
    thumbnail_url: Optional[str] = None
    title: str = ""
    description: str = ""


class ClassifyResponse(BaseModel):
    genre: str
    score: float
    all_scores: Dict[str, float]


class GenreSyncItem(BaseModel):
    genre: str
    prompts: List[str]

class GenreSyncRequest(BaseModel):
    genres: List[GenreSyncItem]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
async def health():
    """Liveness probe — returns 200 if the service is up and model is loaded."""
    try:
        clf = get_classifier()
        genres_loaded = len(clf._genre_embeddings)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Model not ready: {exc}")
    return {
        "status": "ok",
        "model": "openai/clip-vit-base-patch32",
        "genres_loaded": genres_loaded,
    }


@app.get("/genres", tags=["meta"])
async def list_genres():
    """Return the list of genres the classifier supports."""
    clf = get_classifier()
    return {
        "genres": list(clf.genre_prompts.keys()),
        "count": len(clf.genre_prompts),
    }


@app.post("/genres/sync", tags=["meta"])
async def sync_genres(body: GenreSyncRequest):
    """Update and re-encode genres from the database."""
    try:
        clf = get_classifier()
        clf.update_genres(body.model_dump()["genres"])
        return {"status": "success", "count": len(clf._genre_embeddings)}
    except Exception as exc:
        logger.exception("Sync failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/classify", response_model=ClassifyResponse, tags=["classification"])
async def classify(body: ClassifyRequest):
    """
    Classify a Tamil gaming video into a genre using CLIP.

    - **thumbnail_url**: Full YouTube thumbnail URL (optional but strongly recommended)
    - **title**: Video title (used as secondary signal)
    - **description**: First 200 chars of video description (optional)
    """
    if not body.thumbnail_url and not body.title:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one of: thumbnail_url, title",
        )

    try:
        clf = get_classifier()
        result = clf.classify(
            thumbnail_url=body.thumbnail_url or "",
            title=body.title,
            description=body.description,
        )
    except Exception as exc:
        logger.exception("Classification failed")
        raise HTTPException(status_code=500, detail=str(exc))

    return ClassifyResponse(**result)
