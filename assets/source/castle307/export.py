#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow==12.3.0", "numpy==2.3.2"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# From repository root: uv run assets/source/castle307/export.py
# ──────────────────
"""Mechanically export the generated castle lobby artwork without painting pixels."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
ASSETS: Final = ROOT.parents[1]
NAMES: Final = ("castle307_floor", "castle307_moss", "castle307_lava", "castle307_lava_dark")


def main() -> None:
    """Export the locked gate, indoor background and four repeatable material tiles."""
    with Image.open(ROOT / "raw-gate.png") as source:
        raw_gate = source.copy()
    assert raw_gate.mode == "RGBA" and raw_gate.size == (1145, 1374)
    gate_content = raw_gate.copy()
    gate_content.thumbnail((316, 380), Image.Resampling.NEAREST)
    gate = Image.new("RGBA", (320, 384))
    placement = ((320 - gate_content.width) // 2, 382 - gate_content.height)
    gate.paste(gate_content, placement)
    gate_path = ASSETS / "props/castle307_sealed_gate.png"
    gate.save(gate_path)
    gate.resize((640, 768), Image.Resampling.NEAREST).save(ROOT / "gate-preview-2x.png")
    for name, color in (("dark", "#17141d"), ("light", "#eee4ef")):
        preview = Image.new("RGBA", gate.size, color)
        preview.alpha_composite(gate)
        preview.convert("RGB").save(ROOT / f"gate-alpha-{name}.png")
    with Image.open(ROOT / "raw-backdrop.png") as source:
        raw_backdrop = source.copy()
    assert raw_backdrop.mode == "RGB" and raw_backdrop.size == (1448, 1086)
    backdrop = raw_backdrop.resize((480, 360), Image.Resampling.NEAREST)
    backdrop_path = ASSETS / "backdrops/castle307_right.png"
    backdrop.save(backdrop_path)
    with Image.open(ROOT / "raw-tiles.png") as source:
        raw_tiles = source.convert("RGB")
    assert raw_tiles.width == raw_tiles.height and raw_tiles.width % 2 == 0
    half = raw_tiles.width // 2
    tiles: list[Image.Image] = []
    records: list[dict[str, str | tuple[int, ...] | dict[str, float]]] = []
    repeats = Image.new("RGB", (192, 192))
    for index, name in enumerate(NAMES):
        x, y = index % 2 * half, index // 2 * half
        crop = (x, y, x + half, y + half)
        tile = raw_tiles.crop(crop).resize((32, 32), Image.Resampling.NEAREST)
        destination = ASSETS / "tiles" / f"{name}.png"
        tile.save(destination)
        tiles.append(tile)
        for row in range(3):
            for column in range(3):
                repeats.paste(tile, (index % 2 * 96 + column * 32, index // 2 * 96 + row * 32))
        pixels = np.asarray(tile, dtype=np.int16)
        records.append({
            "path": str(destination.relative_to(ASSETS.parent)), "size": tile.size,
            "crop": crop, "mode": tile.mode,
            "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
            "edgeMeanAbsoluteRGBDifference": {
                "leftRight": float(np.abs(pixels[:, 0] - pixels[:, 31]).mean()),
                "topBottom": float(np.abs(pixels[0:1] - pixels[31:32]).mean()),
            },
        })
    repeats.save(ROOT / "tiles-repeat-1x.png")
    repeats.resize((768, 768), Image.Resampling.NEAREST).save(ROOT / "tiles-repeat-4x.png")
    mixed = Image.new("RGB", (192, 192))
    for row in range(6):
        for column in range(6):
            index = (row + column) % 2 + (2 if column in (0, 5) else 0)
            mixed.paste(tiles[index], (column * 32, row * 32))
    mixed.save(ROOT / "tiles-mixed-1x.png")
    mixed.resize((768, 768), Image.Resampling.NEAREST).save(ROOT / "tiles-mixed-4x.png")
    manifest = {
        "generator": "built-in image_gen", "model": "unknown", "cost": "unknown",
        "resample": "NEAREST", "alphaCleanup": False, "colorChanges": False,
        "tiles": records,
        "gate": {"path": "assets/props/castle307_sealed_gate.png", "size": gate.size,
                 "sourceSize": raw_gate.size, "contentSize": gate_content.size,
                 "placement": placement, "pivot": [160, 384], "blackOrbSeals": 2,
                 "alphaBounds": gate.getbbox(),
                 "alphaRange": [int(np.asarray(gate, dtype=np.uint8)[:, :, 3].min()),
                                int(np.asarray(gate, dtype=np.uint8)[:, :, 3].max())],
                 "sha256": hashlib.sha256(gate_path.read_bytes()).hexdigest()},
        "backdrop": {"path": "assets/backdrops/castle307_right.png", "size": backdrop.size,
                     "sourceSize": raw_backdrop.size, "setting": "enclosed furnace-gallery interior",
                     "sha256": hashlib.sha256(backdrop_path.read_bytes()).hexdigest()},
        "sourceSHA256": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                         for name in ("raw-tiles.png", "raw-gate.png", "raw-backdrop.png")},
        "note": "Tiles are visually checked repeats, not a mathematically exact seamless-edge guarantee.",
    }
    _ = (ROOT / "export.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
