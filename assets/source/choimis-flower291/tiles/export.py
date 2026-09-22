#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
# How to run: install uv, then uv run assets/source/choimis-flower291/tiles/export.py.
from __future__ import annotations

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent


def main() -> None:
    with Image.open(ROOT / "raw-atlas.png") as source:
        raw = source.convert("RGB")
    assert raw.width == raw.height * 2
    records = []
    preview = Image.new("RGB", (192, 96))
    for index, name in enumerate(("night_coast_rock", "night_coast_edge")):
        box = (index * raw.height, 0, (index + 1) * raw.height, raw.height)
        tile = raw.crop(box).resize((32, 32), Image.Resampling.NEAREST)
        tile.save(ROOT.parents[2] / "tiles" / f"{name}.png")
        for row in range(3):
            for column in range(3):
                preview.paste(tile, (index * 96 + column * 32, row * 32))
        records.append({"name": name, "crop": box, "size": [32, 32]})
    preview.resize((1152, 576), Image.Resampling.NEAREST).save(ROOT / "repeat-preview-6x.png")
    (ROOT / "qc.json").write_text(json.dumps({"rawSize": raw.size, "resample": "NEAREST", "tiles": records}, indent=2) + "\n")


if __name__ == "__main__":
    main()
