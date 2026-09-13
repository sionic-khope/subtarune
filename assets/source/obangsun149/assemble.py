#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/
# Run: uv run output/sprites/obangsun149/assemble.py
# ──────────────────
from __future__ import annotations

from pathlib import Path
from typing import Final
import json

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
DIRECTIONS: Final = ("down", "up", "left", "right")
SOURCE_ROWS: Final = (0, 3, 1, 2)
ROW_Y: Final = (4, 7, 4, 4)


def main() -> None:
    atlas = Image.new("RGBA", (256, 256))
    bounds: list[tuple[int, int, int, int] | None] = []
    with Image.open(ROOT / "processed" / "raw-sheet-clean.png") as raw:
        for row, direction in enumerate(DIRECTIONS):
            frames: list[Image.Image] = []
            strip = Image.new("RGBA", (256, 64))
            for column in range(4):
                left, top = column * 313, SOURCE_ROWS[row] * 313
                source = raw.crop((left, top, left + 313, top + 313))
                scaled = source.resize((60, 60), Image.Resampling.NEAREST)
                frame = Image.new("RGBA", (64, 64))
                frame.paste(scaled, (2, ROW_Y[row]))
                frame.save(ROOT / f"{direction}-{column}.png")
                bounds.append(frame.getbbox())
                frames.append(frame)
                strip.paste(frame, (column * 64, 0))
            strip.save(ROOT / f"{direction}-strip.png")
            frames[0].save(ROOT / f"{direction}.gif", save_all=True,
                           append_images=frames[1:], duration=160, loop=0,
                           disposal=2, optimize=False)
            atlas.paste(strip, (0, row * 64))
    atlas.save(ROOT / "obangsun.png")
    preview = Image.new("RGBA", atlas.size, (58, 48, 68, 255))
    preview.alpha_composite(atlas)
    preview.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / "preview.png")
    qc = {"sheet_size": [256, 256], "cell_size": [64, 64],
          "engine_rows": DIRECTIONS, "frame_count": 16, "pivot": [32, 61],
          "source_cell": [313, 313], "uniform_resize": [60, 60],
          "resampling": "NEAREST", "row_paste_y": ROW_Y,
          "bounds": bounds, "empty_frames": [i for i, box in enumerate(bounds) if box is None],
          "edge_touch_frames": [i for i, box in enumerate(bounds)
                                if box and (box[0] <= 0 or box[1] <= 0
                                            or box[2] >= 64 or box[3] >= 64)]}
    (ROOT / "final-qc.json").write_text(json.dumps(qc, indent=2) + "\n")


if __name__ == "__main__":
    main()
