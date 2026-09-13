#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: install uv from https://docs.astral.sh/uv/ then
# uv run assets/source/captain125/gajaeman_shadow/prepare.py
"""Key the bright neutral checkerboard and repack intact generated poses."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
X: Final = (120, 365, 610, 855, 1100)
Y: Final = (0, 316, 632, 932, 1263)
CELL: Final = 352


def main() -> None:
    """Preserve the dark body and red eyes without morphology or recoloring."""
    with Image.open(ROOT / "raw-sheet.png") as source:
        rgba = np.array(source.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    background = (rgb.min(axis=2) > 120) & (np.ptp(rgb, axis=2) < 25)
    rgba[background, 3] = 0
    cleaned = Image.fromarray(rgba)
    cleaned.save(ROOT / "source-transparent.png")
    atlas = Image.new("RGBA", (CELL * 4, CELL * 4))
    for row in range(4):
        for col in range(4):
            frame = cleaned.crop((X[col], Y[row], X[col + 1], Y[row + 1]))
            atlas.paste(frame, (col * CELL + (CELL - frame.width) // 2,
                                row * CELL + (CELL - frame.height) // 2))
    atlas.save(ROOT / "raw-grid.png")
    manifest = {
        "source": "raw-sheet.png", "source_size": cleaned.size,
        "background": "RGB minimum >120 and channel range <25; alpha only",
        "background_pixels": int(background.sum()), "x_boundaries": X,
        "y_boundaries": Y, "repacked_cell": CELL,
        "resampling": "none", "morphology": "none",
    }
    _ = (ROOT / "prepare-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
