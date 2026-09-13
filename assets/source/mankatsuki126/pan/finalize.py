#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# uv run assets/source/mankatsuki126/pan/finalize.py
"""Crop only pan padding and canonicalize transparent RGB for all projectiles."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

import numpy as np
import numpy.typing as npt
from PIL import Image, ImageDraw

ROOT: Final = Path(__file__).resolve().parent.parent


def main() -> None:
    for name, crop, pivot in (
        ("shuriken", (0, 0, 32, 32), (16, 16)),
        ("pig", (0, 0, 48, 48), (24, 24)),
        ("pan", (0, 16, 64, 48), (32, 16)),
    ):
        source_dir = ROOT / name
        with Image.open(source_dir / "frame-1.png") as source:
            rgba: npt.NDArray[np.uint8] = np.array(source.crop(crop), dtype=np.uint8)
        rgb: npt.NDArray[np.int16] = rgba[:, :, :3].astype(np.int16)
        magenta: npt.NDArray[np.bool_] = np.logical_and(
            rgb[:, :, 0] > rgb[:, :, 1] + 12, rgb[:, :, 2] > rgb[:, :, 1] + 12,
        )
        candidate: npt.NDArray[np.bool_] = np.logical_or(np.equal(rgba[:, :, 3], 0), magenta)
        boundary = Image.fromarray(candidate.astype(np.uint8) * 255).copy()
        ImageDraw.floodfill(boundary, (0, 0), 128)
        rgba[np.array(boundary) == 128] = 0
        rgba[rgba[:, :, 3] == 0] = 0
        sprite = Image.fromarray(rgba)
        sprite.save(source_dir / "sprite.png")
        sprite.save(ROOT.parents[1] / "projectiles" / f"mankatsuki-{name}.png")
        background = Image.new("RGBA", sprite.size, (18, 23, 38, 255))
        background.alpha_composite(sprite)
        background.resize((sprite.width * 8, sprite.height * 8), Image.Resampling.NEAREST).save(
            source_dir / "dark-background-review.png",
        )
        contract = {
            "source": "raw-sheet.png", "runtime": f"assets/projectiles/mankatsuki-{name}.png",
            "dimensions": sprite.size, "pivot": pivot, "frame_count": 1,
            "exporter": "assets/source/captain125/junhee_point/export.py",
            "processor_metadata": "processed/pipeline-meta.json",
            "crop_from_exported_frame": crop, "opaque_bounds": sprite.getbbox(),
            "resampling": "NEAREST", "palette_quantization": False,
            "transparent_rgb": [0, 0, 0], "black_pixels_keyed": False,
            "exterior_magenta_fringe_key": "R>G+12 and B>G+12, connected to transparent exterior only",
        }
        _ = (source_dir / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")


if __name__ == "__main__":
    main()
