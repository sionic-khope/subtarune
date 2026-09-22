#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
# How to run: uv run assets/source/choimis-flower291/battle/export.py tools/sprites/sheet_processor.py.
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image, ImageFilter

ROOT: Final = Path(__file__).resolve().parent
DURATIONS: Final = (300, 220, 300, 300)


def main() -> None:
    with Image.open(ROOT / "raw-sheet.png") as source:
        pixels = np.array(source.convert("RGBA"))
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    clean = Image.fromarray(pixels)
    clean.save(ROOT / "raw-sheet-clean.png")
    subprocess.run([
        sys.executable, str(Path(sys.argv[1]).resolve()), "process",
        "--input", str(ROOT / "raw-sheet-clean.png"),
        "--target", "player", "--mode", "idle", "--rows", "2", "--cols", "2",
        "--cell-size", "128", "--output-dir", str(ROOT / "processor"),
        "--fit-scale", "0.98", "--align", "center", "--shared-scale",
        "--scale-strategy", "preserve", "--component-mode", "largest",
        "--threshold", "0", "--edge-threshold", "0", "--trim-border", "0",
        "--edge-clean-depth", "0", "--strict-qc", "--max-body-scale-cv", "0.08",
        "--max-anchor-y-std", "0.05",
    ], check=True)
    metadata = json.loads((ROOT / "processor/pipeline-meta.json").read_text())
    sheet = Image.new("RGBA", (256, 256))
    frames = []
    records = []
    for index, info in enumerate(metadata["frames"]):
        crop = clean.crop(info["source_box"]).crop(info["crop_bbox"])
        sized = crop.resize(tuple(info["output_size"]), Image.Resampling.NEAREST)
        alpha = np.asarray(sized.getchannel("A"))
        ys, xs = np.nonzero(alpha)
        feet_x = int(np.median(xs[ys >= np.percentile(ys, 90)]))
        frame = Image.new("RGBA", (128, 128))
        frame.paste(sized, (64 - feet_x, 120 - sized.height))
        rgba = np.array(frame)
        edge = np.asarray(frame.getchannel("A").filter(ImageFilter.MinFilter(3))) == 0
        red, green, blue = rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2]
        chroma = ((red > 140) & (green < 100)) | ((green > 130) & (red < 120) & (blue < 120))
        fringe = edge & chroma & (rgba[:, :, 3] > 0)
        rgba[fringe, 3] = 0
        frame = Image.fromarray(rgba)
        box = frame.getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < 128 and box[3] == 120
        frame.save(ROOT / f"frame-{index}.png")
        frames.append(frame)
        sheet.paste(frame, (index % 2 * 128, index // 2 * 128))
        records.append({"frame": index, "bbox": box, "removedEdgeChromaPixels": int(fringe.sum())})
    sheet.save(ROOT / "sheet-transparent.png")
    sheet.save(ROOT.parents[2] / "enemies/choimis-flower-idle.png")
    frames[0].save(ROOT / "battle-neutral.png")
    frames[0].save(ROOT / "idle.gif", save_all=True, append_images=frames[1:], duration=DURATIONS, loop=0, disposal=2)
    background = Image.new("RGBA", sheet.size, "#eee8dd")
    background.alpha_composite(sheet)
    background.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / "preview-4x.png")
    (ROOT / "qc-meta.json").write_text(json.dumps({
        "scale": metadata["frames"][0]["source_to_output_scale"],
        "processorQC": metadata["qc_summary"], "frames": records,
        "resample": "NEAREST", "alphaThreshold": 128,
        "pivot": [64, 120], "frameDurations": [value / 1000 for value in DURATIONS],
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
