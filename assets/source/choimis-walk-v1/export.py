# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
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
RAW_ROWS: Final = (0, 3, 1, 2)
CELL: Final = 64
DURATION: Final = 160


def main() -> None:
    processor = Path(sys.argv[1]).resolve()
    with Image.open(ROOT / "raw-sheet.png") as source:
        pixels = np.array(source.convert("RGBA"))
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    clean = Image.fromarray(pixels).crop((10, 10, 1210, 1250))
    clean.save(ROOT / "raw-sheet-clean.png")
    subprocess.run([
        sys.executable, str(processor), "process",
        "--input", str(ROOT / "raw-sheet-clean.png"),
        "--target", "player", "--mode", "player_sheet",
        "--rows", "4", "--cols", "4", "--cell-size", "64",
        "--output-dir", str(ROOT / "processor"),
        "--fit-scale", "0.84", "--align", "bottom", "--shared-scale",
        "--scale-strategy", "preserve", "--component-mode", "all",
        "--threshold", "0", "--edge-threshold", "0",
        "--trim-border", "0", "--edge-clean-depth", "0",
        "--duration", str(DURATION), "--strict-qc",
        "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05",
    ], check=True)
    metadata = json.loads((ROOT / "processor/pipeline-meta.json").read_text())
    (ROOT / "frames").mkdir(exist_ok=True)
    sheet = Image.new("RGBA", (256, 256))
    frame_records = []
    for row, direction in enumerate(DIRECTIONS):
        frames = []
        strip = Image.new("RGBA", (256, 64))
        for column in range(4):
            info = metadata["frames"][RAW_ROWS[row] * 4 + column]
            crop = clean.crop(info["source_box"]).crop(info["crop_bbox"])
            sized = crop.resize(tuple(info["output_size"]), Image.Resampling.NEAREST)
            frame = Image.new("RGBA", (CELL, CELL))
            frame.paste(sized, (info["paste_position"][0], 60 - sized.height))
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
            assert bbox and bbox[0] > 0 and bbox[1] > 0 and bbox[2] < 64 and bbox[3] < 64
            frame_records.append({"direction": direction, "column": column, "bbox": bbox,
                                  "removedEdgeChromaPixels": int(fringe.sum())})
        strip.save(ROOT / f"{direction}-strip.png")
        frames[0].save(ROOT / f"{direction}.gif", save_all=True,
                       append_images=frames[1:], duration=DURATION, loop=0, disposal=2)
    sheet.save(ROOT / "choimis.png")
    sheet.save(ROOT / "sheet-transparent.png")
    sheet.resize((512, 512), Image.Resampling.NEAREST).save(ROOT / "runtime-128.png")
    sheet.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / "preview-4x.png")
    for name, color in (("light", "#eee8dd"), ("dark", "#202431")):
        background = Image.new("RGBA", sheet.size, color)
        background.alpha_composite(sheet)
        background.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / f"preview-{name}-4x.png")
    report = {
        "rawSize": [1235, 1274], "sharedOuterCrop": [10, 10, 1210, 1250],
        "sourceGridSize": list(clean.size), "alphaThreshold": 128,
        "chromaKey": False, "edgeChromaCleanup": "one-pixel alpha boundary only; R>140,G<100 or G>130,R<120,B<120",
        "resample": "NEAREST", "paletteQuantization": False,
        "rawRows": ["down", "left", "right", "up"], "runtimeRows": DIRECTIONS,
        "scale": metadata["frames"][0]["source_to_output_scale"],
        "processorQC": metadata["qc_summary"], "frames": frame_records,
        "note": "Processor output is geometry/QC only; delivered frames use NEAREST.",
    }
    (ROOT / "qc-meta.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
