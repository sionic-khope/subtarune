#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# From repository root: uv run tools/sprites/prepare_lounge.py
# ──────────────────
"""Repeat the existing timber wall pixels around the larger lounge floor."""
from __future__ import annotations

from pathlib import Path
from typing import Final

from PIL import Image

WIDTH: Final = 1536
HEIGHT: Final = 640
TOP: Final = 160
BOTTOM: Final = 576


def main() -> None:
    """Reassemble border slices without redrawing or rescaling source pixels."""
    with Image.open("assets/props/maillard_hold_walls.png") as source:
        walls = Image.new("RGBA", (WIDTH, HEIGHT))
        for y, source_y, band_height in ((0, 0, TOP), (BOTTOM, 384, 64)):
            for x in range(32, WIDTH - 32, 128):
                span = min(128, WIDTH - 32 - x)
                walls.paste(source.crop((32, source_y, 32 + span, source_y + band_height)), (x, y))
            walls.paste(source.crop((0, source_y, 32, source_y + band_height)), (0, y))
            walls.paste(source.crop((928, source_y, 960, source_y + band_height)), (WIDTH - 32, y))
        for y in range(TOP, BOTTOM, 224):
            span = min(224, BOTTOM - y)
            walls.paste(source.crop((0, 160, 32, 160 + span)), (0, y))
            walls.paste(source.crop((928, 160, 960, 160 + span)), (WIDTH - 32, y))
        walls.paste(Image.new("RGBA", (32, 128)), (0, 384))
        walls.save(Path("assets/props/maillard_lounge_walls.png"))
    with Image.open("assets/source/maillard-lounge-v1/entrance/sheet-transparent.png") as entrance:
        bounds = entrance.getchannel("A").getbbox()
        assert bounds is not None
        entrance.crop(bounds).save(Path("assets/props/maillard_lounge_entrance.png"))


if __name__ == "__main__":
    main()
