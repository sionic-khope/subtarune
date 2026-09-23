#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: install uv, then uv run assets/source/ship-deck305-poses/export.py.
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image, ImageDraw

ROOT: Final = Path(__file__).resolve().parent
NAMES: Final = ("hyungsub", "gyeongsub", "ppaman")
CELL: Final = 128
PIVOT: Final = (64, 120)
DURATIONS: Final = (220, 180, 180, 420)
PADDING: Final = 32


def main() -> None:
    all_preview = Image.new("RGBA", (640, 420), "#e7e0d4")
    for character_index, name in enumerate(NAMES):
        directory = ROOT / name
        with Image.open(directory / "raw-sheet.png") as image:
            raw = image.convert("RGBA")
        walk_path = ROOT.parents[1] / "sprites" / f"{name}.png"
        with Image.open(walk_path) as image:
            walk_sheet = image.convert("RGBA")
        walk = walk_sheet.crop((0, 0, walk_sheet.width // 4, walk_sheet.height // 4))
        walk_box = walk.getbbox()
        assert walk_box
        target_height = walk_box[3] - walk_box[1]
        source_frames = []
        core_boxes = []
        source_rectangles = []
        for index in range(4):
            rectangle = (round(index % 2 * raw.width / 2), round(index // 2 * raw.height / 2),
                         round((index % 2 + 1) * raw.width / 2), round((index // 2 + 1) * raw.height / 2))
            source = raw.crop(rectangle)
            alpha = np.asarray(source.getchannel("A"))
            core = Image.fromarray((alpha >= 128).astype(np.uint8)).getbbox()
            assert core
            source_frames.append(source)
            core_boxes.append(core)
            source_rectangles.append(rectangle)
        scale = target_height / (core_boxes[0][3] - core_boxes[0][1])
        sheet = Image.new("RGBA", (512, 128))
        records = []
        frames: list[Image.Image] = []
        for index, source in enumerate(source_frames):
            box = core_boxes[index]
            crop_box = (max(0, box[0] - PADDING), max(0, box[1] - PADDING),
                        min(source.width, box[2] + PADDING), min(source.height, box[3] + PADDING))
            crop = source.crop(crop_box)
            sized = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.NEAREST)
            alpha = np.asarray(sized.getchannel("A"))
            ys, xs = np.nonzero(alpha >= 128)
            shoes = xs[ys >= ys.max() - 0.1 * (ys.max() - ys.min())]
            foot_x = round((int(shoes.min()) + int(shoes.max())) / 2)
            paste = (PIVOT[0] - foot_x, PIVOT[1] - int(ys.max()) - 1)
            assert paste[0] > 0 and paste[1] > 0
            assert paste[0] + sized.width < CELL and paste[1] + sized.height < CELL
            frame = Image.new("RGBA", (CELL, CELL))
            frame.paste(sized, paste)
            frame.save(directory / f"frame-{index}.png")
            frames.append(frame)
            sheet.paste(frame, (index * CELL, 0))
            source_alpha = np.asarray(source.getchannel("A"))
            crop_alpha = np.asarray(crop.getchannel("A"))
            assert np.count_nonzero(source_alpha >= 128) == np.count_nonzero(crop_alpha >= 128)
            records.append({
                "frame": index, "sourceRectangle": source_rectangles[index], "coreBBox": box,
                "cropBBox": crop_box, "scaledSize": sized.size, "paste": paste,
                "visibleHeightAlpha128": int(ys.max() - ys.min() + 1),
                "footMidpointX": float((shoes.min() + shoes.max()) / 2 + paste[0]),
                "footBottomYExclusive": PIVOT[1], "outputBBoxAllAlpha": frame.getbbox(),
                "croppedLowAlphaPixels": int(np.count_nonzero(source_alpha) - np.count_nonzero(crop_alpha)),
                "croppedAlpha128Pixels": 0, "outputEdgeTouch": False, "pasteClamped": False,
                "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest(),
            })
        sheet.save(directory / "sheet-transparent.png")
        sheet.save(ROOT.parents[1] / "sprites" / f"{name}-deck-fist.png")
        preview = Image.new("RGBA", sheet.size, "#e7e0d4")
        preview.alpha_composite(sheet)
        preview.resize((1536, 384), Image.Resampling.NEAREST).save(directory / "preview-3x.png")
        playback = []
        for frame in frames:
            panel = Image.new("RGBA", frame.size, "#e7e0d4")
            panel.alpha_composite(frame)
            playback.append(panel.resize((384, 384), Image.Resampling.NEAREST).convert("RGB"))
        playback[0].save(directory / "animation-preview-3x.gif", save_all=True, append_images=playback[1:],
                         duration=DURATIONS, loop=0, disposal=2)
        baseline = character_index * 140
        all_preview.alpha_composite(walk, (64 - walk.width // 2, baseline + 120 - walk_box[3]))
        all_preview.alpha_composite(sheet, (128, baseline))
        ImageDraw.Draw(all_preview).text((4, baseline + 126), f"{name}: WALK / 0 / 1 / 2 / 3", fill="#252234")
        (directory / "qc.json").write_text(json.dumps({
            "name": name, "rawSize": raw.size, "runtimeSheet": [512, 128], "cell": [128, 128],
            "pivot": PIVOT, "runtimeScale": 0.5, "durationsMs": DURATIONS,
            "walkBodyHeight": target_height, "neutralRawHeight": core_boxes[0][3] - core_boxes[0][1],
            "commonScale": scale, "cropPaddingRawPixels": PADDING,
            "alphaPolicy": "preserve sampled RGBA exactly; alpha128 only measures body and feet",
            "resample": "NEAREST", "paletteChange": False, "frames": records,
            "uniqueRGBAFrames": len({frame.tobytes() for frame in frames}),
            "rawSHA256": hashlib.sha256((directory / "raw-sheet.png").read_bytes()).hexdigest(),
            "walkSHA256": hashlib.sha256(walk_path.read_bytes()).hexdigest(),
            "generator": "built-in image_gen", "generations": 1, "model": "unknown", "cost": "unknown",
        }, indent=2) + "\n")
    all_preview.save(ROOT / "walk-comparison-1x.png")
    all_preview.resize((1280, 840), Image.Resampling.NEAREST).save(ROOT / "walk-comparison-2x.png")


if __name__ == "__main__":
    main()
