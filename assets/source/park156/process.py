#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from any directory: uv run assets/source/park156/process.py
# Optional first argument: directory containing the original exec-*.png files.
# ──────────────────
"""Deterministically export the generated Park Guardian gimmick action sheets."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Final, TypedDict

import numpy as np
from PIL import Image, ImageDraw

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
PROCESSOR: Final = Path.home() / ".codex/skills/generate2dsprite/scripts/generate2dsprite.py"
CELL: Final = 128
BASELINE: Final = 116


class FrameBounds(TypedDict):
    frame: int
    sourceBox: tuple[int, int, int, int]
    bbox: tuple[int, int, int, int]
    height: int
    rootOffsetX: int


@dataclass(frozen=True, slots=True)
class Action:
    """Observed source layout and one anatomical magnification per action."""

    name: str
    source: str
    cols: int
    rows: int
    scale: float
    width: int = CELL


ACTIONS: Final = (
    Action("razma", "db4076cc-da6a-4547-9f1c-13868a00956a", 2, 2, 96 / 597),
    Action("guardian-judge", "b490007d-6083-4f22-80a7-5013b0a09935", 2, 2, 108 / 487),
)


def standard_pass(action: Action) -> None:
    """Run the installed skill processor before the pixel-preserving export."""
    source = ROOT / f"{action.name}-raw.png"
    with Image.open(source) as image:
        has_alpha = image.mode == "RGBA"
    output = ROOT / action.name / "standard"
    command = [
        sys.executable, str(PROCESSOR), "process", "--input", str(source),
        "--target", "asset", "--mode", "idle", "--rows", str(action.rows),
        "--cols", str(action.cols), "--output-dir", str(output),
        "--cell-size", "128", "--fit-scale", "0.84", "--align", "feet",
        "--shared-scale", "--component-mode", "largest", "--component-padding", "0",
        "--trim-border", "0", "--edge-clean-depth", "0",
        "--threshold", "0" if has_alpha else "100",
        "--edge-threshold", "0" if has_alpha else "150",
        "--strict-qc",
    ]
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    _ = (output / "command.json").write_text(json.dumps(command, indent=2) + "\n")
    _ = (output / "process.log").write_text(result.stdout + result.stderr)
    result.check_returncode()


def export(action: Action) -> Image.Image:
    """Reuse processor cleanup, preserving one raw-pixel scale across frames."""
    directory = ROOT / action.name
    with Image.open(directory / "standard/raw-sheet-clean.png") as image:
        source = image.convert("RGBA")
    pixels = np.asarray(source).copy()
    with Image.open(ROOT / f"{action.name}-raw.png") as original:
        keyed_background = original.mode == "RGB"
    if keyed_background:
        rgb = pixels[:, :, :3].astype(np.int16)
        magenta_fringe = (rgb[:, :, 0] > 30) & (rgb[:, :, 2] > 30) & (rgb[:, :, 1] < np.minimum(rgb[:, :, 0], rgb[:, :, 2]) * 0.5) & (np.abs(rgb[:, :, 0] - rgb[:, :, 2]) < 65)
        pixels[magenta_fringe, 3] = 0
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    source = Image.fromarray(pixels)
    width, height = source.width // action.cols, source.height // action.rows
    count = action.cols * action.rows
    columns = min(count, 2)
    sheet = Image.new("RGBA", (columns * action.width, (count // columns) * CELL))
    frames: list[Image.Image] = []
    report: list[FrameBounds] = []
    for index in range(count):
        col, row = index % action.cols, index // action.cols
        frame = source.crop((col * width, row * height, (col + 1) * width, (row + 1) * height))
        bbox = frame.getbbox()
        assert bbox is not None, (action.name, index, "empty source")
        assert 0 < bbox[0] < bbox[2] < width and 0 < bbox[1] < bbox[3] < height
        feet = frame.crop((0, bbox[3] - 12, width, bbox[3])).getbbox()
        assert feet is not None
        root_x = (feet[0] + feet[2]) / 2
        art = frame.crop(bbox)
        resized = art.resize((round(art.width * action.scale), round(art.height * action.scale)), Image.Resampling.NEAREST)
        centered_x = round(action.width / 2 - (root_x - bbox[0]) * action.scale)
        position = (centered_x, BASELINE - resized.height)
        assert position[0] > 0 and position[1] > 0
        assert position[0] + resized.width < action.width and position[1] + resized.height < CELL
        aligned = Image.new("RGBA", (action.width, CELL))
        aligned.paste(resized, position)
        bounds = aligned.getbbox()
        assert bounds is not None and bounds[3] == BASELINE
        assert set(np.unique(np.asarray(aligned)[:, :, 3])).issubset({0, 255})
        aligned.save(directory / f"frame-{index}.png")
        frames.append(aligned)
        sheet.paste(aligned, ((index % columns) * action.width, (index // columns) * CELL))
        report.append({"frame": index, "sourceBox": bbox, "bbox": bounds, "height": bounds[3] - bounds[1], "rootOffsetX": position[0] - centered_x})
    runtime = GAME / "assets/enemies" / f"park-{action.name}.png"
    sheet.save(runtime)
    sheet.save(directory / "sheet-transparent.png")
    frames[0].save(directory / "animation.gif", save_all=True, append_images=frames[1:], duration=150, loop=0, disposal=2, transparency=0)
    contract = {
        "asset": str(runtime.relative_to(GAME)), "source": f"{action.name}-raw.png",
        "dimensions": sheet.size, "cell": [action.width, CELL], "columns": columns,
        "frames": count, "order": "row-major", "pivot": [action.width // 2, BASELINE],
        "rawPixelScale": action.scale, "resampling": "NEAREST", "alpha": "binary >=128",
        "durationMs": 150, "bounds": report,
        "sourceEdgeTouch": 0, "outputEdgeTouch": 0, "pasteClamping": 0,
    }
    _ = (directory / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    print(action.name, runtime, [entry["height"] for entry in report], flush=True)
    return sheet


def main() -> None:
    """Preserve originals, run standard cleanup, then export and preview."""
    if len(sys.argv) > 1:
        raw_directory = Path(sys.argv[1])
        for action in ACTIONS:
            _ = shutil.copy2(raw_directory / f"exec-{action.source}.png", ROOT / f"{action.name}-raw.png")
    with ThreadPoolExecutor(max_workers=4) as pool:
        _ = list(pool.map(standard_pass, ACTIONS))
    preview = Image.new("RGBA", (1024, 544), (30, 33, 43, 255))
    labels = ImageDraw.Draw(preview)
    for index, action in enumerate(ACTIONS):
        sheet = export(action)
        x, y = (index % 4) * 512, (index // 4) * 640
        labels.text((x + 10, y + 8), action.name, fill="white")
        preview.alpha_composite(sheet.resize((sheet.width * 2, sheet.height * 2), Image.Resampling.NEAREST), (x, y + 32))
    preview.convert("RGB").save(ROOT / "preview.png")
    _ = subprocess.run([sys.executable, str(ROOT / "process-single.py"), *sys.argv[1:]], check=True)


if __name__ == "__main__":
    main()
