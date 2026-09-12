#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# uv run tools/art/maillard_hold_set.py
# ──────────────────
"""Timber hull walls, lower boarding hatch and rightward interior stairs."""
from pathlib import Path
from typing import Final

from painter import Canvas

OUT: Final = (24, 17, 19)
DARK: Final = (54, 33, 30)
WOOD: Final = (94, 55, 37)
LIGHT: Final = (134, 82, 46)
EDGE: Final = (173, 117, 65)
IRON: Final = (60, 58, 58)


def prop_walls() -> Canvas:
    """Draw the enclosed hull silhouette around an empty walkable floor."""
    art = Canvas(960, 448)
    art.rect(0, 0, 960, 160, OUT)
    art.rect(16, 56, 928, 104, DARK)
    for y in range(64, 152, 16):
        art.rect(28, y, 904, 13, WOOD)
        art.rect(28, y, 904, 2, LIGHT)
        for x in range(28 + ((y // 16) % 2) * 64, 932, 128):
            art.rect(x, y, 2, 13, DARK)
    for x in range(24, 960, 128):
        art.rect(x, 48, 16, 112, OUT)
        art.rect(x + 2, 48, 12, 108, DARK)
        art.rect(x + 3, 50, 2, 104, LIGHT)
        for y in (64, 128):
            art.rect(x + 2, y, 12, 7, IRON)
            art.rect(x + 5, y + 2, 2, 2, EDGE)
    art.rect(16, 150, 928, 10, OUT)
    art.rect(24, 150, 912, 3, LIGHT)
    for x in (0, 928):
        art.rect(x, 152, 32, 248, OUT)
        art.rect(x + 8, 160, 16, 224, DARK)
        art.rect(x + 10, 160, 3, 224, LIGHT)
    art.rect(0, 384, 960, 64, OUT)
    art.rect(24, 384, 912, 3, EDGE)
    art.rect(24, 387, 912, 12, WOOD)
    art.rect(24, 399, 912, 3, DARK)
    return art


def prop_hatch() -> Canvas:
    """A recessed timber boarding opening, kept behind emerging characters."""
    art = Canvas(64, 48)
    art.rect(0, 0, 64, 48, OUT)
    art.rect(2, 2, 60, 44, LIGHT)
    art.rect(7, 7, 50, 34, OUT)
    art.rect(11, 11, 42, 26, DARK)
    for y in (16, 26, 36):
        art.rect(16, y, 32, 3, WOOD)
        art.rect(16, y, 32, 1, EDGE)
    art.rect(3, 2, 58, 2, EDGE)
    return art


def prop_stairs() -> Canvas:
    """Six steps rise right into a dark hatch, without exterior scenery."""
    art = Canvas(96, 80)
    art.rect(64, 0, 32, 80, OUT)
    art.rect(66, 3, 6, 74, WOOD)
    art.rect(66, 3, 2, 72, EDGE)
    for step in range(6):
        x = step * 11
        y = 25 - step * 4
        art.rect(x, y, 13, 52 + step * 4, OUT)
        art.rect(x + 1, y + 2, 10, 46 + step * 4, WOOD)
        art.rect(x + 1, y + 2, 10, 2, EDGE)
        art.rect(x + 1, y + 5, 2, 42 + step * 4, LIGHT)
    art.rect(0, 76, 66, 4, DARK)
    return art


for name, canvas in (
    ('walls', prop_walls()), ('hatch', prop_hatch()), ('stairs', prop_stairs()),
):
    canvas.save(Path(f'assets/props/maillard_hold_{name}.png'))
