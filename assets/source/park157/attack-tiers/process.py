#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: uv run assets/source/park157/attack-tiers/process.py
"""Export tier attacks at the accepted anchor's shared raw-cell magnification."""
from pathlib import Path
from typing import Final
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[3]
PROCESSOR: Final = Path.home() / ".codex/skills/generate2dsprite/scripts/generate2dsprite.py"
TIERS: Final = ("loose", "slipping", "adjust")


def process(tier: str) -> Image.Image:
    """Clean a generated grid and preserve one 128/raw-cell scale in all frames."""
    directory = ROOT / tier
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(ROOT / f"{tier}-raw.png"),
               "--target", "asset", "--mode", "attack", "--rows", "3", "--cols", "2",
               "--output-dir", str(directory / "standard"), "--cell-size", "128", "--fit-scale", "0.84",
               "--align", "feet", "--shared-scale", "--scale-strategy", "preserve",
               "--component-mode", "largest", "--component-padding", "0", "--trim-border", "0",
               "--strict-qc", "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05"]
    subprocess.run(command, check=True, capture_output=True, text=True)
    with Image.open(directory / "standard/raw-sheet-clean.png") as image:
        source = image.convert("RGBA")
    pixels = np.asarray(source).copy()
    rgb = pixels[:, :, :3].astype(np.int16)
    fringe = (rgb[:, :, 0] > 30) & (rgb[:, :, 2] > 30) & (rgb[:, :, 1] < np.minimum(rgb[:, :, 0], rgb[:, :, 2]) * 0.5) & (np.abs(rgb[:, :, 0] - rgb[:, :, 2]) < 65)
    pixels[fringe, 3] = 0
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    source = Image.fromarray(pixels)
    width, height = source.width // 2, source.height // 3
    assert width == height
    scale = 128 / width
    sheet = Image.new("RGBA", (192, 288))
    frames: list[Image.Image] = []
    bounds_report: list[tuple[int, int, int, int]] = []
    for index in range(6):
        col, row = index % 2, index // 2
        frame = source.crop((col * width, row * height, (col + 1) * width, (row + 1) * height))
        bounds = frame.getbbox()
        assert bounds is not None
        assert 0 < bounds[0] < bounds[2] < width and 0 < bounds[1] < bounds[3] < height
        feet = frame.crop((0, bounds[3] - 12, width, bounds[3])).getbbox()
        assert feet is not None
        root = (feet[0] + feet[2]) / 2
        art = frame.crop(bounds)
        art = art.resize((round(art.width * scale), round(art.height * scale)), Image.Resampling.NEAREST)
        position = (round(48 - (root - bounds[0]) * scale), 90 - art.height)
        assert position[0] > 0 and position[1] > 0
        assert position[0] + art.width < 96 and position[1] + art.height < 96
        aligned = Image.new("RGBA", (96, 96))
        aligned.paste(art, position)
        final_bounds = aligned.getbbox()
        assert final_bounds is not None and final_bounds[3] == 90
        assert 0 < final_bounds[0] < final_bounds[2] < 96 and 0 < final_bounds[1] < final_bounds[3] < 96
        assert set(np.unique(np.asarray(aligned)[:, :, 3])).issubset({0, 255})
        bounds_report.append(final_bounds)
        aligned.save(directory / f"frame-{index}.png")
        frames.append(aligned)
        sheet.paste(aligned, (col * 96, row * 96))
    sheet.save(GAME / "assets/enemies" / f"park-guardian-attack-{tier}.png")
    sheet.save(directory / "sheet-transparent.png")
    frames[0].save(directory / "animation.gif", save_all=True, append_images=frames[1:], duration=125, loop=0, disposal=2, transparency=0)
    contract = {"tier": tier, "sheet": [192, 288], "cell": [96, 96], "frames": 6, "columns": 2,
                "pivot": [48, 90], "fps": 8, "bounds": bounds_report, "rawPixelScale": scale,
                "scalePolicy": "128/raw-cell width from accepted anchor; no per-frame fit",
                "sampling": "NEAREST", "binaryAlpha": True, "edgeTouch": 0, "pasteClamping": 0,
                "qcScope": "Each final96px frame: pre-paste extent, post-paste opaque bbox, baseline and binaryalpha assertions",
                "command": command}
    (directory / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    return sheet


def main() -> None:
    """Process independent grids then compose a native-size comparison."""
    with ThreadPoolExecutor(max_workers=3) as pool:
        sheets = list(pool.map(process, TIERS))
    preview = Image.new("RGBA", (768, 288), (30, 33, 43, 255))
    with Image.open(GAME / "assets/enemies/park-guardian-attack.png") as original:
        preview.alpha_composite(original, (0, 0))
    for index, sheet in enumerate(sheets, start=1):
        preview.alpha_composite(sheet, (index * 192, 0))
    preview.save(ROOT / "preview.png")
    preview.resize((1536, 576), Image.Resampling.NEAREST).save(ROOT / "preview-2x.png")
    comparison = Image.new("RGBA", (672, 288), (30, 33, 43, 255))
    for row, (tier, sheet) in enumerate(zip(TIERS, sheets, strict=True)):
        with Image.open(GAME / "assets/enemies" / f"park-guardian-{tier}.png") as idle:
            comparison.alpha_composite(idle.crop((0, 0, 96, 96)), (0, row * 96))
        for index in range(6):
            col, sheet_row = index % 2, index // 2
            frame = sheet.crop((col * 96, sheet_row * 96, col * 96 + 96, sheet_row * 96 + 96))
            comparison.alpha_composite(frame, ((index + 1) * 96, row * 96))
    comparison.resize((1344, 576), Image.Resampling.NEAREST).save(ROOT / "idle-attack-comparison-2x.png")


if __name__ == "__main__":
    main()
