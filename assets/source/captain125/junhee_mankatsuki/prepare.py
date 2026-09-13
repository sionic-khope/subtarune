#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# uv run assets/source/captain125/junhee_mankatsuki/prepare.py
"""Remove only exterior checkerboard, preserving enclosed white cloud outlines."""

from __future__ import annotations

from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image, ImageDraw

ROOT: Final = Path(__file__).resolve().parent


def main() -> None:
    with Image.open(ROOT / "raw-sheet.png") as source:
        rgba = np.array(source.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    candidate = (rgb.min(axis=2) > 120) & (np.ptp(rgb, axis=2) < 35)
    mask = Image.fromarray(candidate.astype(np.uint8) * 255).copy()
    ImageDraw.floodfill(mask, (0, 0), 128)
    rgba[np.array(mask) == 128] = 0
    Image.fromarray(rgba).save(ROOT / "raw-grid.png")


if __name__ == "__main__":
    main()
