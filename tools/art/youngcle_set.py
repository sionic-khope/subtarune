#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# uv run tools/art/youngcle_set.py
# ──────────────────
"""Paint the blue steel interior shell; the floor remains transparent."""
from pathlib import Path
from typing import Final

from painter import Canvas

OUT: Final = (10, 19, 35)
NAVY: Final = (21, 43, 72)
PANEL: Final = (29, 66, 105)
EDGE: Final = (63, 108, 150)
STEEL: Final = (111, 146, 174)
BLUE: Final = (51, 143, 181)

walls: Final = Canvas(1344, 576)
walls.rect(0, 0, 1344, 192, OUT)
walls.rect(16, 16, 1312, 168, NAVY)
for x in range(32, 1312, 128):
    for y in (24, 100):
        walls.rect(x, y, 120, 68, OUT)
        walls.rect(x + 2, y + 2, 116, 64, PANEL)
        walls.rect(x + 2, y + 2, 116, 2, EDGE)
        for bolt_x in (x + 8, x + 110):
            for bolt_y in (y + 8, y + 57):
                walls.rect(bolt_x, bolt_y, 3, 3, STEEL)
for y in (88, 176):
    walls.rect(16, y, 1312, 8, OUT)
    walls.rect(16, y + 1, 1312, 2, STEEL)
    walls.rect(16, y + 4, 1312, 3, EDGE)
for x in (0, 1312):
    walls.rect(x, 192, 32, 320, OUT)
    walls.rect(x + 8, 192, 16, 320, NAVY)
    walls.rect(x + 10, 192, 3, 320, EDGE)
walls.rect(0, 512, 1344, 64, OUT)
walls.rect(24, 512, 1296, 4, STEEL)
walls.rect(24, 516, 1296, 12, NAVY)
walls.rect(624, 504, 96, 24, OUT)
walls.rect(628, 508, 88, 16, EDGE)
walls.rect(632, 510, 80, 3, STEEL)
for y in (224, 480):
    walls.rect(32, y, 1280, 3, NAVY)
    walls.rect(32, y + 3, 1280, 2, BLUE)
for x in (620, 720):
    walls.rect(x, 229, 3, 275, NAVY)
    walls.rect(x + 3, 229, 2, 275, BLUE)
walls.save(Path('assets/props/youngcle1_walls.png'))
