# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
NAMES: Final = ("ship_lounge_floor", "ship_lounge_floor_alt", "ship_lounge_runner", "carpet_b_candidate")


def main() -> None:
    with Image.open(ROOT / "raw-atlas.png") as raw:
        raw.load()
        width, height = raw.size
        assert width == height and width % 2 == 0
        atlas = raw.convert("RGBA")
    assert atlas.getchannel("A").getextrema() == (255, 255)
    half = width // 2
    tiles = []
    records = []
    repeat = Image.new("RGBA", (192, 192))
    for index, name in enumerate(NAMES):
        column, row = index % 2, index // 2
        box = (column * half, row * half, (column + 1) * half, (row + 1) * half)
        tile = atlas.crop(box).resize((32, 32), Image.Resampling.NEAREST)
        path = ROOT / f"{name}.png"
        tile.save(path)
        tiles.append(tile)
        records.append({"name": name, "crop": box, "size": [32, 32],
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "runtime": index < 3})
        for y in range(3):
            for x in range(3):
                repeat.paste(tile, (column * 96 + x * 32, row * 96 + y * 32))
    repeat.resize((768, 768), Image.Resampling.NEAREST).save(ROOT / "repeated-tiles-4x.png")
    mixed = Image.new("RGBA", (256, 256))
    for y in range(8):
        for x in range(8):
            tile = tiles[2] if x in (3, 4) else tiles[(x + y) % 2]
            mixed.paste(tile, (x * 32, y * 32))
    mixed.resize((768, 768), Image.Resampling.NEAREST).save(ROOT / "floor-runner-repeat-3x.png")
    manifest = {"provider": "Codex built-in image_gen", "model": "unknown", "usage": "unknown", "cost": "unknown",
                "sourceSize": [width, height], "rawSha256": hashlib.sha256((ROOT / "raw-atlas.png").read_bytes()).hexdigest(),
                "method": "Equal quadrant crop and NEAREST32x32; no color, alpha, seam or palette edits", "tiles": records}
    (ROOT / "export.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
