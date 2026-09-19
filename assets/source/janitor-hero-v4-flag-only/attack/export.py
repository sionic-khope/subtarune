# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==12.1.1"]
# ///
# How to run: uv run assets/source/janitor-hero-v4-flag-only/attack/export.py

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
CELL: Final = 320
PIVOT: Final = (164, 236)
ROOTS: Final = [(285, 403), (340, 404), (280, 370), (225, 370), (224, 354), (280, 354)]
HOLDS: Final = [220, 340, 120, 100, 220, 240]
with Image.open(ROOT / "raw.png") as source:
    raw = source.convert("RGBA")
raw.putalpha(raw.getchannel("A").point([0] * 240 + [255] * 16))
atlas = Image.new("RGBA", (CELL * 2, CELL * 3))
preview = Image.new("RGBA", (CELL * 3, CELL * 2), (43, 48, 62, 255))
frames: list[Image.Image] = []
records: list[dict[str, int | tuple[int, ...]]] = []
for index, root in enumerate(ROOTS):
    frame_raw = raw.crop(((index % 2) * 512, (index // 2) * 512,
                          (index % 2 + 1) * 512, (index // 2 + 1) * 512))
    bounds = frame_raw.getbbox()
    assert bounds is not None and min(bounds[:2]) > 0 and max(bounds[2:]) < 512
    crop = frame_raw.crop(bounds)
    size = (round(crop.width * 0.5), round(crop.height * 0.5))
    offset = (round(PIVOT[0] + (bounds[0] - root[0]) * 0.5),
              round(PIVOT[1] + (bounds[1] - root[1]) * 0.5))
    assert min(offset) > 0 and offset[0] + size[0] < CELL and offset[1] + size[1] < CELL
    frame = Image.new("RGBA", (CELL, CELL))
    frame.alpha_composite(crop.resize(size, Image.Resampling.NEAREST), offset)
    atlas.alpha_composite(frame, ((index % 2) * CELL, (index // 2) * CELL))
    preview.alpha_composite(frame, ((index % 3) * CELL, (index // 3) * CELL))
    background = Image.new("RGBA", (CELL, CELL), (43, 48, 62, 255))
    background.alpha_composite(frame)
    frames.append(background.resize((576, 576), Image.Resampling.NEAREST).convert("RGB"))
    records.append({"frame": index, "source_root": root, "raw_bounds": bounds,
                    "visible_bounds": frame.getbbox() or (), "offset": offset})
atlas.save(ROOT / "janitor-hero-attack.png")
preview.save(ROOT / "preview-native.png")
frames[0].save(ROOT / "attack.gif", save_all=True, append_images=frames[1:], duration=HOLDS, loop=0, disposal=2)
(ROOT / "metadata.json").write_text(json.dumps({"cell": [CELL, CELL], "grid": [2, 3],
    "pivot": PIVOT, "scale": 0.5, "holds_ms": HOLDS, "contact_frame": 3,
    "contact_offset": [90, 10], "cloth_outer_offset": [115, 14], "method": "Alpha240, fixeduniformnearestscale, anatomicalfeetroottranslation. No perframefit or art changes.",
    "records": records}, indent=2) + "\n")
print(records)
