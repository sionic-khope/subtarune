#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# uv run assets/source/captain122/prepare.py
"""Repack intact generated cells and resize the door without repainting pixels."""
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
X: Final = (80, 356, 632, 908, 1184)
Y: Final = (0, 320, 624, 928, 1264)
CELL: Final = 352


def main() -> None:
    """Keep full pigtails outside the generator's nominal equal quarter grid."""
    with Image.open(ROOT / "eunbyeol/raw-sheet.png") as source:
        atlas = Image.new("RGBA", (CELL * 4, CELL * 4))
        for row in range(4):
            for col in range(4):
                frame = source.crop((X[col], Y[row], X[col + 1], Y[row + 1]))
                at = (col * CELL + (CELL - frame.width) // 2,
                      row * CELL + (CELL - frame.height) // 2)
                atlas.paste(frame, at)
        atlas.save(ROOT / "eunbyeol/raw-grid.png")
    with Image.open(ROOT / "door/raw.png") as source:
        rgba = source.convert("RGBA")
        bounds = rgba.getchannel("A").point(lambda alpha: 255 if alpha > 32 else 0).getbbox()
        assert bounds is not None
        cropped = rgba.crop(bounds)
        scale = min(184 / cropped.width, 180 / cropped.height)
        size = (round(cropped.width * scale), round(cropped.height * scale))
        pixels = cropped.resize(size, Image.Resampling.NEAREST)
        door = Image.new("RGBA", (192, 192))
        door.paste(pixels, ((192 - size[0]) // 2, 188 - size[1]))
        door.save(ROOT / "door/captain_door.png")
        door.save(ROOT.parents[1] / "props/captain_door.png")


if __name__ == "__main__":
    main()
