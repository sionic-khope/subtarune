#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "pydantic"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run assets/source/choimis-dolphin301/export.py /absolute/path/to/subtarune
# ──────────────────
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image
from pydantic import BaseModel, ConfigDict

ROOT: Final = Path(__file__).resolve().parent
CELL: Final = 32
PIVOT: Final = (16, 30)
DURATIONS: Final = (350, 350, 350, 350)


class SourceFrame(BaseModel):
    model_config = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]
    output_size: tuple[int, int]


class ProcessorResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    frames: tuple[SourceFrame, ...]


def main() -> None:
    game = Path(sys.argv[1]).resolve()
    processor = game / "tools/sprites/sheet_processor.py"
    with Image.open(ROOT / "raw-sheet.png") as source:
        pixels = np.array(source.convert("RGBA"))
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    clean = Image.fromarray(pixels)
    clean.save(ROOT / "raw-sheet-clean.png")
    raw_cell = clean.width // 2
    raw_row = clean.height // 2
    boxes = [clean.crop((x * raw_cell, y * raw_row, (x + 1) * raw_cell,
                        (y + 1) * raw_row)).getbbox() for y in range(2) for x in range(2)]
    assert all(boxes)
    scale = 28 / max(max(box[2] - box[0], box[3] - box[1]) for box in boxes if box)
    subprocess.run([
        sys.executable, str(processor), "process", "--input", str(ROOT / "raw-sheet-clean.png"),
        "--target", "asset", "--mode", "idle", "--rows", "2", "--cols", "2",
        "--cell-size", str(CELL), "--output-dir", str(ROOT / "processor"),
        "--duration", "350", "--fit-scale", str(scale * raw_cell / CELL),
        "--align", "center", "--shared-scale", "--scale-strategy", "preserve",
        "--component-mode", "all", "--component-padding", "0", "--threshold", "0",
        "--edge-threshold", "0", "--trim-border", "0", "--edge-clean-depth", "0",
    ], check=True)
    meta = ProcessorResult.model_validate_json((ROOT / "processor/pipeline-meta.json").read_text())
    strip = Image.new("RGBA", (128, 32))
    frames: list[Image.Image] = []
    preview_frames: list[Image.Image] = []
    records = []
    for index, info in enumerate(meta.frames):
        crop = clean.crop(info.source_box).crop(info.crop_bbox)
        sized = crop.resize(info.output_size, Image.Resampling.NEAREST)
        paste = ((CELL - sized.width) // 2, PIVOT[1] - sized.height)
        assert paste[0] > 0 and paste[1] > 0
        frame = Image.new("RGBA", (CELL, CELL))
        frame.paste(sized, paste)
        box = frame.getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < CELL and box[3] <= PIVOT[1]
        frame.save(ROOT / f"frame-{index}.png")
        strip.paste(frame, (index * CELL, 0))
        frames.append(frame)
        panel = Image.new("RGBA", frame.size, "#244e71")
        panel.alpha_composite(frame)
        preview_frames.append(panel.resize((256, 256), Image.Resampling.NEAREST).convert("RGB"))
        records.append({"frame": index, "bbox": box, "paste": paste, "edgeTouch": False,
                        "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest()})
    assert len({frame.tobytes() for frame in frames}) == 4
    strip.save(ROOT / "sheet-transparent.png")
    shutil.copyfile(ROOT / "sheet-transparent.png", game / "assets/props/choimis-dolphin-breach.png")
    preview = Image.new("RGBA", strip.size, "#244e71")
    preview.alpha_composite(strip)
    preview.resize((1024, 256), Image.Resampling.NEAREST).save(ROOT / "preview-8x.png")
    frames[0].save(ROOT / "animation.gif", save_all=True, append_images=frames[1:],
                   duration=DURATIONS, loop=0, disposal=2)
    preview_frames[0].save(ROOT / "animation-preview-8x.gif", save_all=True,
                           append_images=preview_frames[1:], duration=DURATIONS, loop=0)
    (ROOT / "qc-meta.json").write_text(json.dumps({
        "rawSize": clean.size, "cellSize": [32, 32], "grid": [1, 4], "sheetSize": strip.size,
        "order": ["emerge", "apex", "dive", "splash-tail"], "pivot": PIVOT,
        "commonScale": scale, "durationsMs": DURATIONS, "componentMode": "all",
        "resample": "NEAREST", "alphaThreshold": 128, "alphaValues": [0, 255],
        "rawBboxes": boxes, "frames": records, "uniqueFrames": 4,
        "rawSHA256": hashlib.sha256((ROOT / "raw-sheet.png").read_bytes()).hexdigest(),
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
