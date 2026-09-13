#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# uv run assets/source/youngcle138/export.py
# ──────────────────

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[3]
SOURCE: Final = ROOT / "assets/source/youngcle138"
DIRECTIONS: Final = ("down", "up", "left", "right")


def main() -> None:
    with Image.open(SOURCE / "processed/raw-sheet-clean.png") as cleaned:
        rows: list[list[Image.Image]] = []
        bounds: list[tuple[int, int, int, int]] = []
        for row in range(4):
            frames = [
                cleaned.crop((col * 384, row * 384, (col + 1) * 384, (row + 1) * 384))
                for col in range(4)
            ]
            frame_bounds = [frame.getbbox() for frame in frames]
            valid_bounds = [box for box in frame_bounds if box is not None]
            assert len(valid_bounds) == 4
            bounds.append(
                (
                    min(box[0] for box in valid_bounds),
                    min(box[1] for box in valid_bounds),
                    max(box[2] for box in valid_bounds),
                    max(box[3] for box in valid_bounds),
                )
            )
            rows.append(frames)
        shared_scale = min(
            53 / max(box[2] - box[0] for box in bounds),
            53 / max(box[3] - box[1] for box in bounds),
        )
        atlas = Image.new("RGBA", (256, 256))
        neutral_preview = Image.new("RGBA", (256, 64))
        output_bounds: list[tuple[int, int, int, int]] = []
        for row, frames in enumerate(rows):
            box = bounds[row]
            size = (
                round((box[2] - box[0]) * shared_scale),
                round((box[3] - box[1]) * shared_scale),
            )
            position = ((64 - size[0]) // 2, 59 - size[1])
            animation: list[Image.Image] = []
            for column, frame in enumerate(frames):
                output = Image.new("RGBA", (64, 64))
                output.paste(
                    frame.crop(box).resize(size, Image.Resampling.NEAREST), position
                )
                actual = output.getbbox()
                assert (
                    actual is not None and min(actual[:2]) > 0 and max(actual[2:]) < 64
                )
                output_bounds.append(actual)
                output.save(SOURCE / f"{DIRECTIONS[row]}-{column + 1}.png")
                atlas.paste(output, (column * 64, row * 64))
                animation.append(output)
            neutral_preview.paste(animation[0], (row * 64, 0))
            animation[0].save(
                SOURCE / f"{DIRECTIONS[row]}.gif",
                save_all=True,
                append_images=animation[1:],
                duration=150,
                disposal=2,
                loop=0,
                optimize=False,
            )
        atlas.save(SOURCE / "sheet-transparent.png")
        atlas.save(ROOT / "assets/sprites/youngcle.png")
        neutral_preview.resize((1024, 256), Image.Resampling.NEAREST).save(
            SOURCE / "four-direction-preview.png"
        )
        metadata = {
            "directions": DIRECTIONS,
            "cell_size": 64,
            "frame_count": 16,
            "raw_row_cuts": [0, 315, 622, 921, 1254],
            "raw_column_width": 313,
            "prepared_cell_size": 384,
            "common_row_bounds": bounds,
            "shared_scale": shared_scale,
            "baseline": 59,
            "output_bounds": output_bounds,
            "resampling": "NEAREST",
            "palette_quantization": False,
            "empty_frames": [],
            "output_edge_touch_frames": [],
        }
        _ = (SOURCE / "export-meta.json").write_text(
            json.dumps(metadata, indent=2) + "\n"
        )

    pants_source = ROOT / "assets/source/mankatsuki138"
    with Image.open(pants_source / "processed/raw-sheet-clean.png") as cleaned:
        box = (146, 317, 1108, 989)
        scale = min(28 / (box[2] - box[0]), 22 / (box[3] - box[1]))
        size = (round((box[2] - box[0]) * scale), round((box[3] - box[1]) * scale))
        output = Image.new("RGBA", (32, 32))
        output.paste(
            cleaned.crop(box).resize(size, Image.Resampling.NEAREST),
            ((32 - size[0]) // 2, (32 - size[1]) // 2),
        )
        output.save(pants_source / "underpants.png")
        output.save(ROOT / "assets/projectiles/mankatsuki-underpants.png")
        metadata = {
            "canvas_size": [32, 32],
            "source_bbox": box,
            "output_bbox": output.getbbox(),
            "uniform_scale": scale,
            "resampling": "NEAREST",
            "palette_quantization": False,
        }
        _ = (pants_source / "export-meta.json").write_text(
            json.dumps(metadata, indent=2) + "\n"
        )


if __name__ == "__main__":
    main()
