#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# uv run assets/source/captain125/mankatsuki_idle/prepare.py
"""Normalize whole-sheet resolution and repack complete battle poses at one scale."""

from __future__ import annotations

from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent.parent
CELL: Final = 704


def main() -> None:
    for name, rows, x_bounds in (
        ("mankatsuki_idle", 2, (0, 627, 1254)),
        ("mankatsuki_attack", 3, (0, 608, 1254)),
    ):
        with Image.open(ROOT / name / "raw-sheet.png") as source:
            normalized = source.convert("RGBA").resize((1254, rows * 627), Image.Resampling.NEAREST)
        atlas = Image.new("RGBA", (CELL * 2, CELL * rows), (255, 0, 255, 255))
        for row in range(rows):
            for col in range(2):
                frame = normalized.crop((x_bounds[col], row * 627, x_bounds[col + 1], (row + 1) * 627))
                atlas.paste(frame, (col * CELL + (CELL - frame.width) // 2,
                                    row * CELL + (CELL - frame.height) // 2))
        atlas.save(ROOT / name / "raw-grid.png")


if __name__ == "__main__":
    main()
