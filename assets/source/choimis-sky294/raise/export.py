#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "pydantic"]
# ///
# ─── How to run ───
# uv run export.py /absolute/path/to/subtarune
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
from PIL import Image, ImageDraw
from pydantic import BaseModel, ConfigDict

ROOT: Final = Path(__file__).resolve().parent
CELL: Final = 160
PIVOT: Final = (80, 152)
DURATIONS_MS: Final = (300, 350, 350, 450)
NEUTRAL_HEIGHT: Final = 123


class SourceFrame(BaseModel):
    model_config = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]
    output_size: tuple[int, int]


class ProcessorResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    frames: tuple[SourceFrame, ...]


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        msg = "A required source frame has no opaque pixels"
        raise RuntimeError(msg)
    return bbox


def median_foot_x(image: Image.Image) -> int:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.nonzero(alpha)
    if len(ys) == 0:
        msg = "Cannot derive a foot pivot from an empty frame"
        raise RuntimeError(msg)
    lower_band = ys >= np.percentile(ys, 90)
    return int(np.median(xs[lower_band]))


def assert_final_frame(frame: Image.Image) -> tuple[int, int, int, int]:
    bbox = alpha_bbox(frame)
    if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= CELL or bbox[3] != PIVOT[1]:
        msg = f"Final frame violates containment or feet anchor: {bbox}"
        raise RuntimeError(msg)
    return bbox


