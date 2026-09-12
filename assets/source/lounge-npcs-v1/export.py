#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "pydantic>=2", "typer"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# uv run assets/source/lounge-npcs-v1/export.py SOURCE_DIR --row-order 0,1,2,3
# ──────────────────
"""Export processor-measured frames using original pixels and nearest sampling."""

from __future__ import annotations

import json
from pathlib import Path
from typing import ClassVar, Final

import typer
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field

DIRECTIONS: Final = ("down", "up", "left", "right")


class Frame(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]
    output_size: tuple[int, int]
    paste_position: tuple[int, int]


class ProcessedSheet(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    cell_size: int = Field(gt=0)
    rows: int = Field(gt=0)
    cols: int = Field(gt=0)
    duration: int = Field(gt=0)
    frames: tuple[Frame, ...]


def main(source_dir: Path, row_order: str = "0,1,2,3") -> None:
    """Package generated poses; row order maps engine rows to source rows."""
    processed = source_dir / "processed"
    sheet = ProcessedSheet.model_validate_json((processed / "pipeline-meta.json").read_text())
    ordering = tuple(int(value) for value in row_order.split(","))
    if sorted(ordering) != list(range(sheet.rows)) or sheet.rows != 4 or sheet.cols != 4:
        raise typer.BadParameter("Expected one permutation of four source rows.")
    frames: list[Image.Image] = []
    with Image.open(processed / "raw-sheet-clean.png") as cleaned:
        for row in ordering:
            for column in range(sheet.cols):
                info = sheet.frames[row * sheet.cols + column]
                pixels = cleaned.crop(info.source_box).crop(info.crop_bbox)
                resized = pixels.resize(info.output_size, Image.Resampling.NEAREST)
                frame = Image.new("RGBA", (sheet.cell_size, sheet.cell_size))
                frame.paste(resized, info.paste_position)
                frames.append(frame)
    atlas = Image.new("RGBA", (sheet.cell_size * sheet.cols, sheet.cell_size * sheet.rows))
    frame_bounds: list[tuple[int, int, int, int]] = []
    for index, frame in enumerate(frames):
        bounds = frame.getbbox()
        if bounds is None or min(bounds[:2]) <= 0 or max(bounds[2:]) >= sheet.cell_size:
            raise typer.BadParameter(f"Frame {index} is empty or touches an output edge.")
        frame_bounds.append(bounds)
        row, column = divmod(index, sheet.cols)
        atlas.paste(frame, (column * sheet.cell_size, row * sheet.cell_size))
        frame.save(source_dir / f"{DIRECTIONS[row]}-{column + 1}.png")
    atlas.save(source_dir / "sheet-transparent.png")
    atlas.save(source_dir.parents[2] / "sprites" / f"{source_dir.name}.png")
    for row, direction in enumerate(DIRECTIONS):
        sequence = frames[row * sheet.cols : (row + 1) * sheet.cols]
        sequence[0].save(
            source_dir / f"{direction}.gif", save_all=True,
            append_images=sequence[1:], duration=sheet.duration,
            loop=0, disposal=2, optimize=False,
        )
    manifest = {
        "source": "raw-sheet.png", "processor_metadata": "processed/pipeline-meta.json",
        "resampling": "NEAREST", "palette_quantization_png": False,
        "engine_directions": DIRECTIONS, "source_row_order": ordering,
        "cell_size": sheet.cell_size, "atlas_size": atlas.size,
        "frame_count": len(frames), "output_bounds": frame_bounds,
        "output_edge_touch_frames": [], "empty_frames": [],
        "scope": "Crop, chromakey, shared-scale sampling, translation, atlas row reorder only.",
    }
    _ = (source_dir / "export-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    typer.echo(f"{source_dir.name}: {len(frames)} frames, {atlas.size}, edge-safe NEAREST export")


if __name__ == "__main__":
    typer.run(main)
