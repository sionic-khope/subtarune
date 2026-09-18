#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow==12.3.0"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# From repository root: uv run tools/sprites/prepare_ship_lounge.py
# ──────────────────
"""Mechanically export generated ship lounge art and pixel-scale QC previews."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final, TypedDict

from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[2]
SOURCE: Final = ROOT / "assets/source/ship-lounge/visuals"
NAMES: Final = ("floor", "floor_alt", "runner", "runner_trim")


class ImageRecord(TypedDict):
    path: str
    size: tuple[int, int]
    mode: str
    alphaExtrema: tuple[float, float] | tuple[tuple[float, float], ...]
    sha256: str


def main() -> None:
    """Crop full-bleed tile cells, preserve door alpha, and assemble evidence."""
    with Image.open(SOURCE / "floors-raw.png") as raw:
        assert raw.size == (1254, 1254), "Raw tile layout changed; re-inspect cells."
        floors = raw.convert("RGB").convert("RGBA")
    outputs: list[Path] = []
    tiles: list[Image.Image] = []
    for index, name in enumerate(NAMES):
        x, y = index % 2 * 627, index // 2 * 627
        tile = floors.crop((x, y, x + 627, y + 627)).resize((32, 32), Image.Resampling.NEAREST)
        assert tile.getchannel("A").getextrema() == (255, 255)
        path = ROOT / f"assets/tiles/ship_lounge_{name}.png"
        tile.save(path)
        outputs.append(path)
        tiles.append(tile)
    with Image.open(SOURCE / "grand-door-raw.png") as raw:
        assert raw.mode == "RGBA" and raw.size == (1145, 1374)
        # The raw canvas has the exact 5:6 runtime aspect; retain every source pixel.
        door = raw.resize((160, 192), Image.Resampling.NEAREST)
    door_path = ROOT / "assets/props/ship_lounge_grand_door.png"
    door.save(door_path)
    outputs.append(door_path)
    with Image.open(SOURCE / "ladder-raw.png") as raw:
        assert raw.mode == "RGBA" and raw.size == (1024, 1536)
        ladder_source = raw.copy()
    alpha_lookup = [value if value >= 8 else 0 for value in range(256)]
    ladder_source.putalpha(ladder_source.getchannel("A").point(alpha_lookup))
    bounds = ladder_source.getchannel("A").getbbox()
    assert bounds is not None
    content = ladder_source.crop(bounds)
    scale = min(60 / content.width, 92 / content.height)
    size = (round(content.width * scale), round(content.height * scale))
    ladder = Image.new("RGBA", (64, 96))
    ladder.paste(content.resize(size, Image.Resampling.NEAREST), ((64 - size[0]) // 2, 94 - size[1]))
    ladder_path = ROOT / "assets/props/ship_lounge_ladder.png"
    ladder.save(ladder_path)
    outputs.append(ladder_path)
    preview = Image.new("RGBA", (192, 192))
    for index, tile in enumerate(tiles):
        for row in range(3):
            for col in range(3):
                preview.paste(tile, (index % 2 * 96 + col * 32, index // 2 * 96 + row * 32))
    preview.resize((768, 768), Image.Resampling.NEAREST).save(SOURCE / "tiles-repeat-3x3.png")
    comparison = Image.new("RGBA", (288, 224))
    for row in range(7):
        for col in range(9):
            comparison.paste(tiles[(row + col) % 2], (col * 32, row * 32))
    comparison.alpha_composite(door, (32, 16))
    with Image.open(ROOT / "assets/sprites/junhee.png") as sheet:
        character = sheet.crop((0, 0, 92, 90)).resize((46, 45), Image.Resampling.NEAREST)
    comparison.alpha_composite(character, (218, 163))
    comparison.resize((864, 672), Image.Resampling.NEAREST).save(SOURCE / "door-character-scale.png")
    ladder.resize((256, 384), Image.Resampling.NEAREST).save(SOURCE / "ladder-4x.png")
    records: list[ImageRecord] = []
    for path in [SOURCE / "floors-raw.png", SOURCE / "grand-door-raw.png", SOURCE / "ladder-raw.png", *outputs]:
        with Image.open(path) as image:
            records.append({"path": str(path.relative_to(ROOT)), "size": image.size,
                            "mode": image.mode, "alphaExtrema": image.convert("RGBA").getchannel("A").getextrema(),
                            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    metadata = {"backend": "built-in image_gen", "model": "unknown", "usageCost": "unknown",
                "resampling": "NEAREST", "paletteQuantization": False,
                "floorAlpha": "full-bleed RGB retained; alpha forced opaque",
                "doorAlpha": "preserved; no chromakey or RGB black key",
                "doorPivot": [80, 192], "doorCanvas": [160, 192],
                "ladderPivot": [32, 96], "ladderCanvas": [64, 96],
                "ladderAlpha": "alpha below 8 cleared, remaining generated alpha preserved",
                "ladderSourceBounds": bounds, "ladderContentSize": size,
                "tileCell": [32, 32], "rawTileCell": [627, 627], "files": records}
    _ = (SOURCE / "export.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
