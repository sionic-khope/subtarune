# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==12.1.1"]
# ///
# How to run: uv run assets/source/janitor-hero-dance-v5/export.py

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
CELL: Final = 192
PIVOT: Final = (138, 180)
SCALE: Final = 0.37
FEET: Final = [367, 375, 338, 336, 335, 337, 307, 305]
HOLDS: Final = [100, 120, 280, 140, 100, 120, 280, 140]
with Image.open(ROOT / "raw.png") as source:
    raw = source.convert("RGBA")
raw.putalpha(raw.getchannel("A").point([0] * 240 + [255] * 16))
atlas = Image.new("RGBA", (CELL * 2, CELL * 4))
preview = Image.new("RGBA", (CELL * 4, CELL * 2), (43, 48, 62, 255))
frames: list[Image.Image] = []
records: list[dict[str, int | float | tuple[int, ...]]] = []
for index, feet_y in enumerate(FEET):
    source_cell = raw.crop(((index % 2) * 512, (index // 2) * 384,
                           (index % 2 + 1) * 512, (index // 2 + 1) * 384))
    bounds = source_cell.getbbox()
    body_bounds = source_cell.crop((300, 0, 512, 384)).getbbox()
    assert bounds is not None and body_bounds is not None
    assert min(bounds[:2]) > 0 and bounds[2] < 512 and bounds[3] < 384
    crop = source_cell.crop(bounds)
    size = (round(crop.width * SCALE), round(crop.height * SCALE))
    offset = (round(PIVOT[0] + (bounds[0] - 370) * SCALE),
              round(PIVOT[1] + (bounds[1] - feet_y) * SCALE))
    assert min(offset) > 0 and offset[0] + size[0] < CELL and offset[1] + size[1] < CELL
    frame = Image.new("RGBA", (CELL, CELL))
    frame.alpha_composite(crop.resize(size, Image.Resampling.NEAREST), offset)
    frame.save(ROOT / f"frame-{index}.png")
    atlas.alpha_composite(frame, ((index % 2) * CELL, (index // 2) * CELL))
    preview.alpha_composite(frame, ((index % 4) * CELL, (index // 4) * CELL))
    background = Image.new("RGBA", (CELL, CELL), (43, 48, 62, 255))
    background.alpha_composite(frame)
    frames.append(background.resize((576, 576), Image.Resampling.NEAREST).convert("RGB"))
    records.append({"frame": index, "raw_bounds": bounds, "raw_root": (370, feet_y),
                    "output_bounds": frame.getbbox() or (), "body_height_approx": round((body_bounds[3] - body_bounds[1]) * SCALE, 2),
                    "duration_ms": HOLDS[index]})
atlas.save(ROOT / "janitor-hero-idle.png")
atlas.save(GAME / "assets" / "battle" / "janitor-hero-idle.png")
preview.save(ROOT / "preview-native.png")
preview.resize((1536, 768), Image.Resampling.NEAREST).save(ROOT / "preview-2x.png")
frames[0].save(ROOT / "dance.gif", save_all=True, append_images=frames[1:], duration=HOLDS, loop=0, disposal=2)
comparison = Image.new("RGBA", (384, 192), (43, 48, 62, 255))
with Image.open(ROOT.parent / "janitor-hero-v4-flag-only" / "janitor-hero-idle.png") as old:
    comparison.alpha_composite(old.convert("RGBA").crop((192, 0, 384, 192)), (0, 0))
with Image.open(ROOT / "frame-0.png") as current:
    comparison.alpha_composite(current.convert("RGBA"), (192, 0))
comparison.resize((1152, 576), Image.Resampling.NEAREST).save(ROOT / "before-after.png")
(ROOT / "metadata.json").write_text(json.dumps({
    "provider": "Codex built-in imagegen", "backend_model": "unknown", "calls": 2,
    "cell": [192, 192], "grid": [2, 4], "pivot": PIVOT, "scale": SCALE,
    "frames": 8, "loop_ms": sum(HOLDS), "holds_ms": HOLDS,
    "processing": "Generated alpha below240 removed, keptalpha255, RGB preserved, uniformnearestwholeposes; translated anatomical root only.",
    "runtime_integrated": True, "records": records,
}, indent=2) + "\n")
print(records)