def main() -> None:
    if len(sys.argv) != 2:
        msg = "Usage: uv run export.py /absolute/path/to/subtarune"
        raise RuntimeError(msg)
    game = Path(sys.argv[1]).resolve()
    processor = game / "tools/sprites/sheet_processor.py"
    output_enemy = game / "assets/enemies/choimis-flower-raise.png"
    raw_path = ROOT / "raw-sheet.png"
    clean_path = ROOT / "raw-sheet-clean.png"
    with Image.open(raw_path) as raw_source:
        raw = raw_source.convert("RGBA")
    pixels = np.asarray(raw).copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    clean = Image.fromarray(pixels)
    clean.save(clean_path)
    if clean.width != clean.height or clean.width % 2 != 0:
        msg = f"Expected a square 2×2 raw sheet, got {clean.size}"
        raise RuntimeError(msg)
    raw_cell = clean.width // 2
    raw_bboxes = [
        alpha_bbox(clean.crop((column * raw_cell, row * raw_cell, (column + 1) * raw_cell, (row + 1) * raw_cell)))
        for row in range(2)
        for column in range(2)
    ]
    neutral_raw_height = raw_bboxes[0][3] - raw_bboxes[0][1]
    shared_scale = NEUTRAL_HEIGHT / neutral_raw_height
    subprocess.run(
        [
            sys.executable,
            str(processor),
            "process",
            "--input",
            str(clean_path),
            "--target",
            "player",
            "--mode",
            "idle",
            "--rows",
            "2",
            "--cols",
            "2",
            "--cell-size",
            str(CELL),
            "--output-dir",
            str(ROOT / "processor"),
            "--fit-scale",
            str(shared_scale * raw_cell / CELL),
            "--align",
            "center",
            "--shared-scale",
            "--scale-strategy",
            "preserve",
            "--component-mode",
            "largest",
            "--component-padding",
            "0",
            "--threshold",
            "0",
            "--edge-threshold",
            "0",
            "--trim-border",
            "0",
            "--edge-clean-depth",
            "0",
            "--strict-qc",
            "--max-body-scale-cv",
            "0.08",
            "--max-anchor-y-std",
            "0.05",
        ],
        check=True,
    )
    metadata = ProcessorResult.model_validate_json((ROOT / "processor/pipeline-meta.json").read_text())
    if len(metadata.frames) != 4:
        msg = f"Expected four processed source frames, got {len(metadata.frames)}"
        raise RuntimeError(msg)
    final_sheet = Image.new("RGBA", (CELL * 2, CELL * 2))
    comparison = Image.new("RGBA", (CELL * 4, CELL * 2), "#eee8dd")
    preview_frames: list[Image.Image] = []
    records: list[dict[str, object]] = []
    with Image.open(ROOT / "battle-neutral-292-reference.png") as reference_source:
        reference = reference_source.convert("RGBA")
    reference_box = alpha_bbox(reference)
    for index, source_frame in enumerate(metadata.frames):
        crop = clean.crop(source_frame.source_box).crop(source_frame.crop_bbox)
        output_size = (
            round(crop.width * shared_scale),
            round(crop.height * shared_scale),
        )
        sized = crop.resize(output_size, Image.Resampling.NEAREST)
        paste = (PIVOT[0] - median_foot_x(sized), PIVOT[1] - sized.height)
        if paste[0] < 0 or paste[1] < 0 or paste[0] + sized.width >= CELL or paste[1] + sized.height >= CELL:
            msg = f"Frame {index} would be clipped at paste {paste} with size {sized.size}"
            raise RuntimeError(msg)
        frame = Image.new("RGBA", (CELL, CELL))
        frame.paste(sized, paste)
        bbox = assert_final_frame(frame)
        frame.save(ROOT / f"frame-{index}.png")
        final_sheet.alpha_composite(frame, ((index % 2) * CELL, (index // 2) * CELL))
        panel_x = (index % 2) * CELL * 2
        panel_y = (index // 2) * CELL
        comparison.alpha_composite(reference, (panel_x, panel_y))
        comparison.alpha_composite(frame, (panel_x + CELL, panel_y))
        labels = ImageDraw.Draw(comparison)
        labels.text((panel_x + 4, panel_y + 4), "292 neutral", fill="#302e38")
        labels.text((panel_x + CELL + 4, panel_y + 4), f"294 raise {index}", fill="#302e38")
        alpha = np.asarray(frame.getchannel("A"))
        ys, xs = np.nonzero(alpha)
        records.append(
            {
                "frame": index,
                "rawBBox": raw_bboxes[index],
                "finalBBox": bbox,
                "finalHeight": bbox[3] - bbox[1],
                "feetMedianX": median_foot_x(frame),
                "feetBottomYExclusive": bbox[3],
                "opaquePixels": int(len(xs)),
                "paste": paste,
                "pasteClamped": False,
                "edgeTouch": False,
                "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest(),
            }
        )
        panel = Image.new("RGBA", (CELL, CELL), "#eee8dd")
        panel.alpha_composite(frame)
        preview_frames.append(panel.resize((CELL * 4, CELL * 4), Image.Resampling.NEAREST).convert("RGB"))
    final_sheet.save(ROOT / "sheet-transparent.png")
    shutil.copyfile(ROOT / "sheet-transparent.png", output_enemy)
    final_sheet.resize((CELL * 8, CELL * 8), Image.Resampling.NEAREST).save(ROOT / "preview-4x.png")
    comparison.resize((CELL * 8, CELL * 4), Image.Resampling.NEAREST).save(ROOT / "comparison-all4-with-292-neutral-2x.png")
    preview_frames[0].save(
        ROOT / "animation-preview-4x.gif",
        save_all=True,
        append_images=preview_frames[1:],
        duration=DURATIONS_MS,
        loop=0,
        disposal=2,
    )
    Image.open(ROOT / "frame-0.png").save(
        ROOT / "animation.gif",
        save_all=True,
        append_images=[Image.open(ROOT / f"frame-{index}.png") for index in range(1, 4)],
        duration=DURATIONS_MS,
        loop=0,
        disposal=2,
    )
    qc = {
        "status": "asset-only; runtime registration is owned by the scene integrator",
        "rawSize": list(clean.size),
        "sheetSize": list(final_sheet.size),
        "cellSize": [CELL, CELL],
        "grid": [2, 2],
        "order": [0, 1, 2, 3],
        "poseContract": ["arm-waist", "palm-chest", "arm-overhead", "hold-cape"],
        "pivot": list(PIVOT),
        "durationsMs": list(DURATIONS_MS),
        "playback": "one-shot 0→1→2→3, then hold frame 3; optional light 2↔3 cape loop after completion",
        "resample": "NEAREST",
        "alphaThreshold": 128,
        "chromaRemoval": False,
        "sharedScale": shared_scale,
        "neutralRawHeight": neutral_raw_height,
        "neutralTargetHeight": NEUTRAL_HEIGHT,
        "reference292BBox": reference_box,
        "frames": records,
        "uniqueRGBAFrames": len({(ROOT / f"frame-{index}.png").read_bytes() for index in range(4)}),
        "alphaValues": np.unique(np.asarray(final_sheet.getchannel("A"))).tolist(),
        "outputEdgeTouchFrames": [],
        "pasteClampedFrames": [],
        "processorMetadata": "processor/pipeline-meta.json",
        "rawSHA256": hashlib.sha256(raw_path.read_bytes()).hexdigest(),
        "reference292SHA256": hashlib.sha256((ROOT / "battle-neutral-292-reference.png").read_bytes()).hexdigest(),
        "processorSHA256": hashlib.sha256(processor.read_bytes()).hexdigest(),
    }
    (ROOT / "qc-meta.json").write_text(json.dumps(qc, indent=2) + "\n")


if __name__ == "__main__":
    main()
