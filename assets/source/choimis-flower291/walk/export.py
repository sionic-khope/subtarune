#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
# How to run: install uv, then uv run assets/source/choimis-flower291/walk/export.py tools/sprites/sheet_processor.py
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image, ImageFilter

ROOT: Final = Path(__file__).resolve().parent
DIRECTIONS: Final = ("down", "up", "left", "right")
RAW_ROWS: Final = (0, 1, 2, 3)
CELL: Final = 128
DURATION: Final = 160


def main() -> None:
    processor = Path(sys.argv[1]).resolve()
    with Image.open(ROOT / "raw-sheet.png") as source:
        pixels = np.array(source.convert("RGBA"))
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    clean = Image.fromarray(pixels).crop((1, 1, 1253, 1253))
    clean.save(ROOT / "raw-sheet-clean.png")
    subprocess.run([
        sys.executable, str(processor), "process",
        "--input", str(ROOT / "raw-sheet-clean.png"),
        "--target", "player", "--mode", "player_sheet",
        "--rows", "4", "--cols", "4", "--cell-size", str(CELL),
        "--output-dir", str(ROOT / "processor"),
        "--fit-scale", "0.98", "--align", "center", "--shared-scale",
        "--scale-strategy", "preserve", "--component-mode", "largest",
        "--threshold", "0", "--edge-threshold", "0",
        "--trim-border", "0", "--edge-clean-depth", "0",
        "--duration", str(DURATION), "--strict-qc",
        "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05",
    ], check=True)
    metadata = json.loads((ROOT / "processor/pipeline-meta.json").read_text())
    (ROOT / "frames").mkdir(exist_ok=True)
    sheet = Image.new("RGBA", (512, 512))
    frame_records = []
    for row, direction in enumerate(DIRECTIONS):
        frames = []
        strip = Image.new("RGBA", (512, CELL))
        for column in range(4):
            info = metadata["frames"][RAW_ROWS[row] * 4 + column]
            crop = clean.crop(info["source_box"]).crop(info["crop_bbox"])
            sized = crop.resize(tuple(info["output_size"]), Image.Resampling.NEAREST)
            frame = Image.new("RGBA", (CELL, CELL))
            frame.paste(sized, (info["paste_position"][0], 120 - sized.height))
            rgba = np.array(frame)
            edge = np.asarray(frame.getchannel("A").filter(ImageFilter.MinFilter(3))) == 0
            red, green, blue = rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2]
            chroma = ((red > 140) & (green < 100)) | ((green > 130) & (red < 120) & (blue < 120))
            fringe = edge & chroma & (rgba[:, :, 3] > 0)
            rgba[fringe, 3] = 0
            frame = Image.fromarray(rgba)
            frame.save(ROOT / "frames" / f"{direction}-{column}.png")
            frames.append(frame)
            strip.paste(frame, (column * CELL, 0))
            sheet.paste(frame, (column * CELL, row * CELL))
            bbox = frame.getbbox()
            assert bbox and bbox[0] > 0 and bbox[1] > 0 and bbox[2] < CELL and bbox[3] == 120
            frame_records.append({"direction": direction, "column": column, "bbox": bbox,
                                  "removedEdgeChromaPixels": int(fringe.sum())})
        strip.save(ROOT / f"{direction}-strip.png")
        frames[0].save(ROOT / f"{direction}.gif", save_all=True,
                       append_images=frames[1:], duration=DURATION, loop=0, disposal=2)
    sheet.save(ROOT / "choimis-flower-art128.png")
    sheet.save(ROOT / "sheet-transparent.png")
    sheet.resize((512, 512), Image.Resampling.NEAREST).save(ROOT / "runtime-128.png")
    sheet.save(ROOT.parents[2] / "sprites/choimis_flower.png")
    portrait = Image.new("RGBA", (48, 48))
    face = sheet.crop((37, 17, 92, 70)).resize((48, 46), Image.Resampling.NEAREST)
    portrait.paste(face, (0, 1))
    portrait.save(ROOT.parents[2] / "portraits/choimis_flower.png")
    portrait.resize((384, 384), Image.Resampling.NEAREST).save(ROOT / "portrait-preview-8x.png")
    sheet.crop((0, 0, CELL, CELL)).resize((512, 512), Image.Resampling.NEAREST).save(ROOT / "neutral-front-8x.png")
    with Image.open(ROOT.parents[2] / "sprites/choimis.png") as previous:
        comparison = Image.new("RGBA", (256, 128), "#eee8dd")
        comparison.alpha_composite(previous.crop((0, 0, 128, 128)), (0, 0))
        comparison.alpha_composite(sheet.crop((0, 0, CELL, CELL)), (128, 0))
        comparison.resize((1024, 512), Image.Resampling.NEAREST).save(ROOT / "old-new-comparison-4x.png")
    sheet.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / "preview-4x.png")
    for name, color in (("light", "#eee8dd"), ("dark", "#202431")):
        background = Image.new("RGBA", sheet.size, color)
        background.alpha_composite(sheet)
        background.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / f"preview-{name}-4x.png")
    report = {
        "rawSize": [1254, 1254], "sharedOuterCrop": [1, 1, 1253, 1253],
        "sourceGridSize": list(clean.size), "alphaThreshold": 128,
        "chromaKey": False, "edgeChromaCleanup": "one-pixel alpha boundary only; R>140,G<100 or G>130,R<120,B<120",
        "resample": "NEAREST", "paletteQuantization": False,
        "rawRows": DIRECTIONS, "runtimeRows": DIRECTIONS,
        "scale": metadata["frames"][0]["source_to_output_scale"],
        "processorQC": metadata["qc_summary"], "frames": frame_records,
        "note": "Processor output is geometry/QC only; delivered 128px frames use direct NEAREST and actual shoe baseline y120.",
    }
    (ROOT / "qc-meta.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
