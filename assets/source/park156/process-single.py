#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run assets/source/park156/process-single.py [original-image-directory]
# ──────────────────
"""Preserve generated cut-in framing, stained-glass alpha and sword pixels."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
PROCESSOR: Final = Path.home() / ".codex/skills/generate2dsprite/scripts/generate2dsprite.py"


@dataclass(frozen=True, slots=True)
class SingleAsset:
    name: str
    original: str
    destination: str
    size: tuple[int, int]
    pixel_art: bool
    preserve_canvas: bool = False


ASSETS: Final = (
    SingleAsset("sword", "408e5d0b-ea1c-4fa6-933f-481bb2999615", "projectiles/park-trial-sword.png", (96, 256), True),
    SingleAsset("glass", "c46970bc-711a-49e4-b49f-b073f5558acb", "illustrations/park-trial-glass.png", (512, 160), False),
    SingleAsset("objection", "365e3bc7-f48a-4d5e-893a-780108430352", "illustrations/park-trial-objection.png", (384, 320), False, True),
)


def process(asset: SingleAsset) -> Image.Image:
    """Separate native transparency from authored RGB portrait framing."""
    directory = ROOT / asset.name
    directory.mkdir(exist_ok=True)
    with Image.open(ROOT / f"{asset.name}-raw.png") as image:
        native_alpha = image.mode == "RGBA"
        original = image.convert("RGBA")
    pixels = np.asarray(original).copy()
    if native_alpha:
        if asset.pixel_art:
            pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
        else:
            pixels[pixels[:, :, 3] < 8, 3] = 0
    prepared = directory / "prepared.png"
    Image.fromarray(pixels).save(prepared)
    standard = directory / "standard"
    command = [
        sys.executable, str(PROCESSOR), "process", "--input", str(prepared),
        "--target", "asset", "--mode", "single", "--rows", "1", "--cols", "1",
        "--output-dir", str(standard), "--cell-size", "256", "--fit-scale", "0.84",
        "--align", "center", "--shared-scale", "--component-mode", "all",
        "--component-padding", "0", "--trim-border", "0", "--edge-clean-depth", "0",
        "--threshold", "0" if native_alpha else "25",
        "--edge-threshold", "0" if native_alpha else "100", "--strict-qc",
    ]
    if asset.preserve_canvas:
        command.append("--allow-source-edge-touch")
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    _ = (standard / "command.json").write_text(json.dumps(command, indent=2) + "\n")
    _ = (standard / "process.log").write_text(result.stdout + result.stderr)
    result.check_returncode()
    with Image.open(standard / "raw-sheet-clean.png") as image:
        cleaned = image.convert("RGBA")
    bounds = cleaned.getbbox()
    assert bounds is not None
    crop = (0, 0, cleaned.width, cleaned.height) if asset.preserve_canvas else bounds
    subject = cleaned.crop(crop)
    margin = 0 if asset.preserve_canvas else 4
    scale = min((asset.size[0] - margin * 2) / subject.width, (asset.size[1] - margin * 2) / subject.height)
    sampling = Image.Resampling.NEAREST if asset.pixel_art else Image.Resampling.LANCZOS
    scaled = subject.resize((round(subject.width * scale), round(subject.height * scale)), sampling)
    output = Image.new("RGBA", asset.size)
    offset = ((output.width - scaled.width) // 2, (output.height - scaled.height) // 2)
    output.paste(scaled, offset)
    final_bounds = output.getbbox()
    assert final_bounds is not None
    assert 0 < final_bounds[0] < final_bounds[2] < output.width
    assert 0 < final_bounds[1] < final_bounds[3] < output.height
    if asset.pixel_art:
        assert set(np.unique(np.asarray(output)[:, :, 3])).issubset({0, 255})
    destination = GAME / "assets" / asset.destination
    destination.parent.mkdir(exist_ok=True)
    output.save(destination)
    output.save(directory / "final.png")
    contract = {
        "asset": str(destination.relative_to(GAME)), "dimensions": asset.size,
        "frames": 1, "source": f"{asset.name}-raw.png", "sourceCrop": crop,
        "scale": scale, "offset": offset, "bounds": final_bounds,
        "pivot": [asset.size[0] // 2, final_bounds[3] if asset.pixel_art else asset.size[1] // 2],
        "resampling": sampling.name, "nativeAlpha": native_alpha,
        "binaryAlpha": asset.pixel_art, "preserveSourceCanvas": asset.preserve_canvas,
        "sourceCropIntent": "authored hat/waist framing" if asset.preserve_canvas else "transparent exterior only",
        "outputEdgeTouch": 0, "pasteClamping": 0,
    }
    _ = (directory / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    print(asset.name, destination, final_bounds, flush=True)
    return output


def main() -> None:
    if len(sys.argv) > 1:
        raw_directory = Path(sys.argv[1])
        for asset in ASSETS:
            _ = shutil.copy2(raw_directory / f"exec-{asset.original}.png", ROOT / f"{asset.name}-raw.png")
    preview = Image.new("RGBA", (1024, 640), (30, 33, 43, 255))
    for asset, position in zip(ASSETS, ((16, 16), (128, 16), (128, 208)), strict=True):
        preview.alpha_composite(process(asset), position)
    preview.convert("RGB").save(ROOT / "single-preview.png")


if __name__ == "__main__":
    main()
