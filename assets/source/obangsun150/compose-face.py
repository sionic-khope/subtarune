#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# Run: uv run output/sprites/obangsun150/compose-face.py
from __future__ import annotations

import json
from pathlib import Path
from typing import Final

from PIL import Image, ImageChops, ImageDraw

ROOT: Final = Path(__file__).resolve().parent
DIRECTIONS: Final = ("down", "up", "left", "right")
REGIONS: Final = ((0, 22, 42, 28, 45), (2, 17, 33, 27, 45), (3, 31, 47, 27, 45))


def hull(points: list[tuple[int, int]]) -> list[tuple[int, int]]:
    ordered = sorted(set(points))
    lower: list[tuple[int, int]] = []
    upper: list[tuple[int, int]] = []
    for half, sequence in ((lower, ordered), (upper, list(reversed(ordered)))):
        for point in sequence:
            while len(half) >= 2:
                a, b = half[-2:]
                cross = (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])
                if cross > 0:
                    break
                half.pop()
            half.append(point)
    return lower[:-1] + upper[:-1]


def main() -> None:
    with Image.open(ROOT / "original-sheet.png") as opened:
        original = opened.convert("RGBA")
    with Image.open(ROOT / "raw-face-edit.png") as opened:
        generated = opened.convert("RGBA").resize(original.size, Image.Resampling.NEAREST)
    original_rgb = original.convert("RGB")
    mask = Image.new("L", original.size)
    draw = ImageDraw.Draw(mask)
    for row, xmin, xmax, ymin, ymax in REGIONS:
        for column in range(4):
            points: list[tuple[int, int]] = []
            for y in range(ymin, ymax):
                for x in range(xmin, xmax):
                    gx, gy = column * 64 + x, row * 64 + y
                    r, g, b = original_rgb.getpixel((gx, gy))
                    if r > 130 and g > 90 and r > b * 1.1:
                        points.append((gx, gy))
            draw.polygon(hull(points), fill=255)
    edited = Image.composite(generated, original, mask)
    edited.putalpha(original.getchannel("A"))
    edited.save(ROOT / "obangsun.png")
    mask.save(ROOT / "face-mask.png")
    generated.save(ROOT / "aligned-face-edit.png")
    bounds: list[tuple[int, int, int, int] | None] = []
    per_frame: list[int] = []
    difference = ImageChops.difference(original.convert("RGB"), edited.convert("RGB"))
    red, green, blue = difference.split()
    changed = ImageChops.lighter(ImageChops.lighter(red, green), blue).point(lambda value: 255 if value else 0)
    outside = ImageChops.multiply(changed, ImageChops.invert(mask))
    for row, direction in enumerate(DIRECTIONS):
        frames: list[Image.Image] = []
        for column in range(4):
            area = (column * 64, row * 64, column * 64 + 64, row * 64 + 64)
            frame = edited.crop(area)
            frame.save(ROOT / f"{direction}-{column}.png")
            bounds.append(frame.getbbox())
            per_frame.append(4096 - changed.crop(area).histogram()[0])
            frames.append(frame)
        edited.crop((0, row * 64, 256, row * 64 + 64)).save(ROOT / f"{direction}-strip.png")
        frames[0].save(ROOT / f"{direction}.gif", save_all=True,
                       append_images=frames[1:], duration=160, loop=0, disposal=2, optimize=False)
    comparison = Image.new("RGBA", (512, 256), (58, 48, 68, 255))
    comparison.alpha_composite(original)
    comparison.alpha_composite(edited, (256, 0))
    comparison.resize((2048, 1024), Image.Resampling.NEAREST).save(ROOT / "before-after.png")
    comparison.crop((256, 0, 512, 256)).resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / "preview.png")
    qc = {"size": edited.size, "cell": [64, 64], "pivot": [32, 61],
          "rows": DIRECTIONS, "resampling": "NEAREST", "frame_count": 16,
          "changed_pixels_per_frame": per_frame, "changed_pixels_total": sum(per_frame),
          "outside_face_changed_pixels": 65536 - outside.histogram()[0],
          "outside_face_changed": outside.getbbox() is not None,
          "alpha_identical": original.getchannel("A").tobytes() == edited.getchannel("A").tobytes(),
          "back_row_identical": original.crop((0, 64, 256, 128)).tobytes() == edited.crop((0, 64, 256, 128)).tobytes(),
          "empty_frames": [i for i, box in enumerate(bounds) if box is None],
          "edge_touch_frames": [i for i, box in enumerate(bounds) if box and (box[0] <= 0 or box[1] <= 0 or box[2] >= 64 or box[3] >= 64)]}
    (ROOT / "qc.json").write_text(json.dumps(qc, indent=2) + "\n")


if __name__ == "__main__":
    main()
