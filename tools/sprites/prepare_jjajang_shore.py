#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow==12.3.0"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# From repository root: uv run tools/sprites/prepare_jjajang_shore.py
# ──────────────────
"""Extract shore terrain from image-model pixels without palette remapping."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[2]
SOURCE: Final = ROOT / "assets/source/jjajang-shore"
PATCHES: Final = (
    ("jjajang_forest_black", "black-v2/palette-preview.png", (640, 32, 742, 134)),
    ("jjajang_path_black", "black-v2/palette-preview.png", (650, 400, 752, 502)),
    ("jjajang_sand", "sand-raw.png", (0, 0, 1254, 1254)),
)


def main() -> None:
    """Cut unoccluded generated terrain and assemble repeat evidence."""
    repeat = Image.new("RGB", (288, 96))
    output_hashes: dict[str, str] = {}
    source_hashes: dict[str, str] = {}
    for index, (name, source, bounds) in enumerate(PATCHES):
        raw_path = SOURCE / source
        with Image.open(raw_path) as image:
            assert image.mode == "RGB" and image.width >= bounds[2] and image.height >= bounds[3]
            raw = image.copy()
        source_hashes[source] = hashlib.sha256(raw_path.read_bytes()).hexdigest()
        tile = raw.crop(bounds).resize((32, 32), Image.Resampling.NEAREST)
        path = ROOT / "assets/tiles" / f"{name}.png"
        tile.save(path)
        output_hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        for y in range(3):
            for x in range(3):
                repeat.paste(tile, (index * 96 + x * 32, y * 32))
    repeat.resize((1152, 384), Image.Resampling.NEAREST).save(SOURCE / "terrain-repeat-preview.png")
    metadata = {"sourceRoot": str(SOURCE.relative_to(ROOT)), "sourceSha256": source_hashes,
                "patches": PATCHES, "outputSize": [32, 32],
                "resampling": "NEAREST", "recolor": False, "cropFit": False,
                "outputSha256": output_hashes}
    _ = (SOURCE / "terrain-export.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
