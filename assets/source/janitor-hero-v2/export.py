# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==12.1.1"]
# ///
# How to run: uv run assets/source/janitor-hero-v2/export.py

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
CELL: Final = 192
PIVOT: Final = (138, 180)
HOLD: Final = [380, 260, 380, 260]
records: list[dict[str, str | int | float | tuple[int, ...]]] = []
idle_frames: list[Image.Image] = []
preview = Image.new("RGBA", (CELL * 4, CELL), (43, 48, 62, 255))
strip = Image.new("RGBA", (CELL * 4, CELL))

for pose, scale, roots in [
    ("idle", 0.235, [(600, 466), (600, 466), (600, 425), (600, 426)]),
    ("laugh", 0.115, [(830, 1110)]),
    ("stand", 0.115, [(805, 1110)]),
    ("flag", 0.11, [(882, 451)]),
]:
    with Image.open(ROOT / "raw" / f"{pose}.png") as source:
        raw = source.convert("RGBA")
    raw.putalpha(raw.getchannel("A").point([0] * 240 + [255] * 16))
    atlas = Image.new("RGBA", (CELL * 2, CELL * 2)) if len(roots) == 4 else Image.new("RGBA", (CELL, CELL))
    for index, root in enumerate(roots):
        source_cell = raw.crop(((index % 2) * 768, (index // 2) * 512,
                               (index % 2 + 1) * 768, (index // 2 + 1) * 512)) if len(roots) == 4 else raw
        bounds = source_cell.getbbox()
        assert bounds is not None
        crop = source_cell.crop(bounds)
        size = (round(crop.width * scale), round(crop.height * scale))
        pivot = (96, 96) if pose == "flag" else PIVOT
        offset = (round(pivot[0] + (bounds[0] - root[0]) * scale),
                  round(pivot[1] + (bounds[1] - root[1]) * scale))
        assert offset[0] >= 0 and offset[1] >= 0, (pose, index, offset)
        assert offset[0] + size[0] <= CELL and offset[1] + size[1] <= CELL, (pose, index, size, offset)
        frame = Image.new("RGBA", (CELL, CELL))
        frame.alpha_composite(crop.resize(size, Image.Resampling.NEAREST), offset)
        atlas.alpha_composite(frame, ((index % 2) * CELL, (index // 2) * CELL))
        if len(roots) == 4:
            idle_frames.append(frame)
            strip.alpha_composite(frame, (index * CELL, 0))
        records.append({"pose": pose, "frame": index, "scale": scale,
                        "raw_root": root, "pivot": pivot, "raw_bounds": bounds,
                        "offset": offset, "size": size, "visible_bounds": frame.getbbox() or ()})
    folder = "props" if pose == "flag" else "battle"
    atlas.save(GAME / "assets" / folder / f"janitor-hero-{pose}.png")
    atlas.save(ROOT / f"janitor-hero-{pose}.png")
    column = ["idle", "laugh", "stand", "flag"].index(pose)
    preview.alpha_composite(atlas.crop((0, 0, CELL, CELL)), (column * CELL, 0))

preview.save(ROOT / "preview-native.png")
comparison = Image.new("RGBA", (96 + CELL * 3, CELL), (43, 48, 62, 255))
with Image.open(GAME / "assets" / "battle" / "hyungsub.png") as source:
    reference = source.convert("RGBA").crop((0, 0, 384, 512))
reference.putdata([(r, g, b, 0 if r >= 220 and g <= 40 and b >= 220 else a)
                   for r, g, b, a in reference.getdata()])
comparison.alpha_composite(reference.resize((96, 128), Image.Resampling.NEAREST), (9, 57))
comparison.alpha_composite(preview.crop((0, 0, CELL * 3, CELL)), (96, 0))
comparison.save(ROOT / "body-comparison-native.png")
preview.resize((CELL * 12, CELL * 3), Image.Resampling.NEAREST).save(ROOT / "preview-3x.png")
strip.save(ROOT / "idle-frames-native.png")
gif_frames: list[Image.Image] = []
for frame in idle_frames:
    background = Image.new("RGBA", frame.size, (43, 48, 62, 255))
    background.alpha_composite(frame)
    gif_frames.append(background.resize((CELL * 3, CELL * 3), Image.Resampling.NEAREST).convert("RGB"))
gif_frames[0].save(ROOT / "idle.gif", save_all=True, append_images=gif_frames[1:],
                   duration=HOLD, loop=0, disposal=2)
metadata = {"cell": [CELL, CELL], "hero_pivot": PIVOT, "flag_pivot": [96, 96],
            "idle_grid": [2, 2], "idle_holds_ms": HOLD,
            "hero_body_height_px_approx": [77, 79, 78],
            "method": "Alpha threshold 240, retained RGB unchanged, whole-pose uniform nearest resize, anatomical floor alignment. No drawing or body-part transforms.",
            "records": records}
(ROOT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(json.dumps(metadata, indent=2))
