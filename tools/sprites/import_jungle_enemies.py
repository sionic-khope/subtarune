#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow==12.3.0", "numpy==2.5.3"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# Run: uv run tools/sprites/import_jungle_enemies.py
# ──────────────────
"""Rebuild six static jungle enemy exports from preserved generated artwork."""

from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from tools.sprites.slice_sheet import key_cell

SOURCE: Final = ROOT / "assets/source/jungle-enemies-v1"
REFERENCE: Final = (
    "https://www.tarreo.com/noticias/479844/"
    "El-Escurridizo-ha-causado-que-Castigo-sea-el-hechizo-mas-jugado-del-momento-y-traera-cambios"
)


@dataclass(frozen=True, slots=True)
class View:
    suffix: str
    size: int
    role: str
    facing: str


VIEWS: Final = (View("front", 48, "field", "front"), View("battle-left", 64, "battle", "left"))
SPECIES: Final = ("raptor", "gromp", "wolf")


def main() -> None:
    """Key, fit and export source silhouettes without repainting their colors."""
    records = []
    for species in SPECIES:
        for view in VIEWS:
            slug = f"{species}-{view.suffix}"
            source = SOURCE / f"{slug}-raw.png"
            prompt = SOURCE / f"{slug}-prompt.txt"
            with Image.open(source) as raw:
                rgb = np.asarray(raw.convert("RGB")).astype(np.int64)
            pixels = np.array(key_cell(rgb))
            magenta = (rgb[..., 0] > rgb[..., 1] + 20) & (rgb[..., 2] > rgb[..., 1] + 20)
            pixels[magenta] = 0
            keyed = Image.fromarray(pixels)
            bounds = keyed.getbbox()
            assert bounds is not None, f"Empty source: {slug}"
            left, top, right, bottom = bounds
            assert 0 < left < right < keyed.width and 0 < top < bottom < keyed.height, slug
            pivot = (view.size // 2, view.size - 4)
            scale = min((view.size - 8) / (right - left), (view.size - 8) / (bottom - top))
            size = (max(1, round((right - left) * scale)), max(1, round((bottom - top) * scale)))
            placement = ((view.size - size[0]) // 2, pivot[1] - size[1])
            sprite = keyed.crop(bounds).resize(size, Image.Resampling.NEAREST)
            frame = Image.new("RGBA", (view.size, view.size))
            frame.paste(sprite, placement)
            output_bounds = frame.getbbox()
            assert output_bounds is not None, slug
            x0, y0, x1, y1 = output_bounds
            assert 0 < x0 < x1 < view.size and 0 < y0 < y1 < view.size, slug
            image = ROOT / "assets/enemies" / f"jungle-{slug}.png"
            image.parent.mkdir(parents=True, exist_ok=True)
            frame.save(image)
            records.append({
                "id": f"jungle-{slug}",
                "species": species,
                "image": image.relative_to(ROOT).as_posix(),
                "role": view.role,
                "facing": view.facing,
                "size": [view.size, view.size],
                "frameCount": 1,
                "frameRect": [0, 0, view.size, view.size],
                "pivot": pivot,
                "source": source.relative_to(ROOT).as_posix(),
                "prompt": prompt.relative_to(ROOT).as_posix(),
                "sourceBounds": bounds,
                "scale": scale,
                "resized": size,
                "placement": placement,
                "alphaBounds": output_bounds,
                "sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
            })
    metadata = {
        "version": 1,
        "status": "static-assets-not-wired",
        "pathBase": "repository-root",
        "generator": "built-in image_gen",
        "reference": {"url": REFERENCE, "role": "visual reference only; generated derivative sprites"},
        "processing": "Edge-connected chromakey plus magenta-only residual removal (R > G+20 and B > G+20); whole silhouette fit; bottom-center alignment; NEAREST only.",
        "paletteQuantization": False,
        "artworkRepainted": False,
        "reproduce": "uv run tools/sprites/import_jungle_enemies.py",
        "assets": records,
    }
    (SOURCE / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
