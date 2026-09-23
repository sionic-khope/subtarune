#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow==12.3.0"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# From repository root: uv run assets/source/castle306/export.py
# ──────────────────
"""Mechanically export generated castle approach artwork without painting pixels."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
ASSETS: Final = ROOT.parents[1]
NAMES: Final = ("castle306_floor", "castle306_moss", "castle306_cracked", "castle306_moss_dense")


def main() -> None:
    """Export four floor variants, one gate and one backdrop with audit metadata."""
    with Image.open(ROOT / "raw-tiles.png") as source:
        raw_tiles = source.copy()
    assert raw_tiles.size == (1254, 1254) and raw_tiles.mode == "RGB"
    records: list[dict[str, str | tuple[int, ...] | dict[str, float]]] = []
    tiles: list[Image.Image] = []
    repeats = Image.new("RGB", (192, 192))
    for index, name in enumerate(NAMES):
        x, y = index % 2 * 627, index // 2 * 627
        crop = (x, y, x + 627, y + 627)
        tile = raw_tiles.crop(crop).resize((32, 32), Image.Resampling.NEAREST)
        destination = ASSETS / "tiles" / f"{name}.png"
        tile.save(destination)
        tiles.append(tile)
        for row in range(3):
            for column in range(3):
                repeats.paste(tile, (index % 2 * 96 + column * 32, index // 2 * 96 + row * 32))
        left = tile.crop((0, 0, 1, 32)).tobytes()
        right = tile.crop((31, 0, 32, 32)).tobytes()
        top = tile.crop((0, 0, 32, 1)).tobytes()
        bottom = tile.crop((0, 31, 32, 32)).tobytes()
        records.append({
            "path": str(destination.relative_to(ASSETS.parent)), "size": tile.size,
            "mode": tile.mode, "crop": crop,
            "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
            "edgeMeanAbsoluteRGBDifference": {
                "leftRight": sum(abs(a - b) for a, b in zip(left, right, strict=True)) / len(left),
                "topBottom": sum(abs(a - b) for a, b in zip(top, bottom, strict=True)) / len(top),
            },
        })
    repeats.save(ROOT / "tiles-repeat-1x.png")
    repeats.resize((768, 768), Image.Resampling.NEAREST).save(ROOT / "tiles-repeat-4x.png")
    mixed = Image.new("RGB", (160, 160))
    for row in range(5):
        for column in range(5):
            mixed.paste(tiles[(row * 3 + column) % 4], (column * 32, row * 32))
    mixed.save(ROOT / "tiles-mixed-1x.png")
    mixed.resize((640, 640), Image.Resampling.NEAREST).save(ROOT / "tiles-mixed-4x.png")
    with Image.open(ROOT / "raw-gate.png") as source:
        raw_gate = source.copy()
    assert raw_gate.mode == "RGBA" and raw_gate.size == (1122, 1402)
    gate_content = raw_gate.resize((252, 315), Image.Resampling.NEAREST)
    gate = Image.new("RGBA", (256, 320))
    gate.paste(gate_content, (2, 3))
    gate_path = ASSETS / "props/castle306_gate.png"
    gate.save(gate_path)
    gate.resize((512, 640), Image.Resampling.NEAREST).save(ROOT / "gate-preview-2x.png")
    with Image.open(ROOT / "raw-interior-v2.png") as source:
        raw_distant = source.copy()
    assert raw_distant.mode == "RGB" and raw_distant.size == (1448, 1086)
    backdrop = raw_distant.resize((480, 360), Image.Resampling.NEAREST)
    backdrop_path = ASSETS / "backdrops/castle306_distant.png"
    backdrop.save(backdrop_path)
    manifest = {
        "generator": "built-in image_gen", "model": "unknown", "cost": "unknown",
        "generationIds": ["exec-b13f3532-f7c1-4eaa-baef-1167a9fede08", "exec-acbf3cf8-e4f0-472b-84a6-74b52567786f", "exec-86fb23fb-efed-486b-b821-44d2ab6d7f19"],
        "resample": "NEAREST", "alphaCleanup": False, "colorChanges": False,
        "tiles": records,
        "gate": {"path": "assets/props/castle306_gate.png", "size": gate.size,
                 "sourceSize": raw_gate.size, "contentSize": gate_content.size,
                 "placement": [2, 3], "pivot": [128, 320],
                 "alphaBounds": gate.getbbox(), "alphaRange": gate.getchannel("A").getextrema(),
                 "sha256": hashlib.sha256(gate_path.read_bytes()).hexdigest()},
        "backdrop": {"path": "assets/backdrops/castle306_distant.png", "size": backdrop.size,
                     "source": "raw-interior-v2.png", "setting": "enclosed castle interior",
                     "sourceSize": raw_distant.size,
                     "sha256": hashlib.sha256(backdrop_path.read_bytes()).hexdigest()},
        "sourceSHA256": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                         for name in ("raw-tiles.png", "raw-gate.png", "raw-distant.png", "raw-interior-v2.png")},
        "archivedBackdrop": {"source": "raw-distant.png", "export": "backdrop-exterior-v1.png",
                             "generationId": "exec-a9cf567c-c620-4ed7-a7d5-40245c3ba68e",
                             "reason": "User corrected exterior setting to castle interior."},
        "note": "Tile edges visually reviewed; edge measurements are observations, not a perfect seamlessness guarantee.",
    }
    _ = (ROOT / "export.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
