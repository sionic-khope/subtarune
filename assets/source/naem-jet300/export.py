#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run assets/source/naem-jet300/export.py
# 3. Or: chmod +x export.py && ./export.py
# ──────────────────
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
ALPHA_THRESHOLD: Final = 128


class EmptySpriteError(ValueError):
    """The input contains no visible pixels to export."""


def trim_resize(
    source: Image.Image, target_height: int | None, margin: int = 0,
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    """Trim visible bounds without altering RGBA; optionally resize with NEAREST."""
    alpha_table = [255 if alpha >= ALPHA_THRESHOLD else 0 for alpha in range(256)]
    bounds = source.getchannel("A").point(alpha_table).getbbox()
    if bounds is None:
        raise EmptySpriteError
    left, top, right, bottom = bounds
    crop = (max(0, left - margin), max(0, top - margin),
            min(source.width, right + margin), min(source.height, bottom + margin))
    result = source.crop(crop)
    if target_height is not None:
        result = result.resize((round(result.width * target_height / result.height), target_height),
                               Image.Resampling.NEAREST)
    return result, crop


def main() -> None:
    """Export the two approved BUILD300 assets and their reproducible geometry."""
    sealed_root = ROOT.parent / "choimis-sealed300"
    for source_path, output_path, height, margin in (
        (ROOT / "processed/clean.png", GAME / "assets/props/naem-jet.png", None, 3),
        (sealed_root / "clean.png", GAME / "assets/props/choimis-sealed.png", 90, 0),
    ):
        with Image.open(source_path) as source:
            result, crop = trim_resize(source.convert("RGBA"), height, margin)
        result.save(output_path)
        record = {
            "input": str(source_path.relative_to(GAME)),
            "output": str(output_path.relative_to(GAME)),
            "sourceCrop": crop, "size": result.size,
            "visibleAlphaThreshold": ALPHA_THRESHOLD, "rgbaChanged": False,
            "resample": "NEAREST", "aspectPreserved": True,
            "inputSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
            "outputSha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
        }
        bundle = source_path.parent if height is not None else ROOT
        _ = (bundle / "export-meta.json").write_text(json.dumps(record, indent=2) + "\n")
        for background in ("#eee8dd", "#101925"):
            preview = Image.new("RGBA", result.size, background)
            preview.alpha_composite(result)
            preview.save(bundle / f"preview-{background[1:]}.png")


if __name__ == "__main__":
    main()
