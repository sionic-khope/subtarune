#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "pydantic>=2", "typer"]
# ///
# uv run assets/source/captain125/junhee_point/export.py SOURCE_DIR DESTINATION
"""Export processor-measured original pixels through NEAREST sampling."""

from __future__ import annotations

import json
from pathlib import Path
from typing import ClassVar

import typer
from PIL import Image
from pydantic import BaseModel, ConfigDict


class Frame(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]
    output_size: tuple[int, int]
    paste_position: tuple[int, int]


class Sheet(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    cell_size: int
    rows: int
    cols: int
    duration: int
    frames: tuple[Frame, ...]


def main(source_dir: Path, destination: Path) -> None:
    sheet = Sheet.model_validate_json(
        (source_dir / "processed/pipeline-meta.json").read_text(),
    )
    frames: list[Image.Image] = []
    bounds: list[tuple[int, int, int, int] | None] = []
    atlas = Image.new("RGBA", (sheet.cell_size * sheet.cols, sheet.cell_size * sheet.rows))
    strip = Image.new("RGBA", (sheet.cell_size * len(sheet.frames), sheet.cell_size))
    with Image.open(source_dir / "processed/raw-sheet-clean.png") as source:
        for index, info in enumerate(sheet.frames):
            pixels = source.crop(info.source_box).crop(info.crop_bbox)
            frame = Image.new("RGBA", (sheet.cell_size, sheet.cell_size))
            frame.paste(pixels.resize(info.output_size, Image.Resampling.NEAREST), info.paste_position)
            frames.append(frame)
            bounds.append(frame.getbbox())
            row, col = divmod(index, sheet.cols)
            atlas.paste(frame, (col * sheet.cell_size, row * sheet.cell_size))
            strip.paste(frame, (index * sheet.cell_size, 0))
            frame.save(source_dir / f"frame-{index + 1}.png")
    atlas.save(source_dir / "sheet-transparent.png")
    strip.save(source_dir / "strip-transparent.png")
    strip.save(destination)
    frames[0].save(source_dir / "animation.gif", save_all=True, append_images=frames[1:],
                   duration=sheet.duration, loop=0, disposal=2, optimize=False)
    manifest = {
        "processor_metadata": "processed/pipeline-meta.json", "resampling": "NEAREST",
        "palette_quantization_png": False, "cell_size": sheet.cell_size,
        "frame_count": len(frames), "runtime_size": strip.size,
        "output_bounds": bounds, "runtime_layout": "horizontal strip",
    }
    _ = (source_dir / "export-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    typer.run(main)
