# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==12.1.1"]
# ///
# How to run: uv run assets/source/yoplait-rescue-v1/export.py

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
CELL: Final = 96
FLOOR: Final = 89
THRESHOLD: Final = 240
preview = Image.new("RGBA", (CELL * 4, CELL), (43, 48, 62, 255))
records: list[dict[str, str | float | int | list[int] | tuple[int, ...]]] = []

for column, (name, scale, head_rect) in enumerate([
    ("kneel", 0.15, (648, 297, 949, 583)),
    ("surprised", 0.125, (615, 221, 940, 530)),
    ("lookback", 0.125, (604, 246, 955, 557)),
], start=1):
    with Image.open(ROOT / "raw" / f"{name}.png") as source:
        sprite = source.convert("RGBA")
    alpha = sprite.getchannel("A")
    sprite.putalpha(alpha.point([0] * THRESHOLD + [255] * (256 - THRESHOLD)))
    bounds = sprite.getbbox()
    assert bounds is not None
    crop = sprite.crop(bounds)
    size = (round(crop.width * scale), round(crop.height * scale))
    assert size[0] <= CELL and size[1] <= FLOOR
    reduced = crop.resize(size, Image.Resampling.NEAREST)
    offset = ((CELL - size[0]) // 2, FLOOR - size[1])
    output = Image.new("RGBA", (CELL, CELL))
    output.alpha_composite(reduced, offset)
    output.save(GAME / "assets" / "battle" / f"yoplait-{name}.png")
    output.save(ROOT / f"yoplait-{name}.png")
    preview.alpha_composite(output, (column * CELL, 0))
    records.append({
        "pose": name, "scale": scale, "raw_bounds": bounds,
        "size": size, "offset": offset, "alpha_threshold": THRESHOLD,
        "visible_bounds": output.getbbox() or (),
        "head_landmarks_raw": head_rect,
        "head_width_approx": round((head_rect[2] - head_rect[0]) * scale, 2),
        "head_height_approx": round((head_rect[3] - head_rect[1]) * scale, 2),
    })

with Image.open(GAME / "assets" / "battle" / "hyungsub.png") as source:
    reference = source.convert("RGBA").crop((0, 0, 384, 512))
pixels = list(reference.getdata())
reference.putdata([
    (r, g, b, 0 if r >= 220 and g <= 40 and b >= 220 else a)
    for r, g, b, a in pixels
])
reference = reference.resize((96, 128), Image.Resampling.NEAREST)
# Runtime pivot [156,490] at scale .25 becomes [39,122.5].
preview.alpha_composite(reference, (9, FLOOR - 123))
preview.resize((1536, 384), Image.Resampling.NEAREST).save(ROOT / "preview.png")
metadata = {
    "cell": [CELL, CELL], "anchor": [48, FLOOR], "frames_each": 1,
    "processing": "Alpha below 240 removed; retained alpha made opaque; RGB preserved; nearest scaling only.",
    "calibration": "Head anatomy matched to standing Hyungsub, not bounding-box height. Each independently generated source uses a fixed uniform scalar.",
    "reference": {"path": "assets/battle/hyungsub.png", "scale": 0.25,
                  "standing_height_approx": 87, "head_width_approx": 46,
                  "head_height_approx": 44},
    "preview_order": ["standing reference", "kneel", "surprised right", "surprised lookback kneel"],
    "records": records,
}
(ROOT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(json.dumps(metadata, indent=2))
