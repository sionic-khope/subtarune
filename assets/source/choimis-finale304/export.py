#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "pydantic", "scipy"]
# ///
# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run assets/source/choimis-finale304/export.py
# 3. Or: chmod +x export.py && ./export.py
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
from scipy.ndimage import find_objects, label

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
CELL: Final = (224, 192)
PIVOT: Final = (136, 180)
SCALE: Final = 140 / 411
DURATIONS: Final = (140, 110, 100, 120, 140, 190)


class SourceFrame(BaseModel):
    model_config = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]
    output_size: tuple[int, int]
    source_to_output_scale: float


class ProcessorResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    frames: tuple[SourceFrame, ...]


def main() -> None:
    processor = GAME / "tools/sprites/sheet_processor.py"
    with Image.open(ROOT / "raw-sheet.png") as source:
        pixels = np.array(source.convert("RGBA"))
    source_alpha = pixels[:, :, 3].copy()
    pixels[:, :, 3] = np.where(source_alpha >= 128, 255, 0)
    clean = Image.fromarray(pixels)
    clean.save(ROOT / "raw-sheet-clean.png")
    labels, count = label(pixels[:, :, 3] > 0)
    assert count == 6, "Every foreground pixel must belong to one of six poses"
    objects = find_objects(labels)
    regrid = Image.new("RGBA", (1024, 1536))
    source_records = []
    coverage = 0
    for index, slices in enumerate(objects):
        assert slices is not None
        area = int(np.count_nonzero(labels[slices] == index + 1))
        isolated = pixels[slices].copy()
        isolated[:, :, 3] = np.where(labels[slices] == index + 1, 255, 0)
        crop = Image.fromarray(isolated)
        box = (slices[1].start, slices[0].start, slices[1].stop, slices[0].stop)
        offset = ((512 - crop.width) // 2, (512 - crop.height) // 2)
        regrid.paste(crop, (index % 2 * 512 + offset[0], index // 2 * 512 + offset[1]))
        source_records.append({"frame": index, "component": index + 1, "bbox": box,
                               "opaquePixels": area, "regridOffset": offset})
        coverage += area
    assert coverage == int(np.count_nonzero(pixels[:, :, 3])) == 355476
    regrid.save(ROOT / "raw-regridded.png")
    subprocess.run([
        sys.executable, str(processor), "process", "--input", str(ROOT / "raw-regridded.png"),
        "--target", "player", "--mode", "attack", "--rows", "3", "--cols", "2",
        "--cell-size", "224", "--output-dir", str(ROOT / "processor"),
        "--duration", "140", "--fit-scale", str(SCALE * 512 / 224),
        "--align", "center", "--shared-scale", "--scale-strategy", "preserve",
        "--component-mode", "largest", "--component-padding", "0", "--threshold", "0",
        "--edge-threshold", "0", "--trim-border", "0", "--edge-clean-depth", "0",
        "--strict-qc", "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05",
    ], check=True)
    metadata = ProcessorResult.model_validate_json((ROOT / "processor/pipeline-meta.json").read_text())
    sheet = Image.new("RGBA", (CELL[0] * 2, CELL[1] * 3))
    comparison = Image.new("RGBA", (896, 672), "#eee8dd")
    with Image.open(GAME / "assets/enemies/choimis-flower-idle.png") as source:
        idle_sheet = source.convert("RGBA")
    idle = idle_sheet.crop((0, 0, 160, 160))
    frames: list[Image.Image] = []
    records = []
    for index, info in enumerate(metadata.frames):
        assert abs(info.source_to_output_scale - SCALE) < 1e-12
        crop = regrid.crop(info.source_box).crop(info.crop_bbox)
        sized = crop.resize(info.output_size, Image.Resampling.NEAREST)
        ys, xs = np.nonzero(np.asarray(sized.getchannel("A")))
        shoes = xs[ys >= ys.max() - 0.1 * (ys.max() - ys.min())]
        feet_x = round((int(shoes.min()) + int(shoes.max())) / 2)
        paste = (PIVOT[0] - feet_x, PIVOT[1] - sized.height)
        assert paste[0] > 0 and paste[1] > 0
        assert paste[0] + sized.width < CELL[0] and paste[1] + sized.height < CELL[1]
        frame = Image.new("RGBA", CELL)
        frame.paste(sized, paste)
        box = frame.getbbox()
        assert box and box[3] == PIVOT[1]
        frame.save(ROOT / f"frame-{index}.png")
        frames.append(frame)
        sheet.paste(frame, (index % 2 * CELL[0], index // 2 * CELL[1]))
        base = (index % 2 * 448, index // 2 * 224)
        comparison.alpha_composite(idle, (base[0] + 64, base[1] + 28))
        comparison.alpha_composite(frame, (base[0] + 224, base[1]))
        ImageDraw.Draw(comparison).text((base[0] + 80, base[1] + 202), "IDLE", fill="#302e38")
        ImageDraw.Draw(comparison).text((base[0] + 290, base[1] + 202), f"SWING {index}", fill="#302e38")
        rgba = np.asarray(frame)
        records.append({"frame": index, "bbox": box, "poseHeight": box[3] - box[1],
                        "paste": paste, "feetMidpointX": float((shoes.min() + shoes.max()) / 2 + paste[0]),
                        "roundedFootAnchorX": PIVOT[0], "feetBottomYExclusive": PIVOT[1],
                        "opaquePixels": int(np.count_nonzero(rgba[:, :, 3])),
                        "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest(),
                        "edgeTouch": False, "pasteClamped": False})
    sheet.save(ROOT / "sheet-transparent.png")
    sheet.save(GAME / "assets/enemies/choimis-cape-swing.png")
    frames[0].save(ROOT / "animation.gif", save_all=True, append_images=frames[1:],
                   duration=DURATIONS, loop=0, disposal=2, transparency=0)
    preview = Image.new("RGBA", sheet.size, "#eee8dd")
    preview.alpha_composite(sheet)
    preview.resize((896, 1152), Image.Resampling.NEAREST).save(ROOT / "preview-2x.png")
    comparison.resize((1792, 1344), Image.Resampling.NEAREST).save(ROOT / "idle-comparison-2x.png")
    playback = []
    for frame in frames:
        panel = Image.new("RGBA", CELL, "#eee8dd")
        panel.alpha_composite(frame)
        playback.append(panel.resize((672, 576), Image.Resampling.NEAREST).convert("RGB"))
    playback[0].save(ROOT / "animation-preview-3x.gif", save_all=True, append_images=playback[1:],
                     duration=DURATIONS, loop=0, disposal=2)
    (ROOT / "qc-meta.json").write_text(json.dumps({
        "status": "asset exported; runtime integration and visual approval separate",
        "rawSize": clean.size, "sheetSize": sheet.size, "cellSize": CELL, "pivot": PIVOT,
        "columns": 2, "rows": 3, "durationsMs": DURATIONS, "runtimeScale": 0.714,
        "commonScale": SCALE, "referenceAnatomicalHeight": 140, "referenceRawHeight": 411,
        "sourceComponents": source_records, "losslessAlpha128Coverage": coverage,
        "sourceAlphaZeroPixels": int(np.count_nonzero(source_alpha == 0)),
        "sourceAlphaNonzeroPixels": int(np.count_nonzero(source_alpha)),
        "discardedForegroundComponents": 0, "alphaThreshold": 128,
        "uniformRawGridRejected": "middle-left cape crosses x512; six disconnected components recovered",
        "resample": "NEAREST", "chromaRemoval": False, "paletteChange": False,
        "anchorMethod": "midpoint of occupied x range within geometric lowest10% bbox height",
        "frames": records, "uniqueRGBAFrames": len({frame.tobytes() for frame in frames}),
        "alphaValues": np.unique(np.asarray(sheet)[:, :, 3]).tolist(),
        "outputEdgeTouchFrames": [], "pasteClampedFrames": [],
        "generator": "built-in image_gen", "model": "unknown", "price": "unknown", "generations": 1,
        "rawSHA256": hashlib.sha256((ROOT / "raw-sheet.png").read_bytes()).hexdigest(),
        "processorSHA256": hashlib.sha256(processor.read_bytes()).hexdigest(),
        "idleReferenceSHA256": hashlib.sha256((GAME / "assets/enemies/choimis-flower-idle.png").read_bytes()).hexdigest(),
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
