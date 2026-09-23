#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: install uv, then uv run assets/source/ship-invasion305-tiles/export.py.
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
NAMES: Final = ("gajaeman_castle_floor", "gajaeman_castle_cracked",
                "gajaeman_castle_wall", "gajaeman_castle_capstone")


def main() -> None:
    with Image.open(ROOT / "raw-atlas.png") as source:
        raw = source.copy()
    assert raw.mode == "RGB" and raw.size == (1254, 1254)
    records = []
    tiles: list[Image.Image] = []
    contact = Image.new(raw.mode, (192, 192))
    for index, name in enumerate(NAMES):
        x, y = index % 2 * 627, index // 2 * 627
        box = (x, y, x + 627, y + 627)
        tile = raw.crop(box).resize((32, 32), Image.Resampling.NEAREST)
        path = ROOT.parents[1] / "tiles" / f"{name}.png"
        tile.save(path)
        tile.save(ROOT / f"{name}.png")
        tiles.append(tile)
        repeat = Image.new(raw.mode, (96, 96))
        for row in range(3):
            for column in range(3):
                repeat.paste(tile, (column * 32, row * 32))
        repeat.save(ROOT / f"{name}-repeat-1x.png")
        contact.paste(repeat, (index % 2 * 96, index // 2 * 96))
        pixels = np.asarray(tile).astype(np.int16)
        records.append({
            "name": name, "crop": box, "size": tile.size, "mode": tile.mode,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "opaquePixels": 1024,
            "edgeMeanAbsoluteRGBDifference": {
                "leftRight": float(np.abs(pixels[:, 0] - pixels[:, -1]).mean()),
                "topBottom": float(np.abs(pixels[0] - pixels[-1]).mean()),
            },
        })
    contact.save(ROOT / "repeat-preview-1x.png")
    contact.resize((1152, 1152), Image.Resampling.NEAREST).save(ROOT / "repeat-preview-6x.png")
    mixed = Image.new(raw.mode, (96, 96))
    arrangement = ((0, 0, 1), (0, 1, 0), (1, 0, 0))
    for row, indices in enumerate(arrangement):
        for column, index in enumerate(indices):
            mixed.paste(tiles[index], (column * 32, row * 32))
    mixed.save(ROOT / "mixed-floor-preview-1x.png")
    mixed.resize((576, 576), Image.Resampling.NEAREST).save(ROOT / "mixed-floor-preview-6x.png")
    reference = ROOT.parents[1] / "props/gajaeman_castle.png"
    (ROOT / "qc.json").write_text(json.dumps({
        "generator": "built-in image_gen", "generations": 1, "model": "unknown", "cost": "unknown",
        "rawSize": raw.size, "rawMode": raw.mode, "grid": {"columns": 2, "rows": 2},
        "rawSHA256": hashlib.sha256((ROOT / "raw-atlas.png").read_bytes()).hexdigest(),
        "reference": "assets/props/gajaeman_castle.png",
        "referenceSHA256": hashlib.sha256(reference.read_bytes()).hexdigest(),
        "resample": "NEAREST", "alphaChanges": False, "colorChanges": False,
        "patternReuse": "assets/source/choimis-flower291/tiles/export.py",
        "tiles": records, "mixedFloorArrangement": arrangement,
        "note": "Edge differences are observations, not a pixel-perfect seamlessness claim.",
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
