#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "pydantic"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run export.py /absolute/path/to/subtarune
# Or: chmod +x export.py && ./export.py /absolute/path/to/subtarune
# ──────────────────
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image, ImageDraw
from pydantic import BaseModel, ConfigDict

ROOT: Final = Path(__file__).resolve().parent
DURATIONS: Final = (220, 260, 150, 260)
CELL: Final = 160
PIVOT: Final = (72, 152)


class SourceFrame(BaseModel):
    """Processor extraction coordinates; unrelated processor fields are ignored."""

    model_config = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]
    output_size: tuple[int, int]
    source_to_output_scale: float


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
    raw_boxes = [clean.crop((x * raw_cell, y * raw_cell, (x + 1) * raw_cell,
                            (y + 1) * raw_cell)).getbbox() for y in range(2) for x in range(2)]
    heights = [box[3] - box[1] for box in raw_boxes if box]
    scale = 140 / max(heights)
    subprocess.run([
        sys.executable, str(processor), "process", "--input", str(ROOT / "raw-sheet-clean.png"),
        "--target", "player", "--mode", "idle", "--rows", "2", "--cols", "2",
        "--cell-size", str(CELL), "--output-dir", str(ROOT / "processor"),
        "--duration", str(DURATIONS[0]),
        "--fit-scale", str(scale * raw_cell / CELL), "--align", "center", "--shared-scale",
        "--scale-strategy", "preserve", "--component-mode", "largest", "--component-padding", "0",
        "--threshold", "0", "--edge-threshold", "0", "--trim-border", "0",
        "--edge-clean-depth", "0", "--strict-qc", "--max-body-scale-cv", "0.08",
        "--max-anchor-y-std", "0.05",
    ], check=True)
    metadata = ProcessorResult.model_validate_json((ROOT / "processor/pipeline-meta.json").read_text())
    sheet = Image.new("RGBA", (320, 320))
    comparison = Image.new("RGBA", (640, 368), "#eee8dd")
    frames: list[Image.Image] = []
    records = []
    with Image.open(ROOT / "old-sheet-reference.png") as source:
        old_sheet = source.convert("RGBA")
    for index, info in enumerate(metadata.frames):
        crop = clean.crop(info.source_box).crop(info.crop_bbox)
        sized = crop.resize(info.output_size, Image.Resampling.NEAREST)
        alpha = np.asarray(sized.getchannel("A"))
        ys, xs = np.nonzero(alpha)
        foot_xs = xs[ys >= np.percentile(ys, 90)]
        feet_x = round((int(foot_xs.min()) + int(foot_xs.max())) / 2)
        paste = (PIVOT[0] - feet_x, PIVOT[1] - sized.height)
        assert paste[0] >= 0 and paste[1] >= 0
        assert paste[0] + sized.width < CELL and paste[1] + sized.height < CELL
        frame = Image.new("RGBA", (CELL, CELL))
        frame.paste(sized, paste)
        box = frame.getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < CELL and box[3] == PIVOT[1]
        frame.save(ROOT / f"frame-{index}.png")
        frames.append(frame)
        sheet.paste(frame, (index % 2 * CELL, index // 2 * CELL))
        old = old_sheet.crop((index % 2 * CELL, index // 2 * CELL,
                              index % 2 * CELL + CELL, index // 2 * CELL + CELL))
        old_box = old.getbbox()
        assert old_box
        base = (index % 2 * 320, index // 2 * 184)
        comparison.alpha_composite(old, (base[0], base[1] + 24))
        comparison.alpha_composite(frame, (base[0] + 160, base[1] + 24))
        draw = ImageDraw.Draw(comparison)
        draw.text((base[0] + 10, base[1] + 8), f"OLD / {index}", fill="#302e38")
        draw.text((base[0] + 170, base[1] + 8), f"CAPE / {index}", fill="#302e38")
        rgba = np.asarray(frame)
        pink = (rgba[:, :, 0] > 180) & (rgba[:, :, 2] > 130) & (rgba[:, :, 1] < 160) & (rgba[:, :, 3] > 0)
        final_y, final_x = np.nonzero(rgba[:, :, 3])
        feet_mask = final_y >= np.percentile(final_y, 90)
        records.append({
            "frame": index, "bbox": box, "bodyHeight": box[3] - box[1],
            "oldBodyHeight": old_box[3] - old_box[1], "pinkPixels": int(pink.sum()),
            "feetMidpointX": float((final_x[feet_mask].min() + final_x[feet_mask].max()) / 2),
            "feetBottomYExclusive": box[3],
            "paste": paste, "pasteClamped": False, "edgeTouch": False,
            "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest(),
        })
    sheet.save(ROOT / "sheet-transparent.png")
    frames[0].save(ROOT / "battle-neutral.png")
    frames[0].save(ROOT / "animation.gif", save_all=True, append_images=frames[1:],
                   duration=DURATIONS, loop=0, disposal=2)
    preview = Image.new("RGBA", sheet.size, "#eee8dd")
    preview.alpha_composite(sheet)
    preview.resize((1280, 1280), Image.Resampling.NEAREST).save(ROOT / "preview-4x.png")
    comparison.resize((1280, 736), Image.Resampling.NEAREST).save(ROOT / "old-vs-new-2x.png")
    playback = []
    for frame in frames:
        panel = Image.new("RGBA", frame.size, "#eee8dd")
        panel.alpha_composite(frame)
        playback.append(panel.resize((640, 640), Image.Resampling.NEAREST).convert("RGB"))
    playback[0].save(ROOT / "animation-preview-4x.gif", save_all=True, append_images=playback[1:],
                     duration=DURATIONS, loop=0, disposal=2)
    final_heights = [entry["bodyHeight"] for entry in records]
    old_heights = [entry["oldBodyHeight"] for entry in records]
    (ROOT / "qc-meta.json").write_text(json.dumps({
        "status": "asset-only; not integrated; user appearance approval pending",
        "rawSize": clean.size, "sheetSize": sheet.size, "cellSize": [CELL, CELL],
        "grid": [2, 2], "order": [0, 1, 2, 3], "pivot": PIVOT, "durationsMs": DURATIONS,
        "loop": True, "resample": "NEAREST", "alphaThreshold": 128, "chromaRemoval": False,
        "commonScale": scale, "rawBboxes": raw_boxes, "frames": records,
        "bodyHeightMean": float(np.mean(final_heights)), "oldBodyHeightMean": float(np.mean(old_heights)),
        "heightIncreasePercent": float((np.mean(final_heights) / np.mean(old_heights) - 1) * 100),
        "bodyHeightCV": float(np.std(final_heights) / np.mean(final_heights)),
        "uniqueRGBAFrames": len({frame.tobytes() for frame in frames}),
        "alphaValues": np.unique(np.asarray(sheet)[:, :, 3]).tolist(),
        "outputEdgeTouchFrames": [], "pasteClampedFrames": [],
        "processorMetadata": "processor/pipeline-meta.json",
        "rawSHA256": hashlib.sha256((ROOT / "raw-sheet.png").read_bytes()).hexdigest(),
        "oldReferenceSHA256": hashlib.sha256((ROOT / "old-sheet-reference.png").read_bytes()).hexdigest(),
        "processorSHA256": hashlib.sha256(processor.read_bytes()).hexdigest(),
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
