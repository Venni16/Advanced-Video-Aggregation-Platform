"""
CLIP-based video genre classifier.

Loads openai/clip-vit-base-patch32, pre-encodes genre text prompts from the
seed data, then classifies videos by comparing their thumbnail image embedding
against each genre's text embeddings.
"""
from __future__ import annotations

import io
import logging
from functools import lru_cache
from typing import Dict, List, Optional

import numpy as np
import requests
import torch
from PIL import Image, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor

logger = logging.getLogger("classifier")

# ── Genre prompt table (mirrors database/seed.sql) ────────────────────────────
GENRE_PROMPTS: Dict[str, List[str]] = {
    "BGMI": [
        "BGMI Battlegrounds Mobile India gameplay Tamil",
        "BGMI Tamil gaming mobile battle royale",
        "Battlegrounds Mobile India Tamil match",
    ],
    "Free Fire": [
        "Free Fire Garena battle royale Tamil gaming",
        "Garena Free Fire Tamil gameplay",
        "Free Fire Tamil gaming mobile",
    ],
    "GTA V": [
        "GTA 5 Grand Theft Auto gameplay Tamil",
        "Grand Theft Auto V Tamil gaming video",
        "GTA V Tamil missions open world",
    ],
    "Minecraft": [
        "Minecraft building survival Tamil gaming",
        "Minecraft Tamil gameplay creative mode",
        "Minecraft Tamil YouTuber series",
    ],
    "Valorant": [
        "Valorant tactical shooter Tamil esports",
        "Valorant Tamil gameplay ranked match",
        "Valorant agent Tamil gaming",
    ],
    "Call of Duty": [
        "Call of Duty Warzone Tamil gaming",
        "COD Mobile Tamil gameplay",
        "Call of Duty Tamil match",
    ],
    "eSports": [
        "Tamil esports tournament competitive gaming",
        "esports Tamil team tournament match",
        "competitive gaming Tamil championship",
    ],
    "Streaming Commentary": [
        "Tamil gaming live stream commentary",
        "Tamil gamer live commentary streaming",
        "Tamil gaming stream talking commentary",
    ],
    "Reaction": [
        "Tamil reaction video",
        "Tamil YouTuber reacting to video",
        "Tamil commentary reaction",
    ],
    "Anime": [
        "Anime reaction Tamil",
        "Anime episode review Tamil",
        "Tamil anime community video",
    ],
    "Vlog": [
        "Tamil daily life vlog",
        "Tamil YouTuber travel vlog",
        "Tamil personal vlog video",
    ],
    "Horror": [
        "Horror game Tamil gameplay scary",
        "Tamil gamer playing horror game",
        "scary tamil gaming live stream",
    ],
    "Simulator": [
        "Simulator game Tamil gameplay",
        "Tamil gamer playing simulator",
        "Euro Truck Simulator Tamil gameplay",
    ],
    "Others": [
        "Tamil gaming YouTube video general",
        "Tamil game video gameplay",
        "Tamil gaming content creator",
    ],
}

MODEL_NAME = "openai/clip-vit-base-patch32"


class CLIPClassifier:
    """Singleton CLIP classifier with pre-encoded genre prompts."""

    def __init__(self, model_name: str = MODEL_NAME) -> None:
        logger.info(f"Loading CLIP model: {model_name}")
        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.model = CLIPModel.from_pretrained(model_name)
        self.model.eval()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        logger.info(f"CLIP model loaded on {self.device}")

        # Internal state for genres
        self.genre_prompts: Dict[str, List[str]] = GENRE_PROMPTS.copy()
        self._genre_embeddings: Dict[str, torch.Tensor] = {}
        self._encode_all_genres()

    def update_genres(self, new_genres: List[Dict[str, any]]) -> None:
        """Update current genres and re-encode. 
        new_genres: list of { "genre": str, "prompts": list[str] }
        """
        updated_prompts = { item["genre"]: item["prompts"] for item in new_genres }
        self.genre_prompts = updated_prompts
        self._encode_all_genres()
        logger.info(f"Sync complete: {len(self.genre_prompts)} genres active")

    def _encode_all_genres(self) -> None:
        """Pre-compute mean text embeddings for every genre."""
        self._genre_embeddings = {}
        with torch.no_grad():
            for genre, prompts in self.genre_prompts.items():
                if not prompts:
                    continue
                inputs = self.processor(
                    text=prompts,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=77,
                ).to(self.device)
                text_features = self.model.get_text_features(**inputs)
                # Normalise and average across prompts
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                self._genre_embeddings[genre] = text_features.mean(dim=0)
        logger.info(f"Pre-encoded {len(self._genre_embeddings)} genre embeddings")

    def _download_image(self, url: str, timeout: int = 10) -> Optional[Image.Image]:
        try:
            resp = requests.get(url, timeout=timeout, stream=True)
            resp.raise_for_status()
            return Image.open(io.BytesIO(resp.content)).convert("RGB")
        except (requests.RequestException, UnidentifiedImageError, OSError) as exc:
            logger.warning(f"Failed to download image from {url}: {exc}")
            return None

    def classify(
        self,
        thumbnail_url: str,
        title: str = "",
        description: str = "",
    ) -> Dict:
        """
        Classify a video into a genre.

        Returns:
            {
                "genre": str,
                "score": float,       # cosine similarity [0, 1]
                "all_scores": dict    # genre → score
            }
        """
        image = self._download_image(thumbnail_url) if thumbnail_url else None

        # ── Image embedding ────────────────────────────────────────────────────
        if image is not None:
            with torch.no_grad():
                img_inputs = self.processor(images=image, return_tensors="pt").to(self.device)
                img_features = self.model.get_image_features(**img_inputs)
                img_features = img_features / img_features.norm(dim=-1, keepdim=True)
        else:
            img_features = None

        # ── Text embedding (title + description) ──────────────────────────────
        combined_text = f"{title} {description[:200]}".strip()
        if combined_text:
            with torch.no_grad():
                txt_inputs = self.processor(
                    text=[combined_text],
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=77,
                ).to(self.device)
                txt_features = self.model.get_text_features(**txt_inputs)
                txt_features = txt_features / txt_features.norm(dim=-1, keepdim=True)
        else:
            txt_features = None

        # ── Combine embeddings ────────────────────────────────────────────────
        if img_features is not None and txt_features is not None:
            query = (0.7 * img_features + 0.3 * txt_features)
            query = query / query.norm(dim=-1, keepdim=True)
        elif img_features is not None:
            query = img_features
        elif txt_features is not None:
            query = txt_features
        else:
            return {"genre": "Others", "score": 0.0, "all_scores": {}}

        # ── Score against genres ──────────────────────────────────────────────
        all_scores: Dict[str, float] = {}
        with torch.no_grad():
            for genre, embedding in self._genre_embeddings.items():
                embedding = embedding.to(self.device)
                score = torch.cosine_similarity(query, embedding.unsqueeze(0)).item()
                all_scores[genre] = round(score, 4)

        best_genre = max(all_scores, key=lambda g: all_scores[g])
        best_score = all_scores[best_genre]

        return {
            "genre": best_genre,
            "score": best_score,
            "all_scores": all_scores,
        }


@lru_cache(maxsize=1)
def get_classifier() -> CLIPClassifier:
    """Lazy singleton — only loaded once on first request."""
    return CLIPClassifier()
