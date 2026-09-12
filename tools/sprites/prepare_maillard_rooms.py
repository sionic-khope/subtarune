#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# From repository root: uv run tools/sprites/prepare_maillard_rooms.py
# ──────────────────
"""Assemble existing timber wall slices and a sparse steel room enclosure."""
from __future__ import annotations

from pathlib import Path
import sys
from typing import Final

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'art'))
from painter import Canvas

PROPS: Final = Path('assets/props')


def main() -> None:
    """Keep timber pixels intact and paint only deterministic steel surfaces."""
    with Image.open(PROPS / 'maillard_hold_walls.png') as source:
        walls = Image.new('RGBA', (1440, 448))
        for y, band_height in ((0, 160), (384, 64)):
            for x in range(32, 1408, 128):
                span = min(128, 1408 - x)
                walls.paste(source.crop((32, y, 32 + span, y + band_height)), (x, y))
            walls.paste(source.crop((0, y, 32, y + band_height)), (0, y))
            walls.paste(source.crop((928, y, 960, y + band_height)), (1408, y))
        walls.paste(source.crop((0, 160, 32, 384)), (0, 160))
        walls.paste(source.crop((928, 160, 960, 384)), (1408, 160))
        walls.save(PROPS / 'maillard_saloon_interior.png')

    steel = Canvas(480, 448)
    steel.rect(0, 0, 480, 448, (20, 23, 27))
    steel.rect(32, 160, 416, 224, (57, 63, 69))
    for y in range(160, 384, 32):
        steel.hline(32, y, 416, (49, 55, 61))
        for x in range(32 + (32 if y % 64 else 0), 448, 64):
            steel.vline(x, y + 1, 31, (49, 55, 61))
    steel.rect(24, 56, 432, 96, (73, 81, 89))
    for x in range(24, 456, 64):
        steel.vline(x, 56, 96, (42, 48, 55))
        for y in (63, 142):
            steel.rect(x + 5, y, 2, 2, (99, 107, 113))
    steel.rect(24, 152, 432, 8, (39, 45, 51))
    steel.hline(24, 151, 432, (101, 109, 115))
    for x in (24, 448):
        steel.rect(x, 160, 8, 224, (42, 48, 54))
        steel.vline(x + 2, 160, 224, (80, 88, 95))
    steel.rect(24, 384, 432, 16, (37, 43, 49))
    steel.hline(24, 384, 432, (86, 94, 102))
    steel.save(PROPS / 'maillard_storage_interior.png')


if __name__ == '__main__':
    main()
