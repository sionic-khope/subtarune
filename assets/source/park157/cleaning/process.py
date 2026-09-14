#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: uv run assets/source/park157/cleaning/process.py
"""Normalize generated cleaning props into the agreed pixel envelopes."""

from pathlib import Path
from typing import Final
import json
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[3]
PROCESSOR: Final = Path.home() / ".codex/skills/generate2dsprite/scripts/generate2dsprite.py"
ASSETS: Final = (
    ("bag", (64, 64), (54, 54), (32, 60)),
    ("dustpan", (96, 64), (84, 48), (48, 60)),
    ("broom", (64, 128), (44, 116), (32, 124)),
)


def main() -> None:
    """Run the skill processor, nearest resize, and binary-alpha envelope QC."""
    preview = Image.new("RGBA", (256, 144), (30, 33, 43, 255))
    for index, (name, size, envelope, pivot) in enumerate(ASSETS):
        directory = ROOT / name
        command = [
            sys.executable, str(PROCESSOR), "process", "--input", str(ROOT / "raw" / f"{name}.png"),
            "--target", "asset", "--mode", "single", "--rows", "1", "--cols", "1",
            "--output-dir", str(directory), "--cell-size", "256", "--fit-scale", "0.84",
            "--align", "center", "--component-mode", "largest", "--component-padding", "0",
            "--trim-border", "0", "--strict-qc",
        ]
        subprocess.run(command, check=True, capture_output=True, text=True)
        with Image.open(directory / "raw-sheet-clean.png") as image:
            clean = image.convert("RGBA")
        bounds = clean.getbbox()
        assert bounds is not None
        subject = clean.crop(bounds)
        scale = min(envelope[0] / subject.width, envelope[1] / subject.height)
        subject = subject.resize((round(subject.width * scale), round(subject.height * scale)), Image.Resampling.NEAREST)
        pixels = np.asarray(subject).copy()
        pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
        red, green, blue = (pixels[:, :, channel].astype(float) for channel in range(3))
        fringe = (red > green * 1.3 + 8) & (blue > green * 1.3 + 8) & (red > blue * 0.6) & (blue > red * 0.6)
        pixels[fringe, 3] = 0
        subject = Image.fromarray(pixels)
        output = Image.new("RGBA", size)
        output.paste(subject, (pivot[0] - subject.width // 2, pivot[1] - subject.height))
        final_bounds = output.getbbox()
        assert final_bounds is not None
        assert 0 < final_bounds[0] < final_bounds[2] < size[0]
        assert 0 < final_bounds[1] < final_bounds[3] < size[1]
        rgba = np.asarray(output)
        magenta = (rgba[:, :, 0] > 150) & (rgba[:, :, 2] > 150) & (rgba[:, :, 1] < 100) & (rgba[:, :, 3] > 0)
        assert not magenta.any()
        destination = GAME / "assets/projectiles" / f"park-cleaning-{name}.png"
        output.save(destination)
        output.save(directory / "final.png")
        contract = {"asset": str(destination.relative_to(GAME)), "dimensions": size, "bounds": final_bounds,
                    "pivot": pivot, "maxEnvelope": envelope, "frames": 1, "duration": "runtime movement",
                    "scale": scale, "sampling": "NEAREST", "binaryAlpha": True,
                    "magentaPixels": 0, "edgeTouch": False, "removedChromaFringePixels": int(fringe.sum()), "command": command}
        (directory / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
        preview.alpha_composite(output, ((4, 72, 176)[index], 8))
    preview.save(ROOT / "preview.png")
    preview.resize((768, 432), Image.Resampling.NEAREST).save(ROOT / "preview-3x.png")


if __name__ == "__main__":
    main()
