# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==12.1.1"]
# ///
# How to run: uv run assets/source/janitor-hero-v4-flag-only/fx/export.py

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[3]
SCALE: Final = 0.16
CELL: Final = 128
with Image.open(ROOT / "triple-slash-raw.png") as source:
    raw = source.convert("RGBA")
raw.putalpha(raw.getchannel("A").point([0] * 240 + [255] * 16))
atlas = Image.new("RGBA", (256, 256))
preview = Image.new("RGBA", (512, 128), (43, 48, 62, 255))
frames: list[Image.Image] = []
records: list[dict[str, int | tuple[int, ...]]] = []
for index in range(4):
    source_cell = raw.crop(((index % 2) * 768, (index // 2) * 512,
                           (index % 2 + 1) * 768, (index // 2 + 1) * 512))
    bounds = source_cell.getbbox()
    assert bounds is not None
    crop = source_cell.crop(bounds)
    size = (round(crop.width * SCALE), round(crop.height * SCALE))
    offset = (round(64 + (bounds[0] - 384) * SCALE), round(64 + (bounds[1] - 256) * SCALE))
    frame = Image.new("RGBA", (CELL, CELL))
    frame.alpha_composite(crop.resize(size, Image.Resampling.NEAREST), offset)
    visible = frame.getbbox()
    assert visible is not None and min(visible[:2]) > 0 and max(visible[2:]) < CELL
    atlas.alpha_composite(frame, ((index % 2) * CELL, (index // 2) * CELL))
    preview.alpha_composite(frame, (index * CELL, 0))
    background = Image.new("RGBA", (CELL, CELL), (43, 48, 62, 255))
    background.alpha_composite(frame)
    frames.append(background.resize((384, 384), Image.Resampling.NEAREST).convert("RGB"))
    records.append({"frame": index, "raw_bounds": bounds, "visible_bounds": visible})
atlas.save(ROOT / "janitor-red-triple.png")
(GAME / "assets" / "fx").mkdir(exist_ok=True)
atlas.save(GAME / "assets" / "fx" / "janitor-red-triple.png")
preview.save(ROOT / "preview-native.png")
frames[0].save(ROOT / "preview.gif", save_all=True, append_images=frames[1:], duration=60, loop=0, disposal=2)
(ROOT / "metadata.json").write_text(json.dumps({
    "cell": [128, 128], "grid": [2, 2], "pivot": [64, 64], "runtime_fps": 16,
    "preview_duration_ms": 60, "scale": SCALE, "component_mode": "all",
    "processing": "Alpha below240 removed; keptalpha255; originalRGB; uniformnearest. Rawcellcenterfixed, all survivingcomponentsretained.",
    "records": records,
}, indent=2) + "\n")
print(records)
