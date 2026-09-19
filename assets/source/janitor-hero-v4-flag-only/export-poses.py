# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==12.1.1"]
# ///
# How to run: uv run assets/source/janitor-hero-v4-flag-only/export-poses.py

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
V2: Final = ROOT.parent / "janitor-hero-v2"
records: list[dict[str, str | int | list[tuple[int, ...]]]] = []
preview = Image.new("RGBA", (384, 384), (43, 48, 62, 255))
for index, (pose, bounds, offset, size, shift, regions) in enumerate([
    ("stand", (212, 14, 1237, 1117), (70, 54), (118, 127), 0,
     [(0, 0, 114, 118), (0, 118, 103, 134)]),
    ("laugh", (212, 14, 1237, 1117), (70, 54), (118, 127), -5,
     [(0, 0, 110, 118), (0, 118, 101, 134)]),
]):
    with Image.open(ROOT / "stand-raw.png") as source:
        raw = source.convert("RGBA")
    raw.putalpha(raw.getchannel("A").point([0] * 240 + [255] * 16))
    isolated_flag = Image.new("RGBA", raw.size)
    isolated_flag.paste(raw.crop((0, 0, 500, 700)), (0, 0))
    raw = isolated_flag
    with Image.open(V2 / f"janitor-hero-{pose}.png") as source:
        before = source.convert("RGBA")
    sx, sy = (bounds[2] - bounds[0]) / size[0], (bounds[3] - bounds[1]) / size[1]
    generated = raw.transform((192, 192), Image.Transform.AFFINE,
        (sx, 0, bounds[0] - (offset[0] + shift) * sx, 0, sy, bounds[1] - offset[1] * sy),
        resample=Image.Resampling.NEAREST)
    after = before.copy()
    mask = Image.new("L", before.size)
    for region in regions:
        after.paste(generated.crop(region), region[:2])
        mask.paste(255, region)
    outside = sum(old != new and selected == 0
                  for old, new, selected in zip(before.getdata(), after.getdata(), mask.getdata(), strict=True))
    assert outside == 0
    after.save(ROOT / f"janitor-hero-{pose}.png")
    preview.alpha_composite(before, (index * 192, 0))
    preview.alpha_composite(after, (index * 192, 192))
    records.append({"pose": pose, "outside_flag_changed_pixels": outside,
                    "regions": regions, "flag_translation_x": shift})
preview.save(ROOT / "poses-comparison-native.png")
preview.resize((1152, 1152), Image.Resampling.NEAREST).save(ROOT / "poses-comparison-3x.png")
with Image.open(ROOT / "flag-raw.png") as source:
    flag = source.convert("RGBA")
flag.putalpha(flag.getchannel("A").point([0] * 240 + [255] * 16))
bounds = flag.getbbox()
assert bounds is not None
crop = flag.crop(bounds)
size = (round(crop.width * 0.12), round(crop.height * 0.12))
canvas = Image.new("RGBA", (192, 192))
canvas.alpha_composite(crop.resize(size, Image.Resampling.NEAREST), ((192 - size[0]) // 2, 88))
assert canvas.getbbox() is not None and size[1] + 88 < 192
canvas.save(ROOT / "janitor-hero-flag.png")
(ROOT / "poses-metadata.json").write_text(json.dumps({"cell": [192, 192], "hero_pivot": [138, 180],
    "flag_pivot": [96, 96], "flag_scale": 0.12, "flag_size": size, "records": records}, indent=2) + "\n")
print(records)
