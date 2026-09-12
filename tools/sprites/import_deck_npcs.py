#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# uv run tools/sprites/import_deck_npcs.py [--prepare]
# ──────────────────
"""Package original references and generated pixels without repainting or quantization."""

from pathlib import Path
import sys
from typing import Final

from PIL import Image

SOURCE: Final = Path("assets/source/deck-npcs-v1")
WEMIX_ROWS: Final = (0, 374, 727, 1080, 1484)


def prepare() -> None:
    with Image.open(SOURCE / "wemix/raw-sheet.png") as source:
        atlas = Image.new("RGB", (416 * 4, 416 * 4), (255, 0, 255))
        for row in range(4):
            for column in range(4):
                cell = source.crop((column * 265, WEMIX_ROWS[row], (column + 1) * 265, WEMIX_ROWS[row + 1]))
                atlas.paste(cell, (column * 416 + (416 - cell.width) // 2, row * 416 + (416 - cell.height) // 2))
        atlas.save(SOURCE / "wemix/raw-grid.png")


def package() -> None:
    for name in ("chakgeom", "wemix"):
        with Image.open(SOURCE / name / "sheet-transparent.png") as sheet:
            sheet.save(Path("assets/sprites") / f"{name}.png")
    for name in ("parang", "norang"):
        with Image.open(SOURCE / "references" / f"{name}.png") as source:
            rgba = source.convert("RGBA")
            bounds = rgba.getchannel("A").getbbox()
            assert bounds is not None, name
            cropped = rgba.crop(bounds)
            size = (round(cropped.width * 48 / cropped.height), 48)
            cropped.resize(size, Image.Resampling.NEAREST).save(Path("assets/props") / f"{name}.png")


if __name__ == "__main__":
    if "--prepare" in sys.argv:
        prepare()
    else:
        package()
