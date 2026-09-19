# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==12.1.1"]
# ///
# How to run: uv run assets/source/janitor-hero-v4-flag-only/export.py

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
CELL: Final = 192
FLAG_END: Final = 70
with Image.open(ROOT / "raw" / "flag-edit.png") as source:
    raw = source.convert("RGBA")
raw.putalpha(raw.getchannel("A").point([0] * 240 + [255] * 16))
with Image.open(ROOT / "raw" / "accepted-runtime.png") as source:
    original = source.convert("RGBA")
output = original.copy()
preview = Image.new("RGBA", (768, 384), (43, 48, 62, 255))
gif_frames: list[Image.Image] = []
records: list[dict[str, int | tuple[int, ...]]] = []
geometry: Final = [
    ((25, 136, 749, 480), (3, 102), (170, 81)),
    ((22, 133, 746, 480), (2, 102), (170, 82)),
    ((24, 97, 749, 443), (3, 103), (170, 81)),
    ((22, 96, 746, 442), (2, 102), (170, 81)),
]
for index, (bounds, offset, size) in enumerate(geometry):
    raw_cell = raw.crop(((index % 2) * 768, (index // 2) * 512,
                         (index % 2 + 1) * 768, (index // 2 + 1) * 512))
    sx = (bounds[2] - bounds[0]) / size[0]
    sy = (bounds[3] - bounds[1]) / size[1]
    transformed = raw_cell.transform((CELL, CELL), Image.Transform.AFFINE,
        (sx, 0, bounds[0] - offset[0] * sx, 0, sy, bounds[1] - offset[1] * sy),
        resample=Image.Resampling.NEAREST)
    rect = ((index % 2) * CELL, (index // 2) * CELL,
            (index % 2 + 1) * CELL, (index // 2 + 1) * CELL)
    before = original.crop(rect)
    frame = before.copy()
    frame.paste(transformed.crop((0, 0, FLAG_END, CELL)), (0, 0))
    assert frame.crop((FLAG_END, 0, CELL, CELL)).tobytes() == before.crop((FLAG_END, 0, CELL, CELL)).tobytes()
    output.paste(frame, rect[:2])
    preview.alpha_composite(before, (index * CELL, 0))
    preview.alpha_composite(frame, (index * CELL, CELL))
    changed = sum(old != new and (old[3] > 0 or new[3] > 0)
                  for old, new in zip(before.getdata(), frame.getdata(), strict=True))
    visible = frame.getbbox()
    assert visible is not None and min(visible[:2]) > 0 and max(visible[2:]) < CELL
    records.append({"frame": index, "changed_pixels": changed,
                    "outside_flag_changed_pixels": 0, "visible_bounds": visible})
    background = Image.new("RGBA", (CELL, CELL), (43, 48, 62, 255))
    background.alpha_composite(frame)
    gif_frames.append(background.resize((576, 576), Image.Resampling.NEAREST).convert("RGB"))
output.save(ROOT / "janitor-hero-idle.png")
preview.save(ROOT / "comparison-native.png")
preview.resize((1536, 768), Image.Resampling.NEAREST).save(ROOT / "comparison-2x.png")
gif_frames[0].save(ROOT / "idle.gif", save_all=True, append_images=gif_frames[1:],
                   duration=[380, 260, 380, 260], loop=0, disposal=2)
(ROOT / "metadata.json").write_text(json.dumps({
    "cell": [192, 192], "grid": [2, 2], "pivot": [138, 180],
    "flag_region_per_cell": [0, 0, FLAG_END, CELL],
    "method": "Original runtime kept byte-exact outside flag region; generated replacement alpha240, nearest sampling with original v2 geometry; no painting.",
    "runtime_integrated": False, "records": records,
}, indent=2) + "\n")
print(records)
