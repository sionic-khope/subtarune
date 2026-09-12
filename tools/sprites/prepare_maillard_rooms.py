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

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'art'))
from painter import Canvas

PROPS: Final = Path('assets/props')


def main() -> None:
    """Keep timber pixels intact and paint only deterministic steel surfaces."""
    with Image.open(PROPS / 'maillard_hold_walls.png') as source:
        walls = Image.new('RGBA', (736, 448))
        for y, band_height in ((0, 160), (384, 64)):
            for x in range(32, 704, 128):
                span = min(128, 704 - x)
                walls.paste(source.crop((32, y, 32 + span, y + band_height)), (x, y))
            walls.paste(source.crop((0, y, 32, y + band_height)), (0, y))
            walls.paste(source.crop((928, y, 960, y + band_height)), (704, y))
        walls.paste(source.crop((0, 160, 32, 384)), (0, 160))
        walls.paste(source.crop((928, 160, 960, 384)), (704, 160))
        door = ImageDraw.Draw(walls)
        door.rectangle((204, 380, 275, 399), fill=(43, 28, 23))
        door.rectangle((208, 382, 271, 395), fill=(146, 93, 53))
        door.line((208, 383, 271, 383), fill=(182, 130, 77), width=2)
        door.line((208, 394, 271, 394), fill=(86, 49, 30), width=2)
        door.rectangle((257, 387, 265, 389), fill=(220, 173, 81))
        for x in (200, 272):
            door.rectangle((x, 378, x + 7, 401), fill=(70, 45, 33))
            door.line((x + 1, 378, x + 1, 399), fill=(127, 84, 49), width=2)
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
    steel.rect(204, 380, 72, 20, (28, 33, 39))
    steel.rect(208, 382, 64, 14, (73, 81, 89))
    steel.hline(208, 382, 64, (113, 122, 130))
    steel.hline(208, 395, 64, (42, 48, 55))
    steel.rect(256, 387, 10, 3, (159, 166, 171))
    for x in (200, 272):
        steel.rect(x, 378, 8, 24, (42, 48, 54))
        steel.vline(x + 1, 378, 22, (101, 109, 115))
    steel.save(PROPS / 'maillard_storage_interior.png')


if __name__ == '__main__':
    main()
