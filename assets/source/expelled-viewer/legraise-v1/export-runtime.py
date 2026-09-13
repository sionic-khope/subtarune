#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "pydantic"]
# ///
# Run: uv run assets/source/expelled-viewer/legraise-v1/export-runtime.py
"""Export generated leg lifts around a fixed head anchor, not a changing pose bbox."""
from __future__ import annotations

import json
from pathlib import Path
from typing import ClassVar, Final

from PIL import Image
from pydantic import BaseModel, ConfigDict


class Frame(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]


class Pipeline(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    trim_border: int
    frames: tuple[Frame, ...]


ROOT: Final = Path(__file__).resolve().parent
OUTPUT: Final = ROOT.parents[2] / "sprites" / "expelled-viewer-legraise.png"
SCALE: Final = 0.14578352180936993
HEADS: Final = ((183, 407), (146, 407), (183, 374), (146, 374))
TARGET_HEAD: Final = (24, 68)
PIVOT: Final = (48, 88)


def main() -> None:
    """Preserve one anatomical scale and translate every pose to its measured head root."""
    pipeline = Pipeline.model_validate_json((ROOT / "pipeline-meta.json").read_text())
    sheet = Image.new("RGBA", (192, 192))
    contact = Image.new("RGBA", (384, 96), (45, 55, 72, 255))
    animation: list[Image.Image] = []
    report: list[dict[str, int | float | tuple[int, int] | tuple[int, int, int, int]]] = []
    with Image.open(ROOT / "raw-sheet-clean.png") as source:
        for index, (frame, head) in enumerate(zip(pipeline.frames, HEADS, strict=True)):
            sx, sy, _, _ = frame.source_box
            left, top, right, bottom = frame.crop_bbox
            trim = pipeline.trim_border
            crop = source.crop((sx + trim + left, sy + trim + top,
                                sx + trim + right, sy + trim + bottom)).convert("RGBA")
            pixels = bytearray(crop.tobytes())
            for offset in range(0, len(pixels), 4):
                r, g, b = pixels[offset:offset + 3]
                if r > g + 12 and b > g + 12:
                    pixels[offset] = g
                    pixels[offset + 2] = g
            crop = Image.frombytes("RGBA", crop.size, bytes(pixels))
            size = (round(crop.width * SCALE), round(crop.height * SCALE))
            sprite = crop.resize(size, Image.Resampling.NEAREST)
            origin = (round(TARGET_HEAD[0] - (head[0] - trim - left) * SCALE),
                      round(TARGET_HEAD[1] - (head[1] - trim - top) * SCALE))
            assert origin[0] > 0 and origin[1] > 0
            assert origin[0] + size[0] < 96 and origin[1] + size[1] < 96
            cell = Image.new("RGBA", (96, 96))
            cell.paste(sprite, origin)
            bbox = cell.getbbox()
            assert bbox is not None and all(0 < value < 96 for value in bbox)
            assert 86 <= bbox[3] <= 90
            cell.save(ROOT / f"runtime-{index}.png")
            sheet.paste(cell, ((index % 2) * 96, (index // 2) * 96))
            contact.alpha_composite(cell, (index * 96, 0))
            preview = Image.new("RGBA", (96, 96), (45, 55, 72, 255))
            preview.alpha_composite(cell)
            animation.append(preview.convert("RGB").resize((384, 384), Image.Resampling.NEAREST))
            report.append({"frame": index, "source_head": head, "target_head": TARGET_HEAD,
                           "scale": SCALE, "origin": origin, "bbox": bbox})
    sheet.save(OUTPUT)
    contact.resize((1536, 384), Image.Resampling.NEAREST).save(ROOT / "contact-preview.png")
    animation[0].save(ROOT / "rooted-legraise.gif", save_all=True,
                      append_images=animation[1:], duration=180, loop=0, disposal=2)
    _ = (ROOT / "runtime-qc.json").write_text(json.dumps({
        "cell": [96, 96], "pivot": PIVOT, "head_root": TARGET_HEAD,
        "filter": "nearest", "per_frame_scaling": False, "color_quantization": False,
        "edge_touch_frames": [], "clipped_frames": [], "frames": report,
        "raw_pose_observation": "Raised-vertical source pose has a longer pelvis extension; no warp was applied."
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
