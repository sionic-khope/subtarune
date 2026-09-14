#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow>=11", "pydantic>=2"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run output/sprites/og-four-direction-20260914/export.py
# Rebuilds only this folder's final/ and runtime-contract.json.
# ──────────────────
"""Export a four-direction sprite while preserving approved side frames."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from typing import ClassVar, Final

from PIL import Image
from pydantic import BaseModel, ConfigDict

ROOT: Final = Path(__file__).resolve().parent
SCALE: Final = 0.1590751445086705
CELL: Final = 64
ORDER: Final = ("down", "up", "left", "right")


class FrameSource(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]


class Pipeline(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    trim_border: int
    frames: tuple[FrameSource, ...]
    qc_summary: dict[str, int | float]
    qc_config: dict[str, bool | float | None]


class Animation(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    frames: tuple[int, ...]
    durations_ms: tuple[int, ...] = (150, 150, 150, 150)
    rest_frame: int
    loop: bool = True


class Contract(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    status: str = "asset-candidate-not-integrated"
    sheet: str = "final/sheet-transparent.png"
    rows: int = 4
    columns: int = 4
    cell: tuple[int, int] = (64, 64)
    sheet_size: tuple[int, int] = (256, 256)
    index_base: int = 0
    pivot: tuple[int, int] = (32, 60)
    direction_order: tuple[str, ...] = ORDER
    animations: dict[str, Animation]
    sampling: str = "nearest"
    shared_raw_to_output_scale: float = SCALE
    left_right_rgba_identical: bool
    preserved_side_rgba_sha256: str
    source_provenance: dict[str, str]
    initial_processor_qc: dict[str, Pipeline]
    final_geometry: dict[str, int | bool]
    not_requested: tuple[str, ...] = ("combat", "game-integration")
    notes: str


def cleaned_frame(source: Path, index: int) -> Image.Image:
    """Crop source coordinates, remove only magenta spill, apply common scale."""
    meta = Pipeline.model_validate_json((source / "pipeline-meta.json").read_text())
    frame = meta.frames[index]
    with Image.open(source / "raw-sheet-clean.png") as raw:
        tile = raw.convert("RGBA").crop(frame.source_box)
    trim = meta.trim_border
    tile = tile.crop((trim, trim, tile.width - trim, tile.height - trim))
    tile = tile.crop(frame.crop_bbox)
    pixels = bytearray(tile.tobytes())
    for offset in range(0, len(pixels), 4):
        red, green, blue, alpha = pixels[offset : offset + 4]
        spill = red > 1.5 * green and blue > 1.5 * green and red + blue > 2 * green + 30
        pixels[offset + 3] = 0 if spill or alpha < 128 else 255
    tile = Image.frombytes("RGBA", tile.size, bytes(pixels))
    tile = tile.resize((round(tile.width * SCALE), round(tile.height * SCALE)), Image.Resampling.NEAREST)
    assert 0 < tile.width < CELL and 0 < tile.height < 60
    result = Image.new("RGBA", (CELL, CELL))
    result.paste(tile, (32 - tile.width // 2, 60 - tile.height))
    return result


def gif_frame(frame: Image.Image) -> Image.Image:
    """Reserve palette index zero for transparency without color collisions."""
    quantized = frame.convert("RGB").quantize(colors=255)
    palette = quantized.getpalette()
    assert palette is not None
    alpha = frame.getchannel("A").tobytes()
    indices = bytes(value + 1 if alpha[index] else 0 for index, value in enumerate(quantized.tobytes()))
    result = Image.frombytes("P", frame.size, indices)
    result.putpalette([0, 0, 0] + palette[:765])
    result.info["transparency"] = 0
    return result


def main() -> None:
    output = ROOT / "final"
    output.mkdir(exist_ok=True)
    previous = ROOT.parent / "og-walk-test-20260914/pixel-final/sheet-transparent.png"
    with Image.open(previous) as old:
        sides = old.convert("RGBA")
    assert sides.size == (256, 128)
    sheet = Image.new("RGBA", (256, 256))
    for row in range(2):
        for column in range(4):
            source = ROOT / ("step-standard" if column == 3 else "standard")
            sheet.paste(cleaned_frame(source, row * 4 + column), (column * CELL, row * CELL))
    sheet.paste(sides, (0, 128))
    preserved = sheet.crop((0, 128, 256, 256)).tobytes() == sides.tobytes()
    assert preserved
    frames: list[Image.Image] = []
    for row, direction in enumerate(ORDER):
        strip = sheet.crop((0, row * CELL, 256, (row + 1) * CELL))
        strip.save(output / f"{direction}-strip.png")
        animation: list[Image.Image] = []
        for column in range(4):
            frame = strip.crop((column * CELL, 0, (column + 1) * CELL, CELL))
            bbox = frame.getbbox()
            assert bbox is not None
            assert 0 < bbox[0] < bbox[2] < CELL and 0 < bbox[1] < bbox[3] < CELL
            assert set(frame.getchannel("A").tobytes()) <= {0, 255}
            frame.save(output / f"{direction}-{column}.png")
            frames.append(frame)
            animation.append(gif_frame(frame.resize((256, 256), Image.Resampling.NEAREST)))
        animation[0].save(output / f"{direction}.gif", save_all=True, append_images=animation[1:], duration=150, loop=0, disposal=2, transparency=0, optimize=False)
    assert len(frames) == 16
    sheet.save(output / "sheet-transparent.png")
    sheet.resize((1024, 1024), Image.Resampling.NEAREST).save(output / "preview-4x.png")
    contract = Contract(
        animations={direction: Animation(frames=tuple(range(row * 4, row * 4 + 4)), rest_frame=row * 4 + (0 if row < 2 else 1)) for row, direction in enumerate(ORDER)},
        left_right_rgba_identical=preserved,
        preserved_side_rgba_sha256=sha256(sides.tobytes()).hexdigest(),
        source_provenance={"down_up_columns_0_1_2": "standard/raw-sheet-clean.png from updown-attempt-1/raw.png", "down_up_column_3": "step-standard/raw-sheet-clean.png from updown-step-fix-small/raw.png", "left_right": str(previous.relative_to(ROOT.parent)), "crop": "source_box then trim_border=4 then crop_bbox; fixed shared scale; feet y=60, center x=32"},
        initial_processor_qc={name: Pipeline.model_validate_json((ROOT / name / "pipeline-meta.json").read_text()) for name in ("standard", "step-standard")},
        final_geometry={"frame_count": 16, "empty_count": 0, "edge_touch_count": 0, "paste_clamped_count": 0, "binary_alpha": True},
        notes="Initial processor QC and final export geometry are separate evidence. New front/back frames only receive magenta spill removal and NEAREST fixed scaling. Existing side RGBA pixels remain identical. Frame zero is front/back rest; side rest remains local frame one. Asset export is not game integration or gameplay QA.",
    )
    _ = (ROOT / "runtime-contract.json").write_text(contract.model_dump_json(indent=2) + "\n")


if __name__ == "__main__":
    main()
