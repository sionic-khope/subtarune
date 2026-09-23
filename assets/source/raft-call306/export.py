#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow==12.3.0"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# From repository root: uv run assets/source/raft-call306/export.py
# ──────────────────
"""Export generated recall lever states with one scale and one grounded pivot."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
ASSETS: Final = ROOT.parents[1]
NAMES: Final = ("off", "on")
ALPHA_LUT: Final = tuple(0 if value < 8 else value for value in range(256))
SCALE: Final = 44 / 828
CROPS: Final = ((144, 197, 533, 1025), (217, 1118, 606, 1945))


def main() -> None:
    """Preserve generated colors, clear faint alpha haze and align two states."""
    with Image.open(ROOT / "raw-sheet.png") as source:
        raw = source.copy()
    assert raw.size == (748, 2103) and raw.mode == "RGBA"
    cleaned = raw.copy()
    cleaned.putalpha(raw.getchannel("A").point(ALPHA_LUT))
    cleaned.save(ROOT / "raw-clean.png")
    records: list[dict[str, str | tuple[int, ...] | list[int] | None]] = []
    contact = Image.new("RGBA", (64, 48))
    for index, (name, crop) in enumerate(zip(NAMES, CROPS, strict=True)):
        x0, y0, x1, y1 = crop
        content_size = (round((x1 - x0) * SCALE), round((y1 - y0) * SCALE))
        content = cleaned.crop(crop).resize(content_size, Image.Resampling.NEAREST)
        placement = (round(16 + (x0 - raw.width / 2) * SCALE), 46 - content.height)
        frame = Image.new("RGBA", (32, 48))
        frame.paste(content, placement)
        destination = ASSETS / "props" / f"raft_call_lever_{name}.png"
        frame.save(destination)
        contact.paste(frame, (index * 32, 0))
        record: dict[str, str | tuple[int, ...] | list[int] | None] = {
                  "state": name, "path": str(destination.relative_to(ASSETS.parent)),
                  "sourceCrop": crop, "contentSize": content_size, "placement": placement,
                  "size": frame.size, "pivot": [16, 48], "visibleBounds": frame.getbbox(),
                  "sha256": hashlib.sha256(destination.read_bytes()).hexdigest()}
        records.append(record)
    contact.save(ROOT / "states-1x.png")
    contact.resize((512, 384), Image.Resampling.NEAREST).save(ROOT / "states-8x.png")
    manifest = {"generator": "built-in image_gen", "model": "unknown", "cost": "unknown",
                "generationId": "exec-1a292c45-6d46-4f24-818d-47e33d4c3119",
                "sourceSize": raw.size, "sourceSHA256": hashlib.sha256((ROOT / "raw-sheet.png").read_bytes()).hexdigest(),
                "sourceRows": 2, "sourceColumns": 1, "sharedScale": SCALE,
                "resample": "NEAREST", "alphaRule": "clear generated alpha below8 only",
                "colorChanges": False, "frames": records}
    _ = (ROOT / "export.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
