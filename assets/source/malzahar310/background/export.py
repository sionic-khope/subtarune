#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "pydantic>=2"]
# ///
# Run with: uv run export.py (uv reads the dependency metadata above).
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

from PIL import Image
from pydantic import BaseModel, ConfigDict


class SourceFrame(BaseModel):
    model_config = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]


class SourceMetadata(BaseModel):
    model_config = ConfigDict(frozen=True)
    frames: tuple[SourceFrame, ...]


BASE: Final = Path(__file__).resolve().parent
IDS: Final = ("warwick", "ezreal", "yasuo", "akali")
FOLDERS: Final = {"warwick": "warwick/regridded", "ezreal": "ezreal", "yasuo": "yasuo", "akali": "akali"}
ORIGINAL_RECTS: Final = ((0, 0, 660, 627), (660, 0, 1254, 627), (0, 627, 660, 1254), (660, 627, 1254, 1254))
TIMING: Final = [350, 220, 180, 250]


def main() -> None:
    contact = Image.new("RGBA", (384, 384), (31, 35, 47, 255))
    small = Image.new("RGBA", (192, 192), (31, 35, 47, 255))
    report = []
    for row, name in enumerate(IDS):
        folder = BASE / FOLDERS[name]
        output = BASE / name
        meta = SourceMetadata.model_validate_json((folder / "pipeline-meta.json").read_text())
        first = meta.frames[0].crop_bbox
        scale = 70 / (first[3] - first[1])
        frames = []
        cells = []
        with Image.open(folder / "raw-sheet-clean.png") as source:
            for index, item in enumerate(meta.frames):
                ox, oy = item.source_box[:2]
                left, top, right, bottom = item.crop_bbox
                rect = (ox + left, oy + top, ox + right, oy + bottom)
                original = rect
                if row == 0:
                    sx, sy, ex, ey = ORIGINAL_RECTS[index]
                    px, py = (700 - (ex - sx)) // 2, 36
                    original = (sx + left - px, sy + top - py, sx + right - px, sy + bottom - py)
                crop = source.convert("RGBA").crop(rect)
                crop.putalpha(crop.getchannel("A").point(lambda alpha: 255 if alpha >= 128 else 0))
                size = (round(crop.width * scale), round(crop.height * scale))
                sprite = crop.resize(size, Image.Resampling.NEAREST)
                silhouette = sprite.getbbox()
                assert silhouette
                paste = ((96 - size[0]) // 2, 83 - silhouette[3])
                canvas = Image.new("RGBA", (96, 96))
                canvas.alpha_composite(sprite, paste)
                bounds = canvas.getbbox()
                assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < 96 and bounds[3] == 83
                assert set(canvas.getchannel("A").get_flattened_data()) == {0, 255}
                magenta = sum(1 for r, g, b, a in canvas.get_flattened_data() if a and r > 200 and b > 200 and g < 90)
                assert magenta == 0
                cells.append({"index": index, "source_cell": item.source_box, "crop_cell_local": item.crop_bbox, "crop_sheet_global": rect, "original_raw_rect": original, "scale": scale, "bounds": bounds, "pivot": [48, 48], "feet_y": 83, "sha256": hashlib.sha256(canvas.tobytes()).hexdigest(), "edge_touch": False, "paste_clamped": False, "opaque_magenta": magenta})
                canvas.save(output / f"frame-{index}.png")
                frames.append(canvas)
                contact.alpha_composite(canvas, (index * 96, row * 96))
                small.alpha_composite(canvas.resize((48, 48), Image.Resampling.NEAREST), (index * 48, row * 48))
        sheet = Image.new("RGBA", (192, 192))
        gif = []
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, ((index % 2) * 96, (index // 2) * 96))
            preview = Image.new("RGBA", frame.size, (31, 35, 47, 255))
            preview.alpha_composite(frame)
            gif.append(preview.convert("RGB").resize((288, 288), Image.Resampling.NEAREST))
        sheet.save(BASE / f"{name}.png")
        gif[0].save(output / "final-animation.gif", save_all=True, append_images=gif[1:], duration=TIMING, loop=0)
        assert len({cell["sha256"] for cell in cells}) == 4
        report.append({"id": name, "frames": cells})
    contact.resize((768, 768), Image.Resampling.NEAREST).save(BASE / "contact-preview-2x.png")
    small.resize((768, 768), Image.Resampling.NEAREST).save(BASE / "runtime-half-scale-preview-4x.png")
    (BASE / "final-qc.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()

