#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from the repository root: uv run tools/art/youngcle6_set.py
# ──────────────────
"""Paint a compact shell with the first Youngcle room's native blue steel panels."""
from __future__ import annotations

from pathlib import Path
from typing import Final

from painter import Canvas

OUT: Final = (10, 19, 35)
NAVY: Final = (21, 43, 72)
PANEL: Final = (29, 66, 105)
EDGE: Final = (63, 108, 150)
STEEL: Final = (111, 146, 174)
BLUE: Final = (51, 143, 181)


def main() -> None:
    """Write the room shell, keeping its walkable floor and west passage transparent."""
    walls = Canvas(640, 448)
    walls.rect(0, 0, 640, 192, OUT)
    walls.rect(16, 16, 608, 168, NAVY)
    for x in range(32, 608, 128):
        width = min(120, 608 - x)
        for y in (24, 100):
            walls.rect(x, y, width, 68, OUT)
            walls.rect(x + 2, y + 2, width - 4, 64, PANEL)
            walls.rect(x + 2, y + 2, width - 4, 2, EDGE)
            for bolt_x in (x + 8, x + width - 10):
                for bolt_y in (y + 8, y + 57):
                    walls.rect(bolt_x, bolt_y, 3, 3, STEEL)
    for y in (88, 176):
        walls.rect(16, y, 608, 8, OUT)
        walls.rect(16, y + 1, 608, 2, STEEL)
        walls.rect(16, y + 4, 608, 3, EDGE)
    for x, y, height in ((0, 192, 96), (0, 352, 64), (608, 192, 224)):
        walls.rect(x, y, 32, height, OUT)
        walls.rect(x + 8, y, 16, height, NAVY)
        walls.rect(x + 10, y, 3, height, EDGE)
    walls.rect(0, 416, 640, 32, OUT)
    walls.rect(24, 416, 592, 4, STEEL)
    walls.rect(24, 420, 592, 12, NAVY)
    for y in (224, 384):
        walls.rect(32, y, 576, 3, NAVY)
        walls.rect(32, y + 3, 576, 2, BLUE)
    walls.save(Path('assets/props/youngcle6_walls.png'))


if __name__ == '__main__':
    main()
