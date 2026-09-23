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
from collections import deque
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image, ImageDraw
from pydantic import BaseModel, ConfigDict

ROOT: Final = Path(__file__).resolve().parent
CELL: Final = 128
PIVOT: Final = (64, 120)
DIRECTIONS: Final = ("down", "up", "left", "right")
DURATION_MS: Final = 160
MAX_VISIBLE_HEIGHT: Final = 112


class SourceFrame(BaseModel):
    model_config = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]


class ProcessorResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    frames: tuple[SourceFrame, ...]


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError("A required source cell is empty")
    return bbox


def foot_center_x(image: Image.Image) -> int:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.nonzero(alpha)
    if len(ys) == 0:
        raise RuntimeError("Cannot derive a foot pivot from an empty frame")
    lower_band = ys >= np.percentile(ys, 90)
    return int(round((xs[lower_band].min() + xs[lower_band].max()) / 2))


def remove_components_below_main(image: Image.Image) -> tuple[Image.Image, list[tuple[int, int, int, int]]]:
    rgba = np.asarray(image.convert("RGBA")).copy()
    alpha = rgba[:, :, 3]
    height, width = alpha.shape
    visited = np.zeros((height, width), dtype=bool)
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            if alpha[y, x] == 0 or visited[y, x]:
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[y, x] = True
            component: list[tuple[int, int]] = []
            while queue:
                current_x, current_y = queue.popleft()
                component.append((current_x, current_y))
                for neighbor_x, neighbor_y in ((current_x - 1, current_y), (current_x + 1, current_y), (current_x, current_y - 1), (current_x, current_y + 1)):
                    if 0 <= neighbor_x < width and 0 <= neighbor_y < height and alpha[neighbor_y, neighbor_x] > 0 and not visited[neighbor_y, neighbor_x]:
                        visited[neighbor_y, neighbor_x] = True
                        queue.append((neighbor_x, neighbor_y))
            components.append(component)
    if not components:
        raise RuntimeError("A required source cell is empty")
    main_component = max(components, key=len)
    main_bottom = max(y for _, y in main_component)
    removed_bboxes: list[tuple[int, int, int, int]] = []
    for component in components:
        component_top = min(y for _, y in component)
        if component is main_component or component_top <= main_bottom:
            continue
        xs = [x for x, _ in component]
        ys = [y for _, y in component]
        removed_bboxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
        for x, y in component:
            rgba[y, x, 3] = 0
    return Image.fromarray(rgba), removed_bboxes


def main() -> None:
    if len(sys.argv) != 2:
        raise RuntimeError("Usage: uv run export.py /absolute/path/to/subtarune")
    game = Path(sys.argv[1]).resolve()
    processor = game / "tools/sprites/sheet_processor.py"
    output_runtime = game / "assets/sprites/choimis_flower.png"
    with Image.open(ROOT / "raw-sheet.png") as source:
        raw = source.convert("RGBA")
    pixels = np.asarray(raw).copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    clean = Image.fromarray(pixels)
    normalized_size = clean.width - clean.width % 4
    if clean.width != clean.height or normalized_size <= 0:
        raise RuntimeError(f"Expected a non-empty square source, got {clean.size}")
    clean = clean.crop((0, 0, normalized_size, normalized_size))
    raw_cell = clean.width // 4
    cleaned_sheet = Image.new("RGBA", clean.size)
    removed_noise: list[list[tuple[int, int, int, int]]] = []
    for row in range(4):
        for column in range(4):
            cell = clean.crop((column * raw_cell, row * raw_cell, (column + 1) * raw_cell, (row + 1) * raw_cell))
            cleaned_cell, removed_bboxes = remove_components_below_main(cell)
            cleaned_sheet.alpha_composite(cleaned_cell, (column * raw_cell, row * raw_cell))
            removed_noise.append(removed_bboxes)
    clean = cleaned_sheet
    clean.save(ROOT / "raw-sheet-clean.png")
    raw_bboxes = [
        alpha_bbox(clean.crop((column * raw_cell, row * raw_cell, (column + 1) * raw_cell, (row + 1) * raw_cell)))
        for row in range(4)
        for column in range(4)
    ]
    shared_scale = MAX_VISIBLE_HEIGHT / max(bbox[3] - bbox[1] for bbox in raw_bboxes)
    subprocess.run(
        [
            sys.executable,
            str(processor),
            "process",
            "--input",
            str(ROOT / "raw-sheet-clean.png"),
            "--target",
            "player",
            "--mode",
            "player_sheet",
            "--rows",
            "4",
            "--cols",
            "4",
            "--cell-size",
            str(CELL),
            "--output-dir",
            str(ROOT / "processor"),
            "--fit-scale",
            str(shared_scale * raw_cell / CELL),
            "--align",
            "bottom",
            "--shared-scale",
            "--scale-strategy",
            "preserve",
            "--component-mode",
            "all",
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
            "--duration",
            str(DURATION_MS),
        ],
        check=True,
    )
    metadata = ProcessorResult.model_validate_json((ROOT / "processor/pipeline-meta.json").read_text())
    if len(metadata.frames) != 16:
        raise RuntimeError(f"Expected sixteen processor frames, got {len(metadata.frames)}")
    sheet = Image.new("RGBA", (CELL * 4, CELL * 4))
    preview = Image.new("RGBA", sheet.size, "#eee8dd")
    frame_records: list[dict[str, object]] = []
    strips: dict[str, list[Image.Image]] = {direction: [] for direction in DIRECTIONS}
    for row, direction in enumerate(DIRECTIONS):
        for column in range(4):
            index = row * 4 + column
            info = metadata.frames[index]
            crop = clean.crop(info.source_box).crop(info.crop_bbox)
            sized = crop.resize(
                (round(crop.width * shared_scale), round(crop.height * shared_scale)),
                Image.Resampling.NEAREST,
            )
            paste = (PIVOT[0] - foot_center_x(sized), PIVOT[1] - sized.height)
            if paste[0] < 0 or paste[1] < 0 or paste[0] + sized.width >= CELL or paste[1] + sized.height >= CELL:
                raise RuntimeError(f"Frame {direction}/{column} would be clipped: paste={paste}, size={sized.size}")
            frame = Image.new("RGBA", (CELL, CELL))
            frame.paste(sized, paste)
            bbox = alpha_bbox(frame)
            if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= CELL or bbox[3] != PIVOT[1]:
                raise RuntimeError(f"Frame {direction}/{column} violates final containment or feet anchor: {bbox}")
            frame.save(ROOT / f"frame-{direction}-{column}.png")
            strips[direction].append(frame)
            sheet.alpha_composite(frame, (column * CELL, row * CELL))
            frame_records.append(
                {
                    "direction": direction,
                    "frame": column,
                    "rawBBox": raw_bboxes[index],
                    "removedDetachedBelowFeet": removed_noise[index],
                    "finalBBox": bbox,
                    "visibleHeight": bbox[3] - bbox[1],
                    "feetCenterX": foot_center_x(frame),
                    "feetBottomYExclusive": bbox[3],
                    "paste": paste,
                    "edgeTouch": False,
                    "pasteClamped": False,
                    "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest(),
                }
            )
    for row, direction in enumerate(DIRECTIONS):
        strip = Image.new("RGBA", (CELL * 4, CELL))
        for column, frame in enumerate(strips[direction]):
            strip.alpha_composite(frame, (column * CELL, 0))
        strip.save(ROOT / f"{direction}-strip.png")
        strips[direction][0].save(
            ROOT / f"{direction}.gif",
            save_all=True,
            append_images=strips[direction][1:],
            duration=DURATION_MS,
            loop=0,
            disposal=2,
        )
    sheet.save(ROOT / "sheet-transparent.png")
    shutil.copyfile(ROOT / "sheet-transparent.png", output_runtime)
    preview.alpha_composite(sheet)
    preview.resize((2048, 2048), Image.Resampling.NEAREST).save(ROOT / "preview-contact-4x.png")
    with Image.open(ROOT / "choimis-flower-runtime-before303.png") as source:
        previous = source.convert("RGBA")
    comparison = Image.new("RGBA", (sheet.width * 2, sheet.height), "#eee8dd")
    comparison.alpha_composite(previous, (0, 0))
    comparison.alpha_composite(sheet, (sheet.width, 0))
    labels = ImageDraw.Draw(comparison)
    labels.text((8, 8), "previous field", fill="#302e38")
    labels.text((sheet.width + 8, 8), "303 field", fill="#302e38")
    comparison.resize((4096, 2048), Image.Resampling.NEAREST).save(ROOT / "previous-vs-field303-contact-4x.png")
    qc = {
        "status": "asset-only; runtime sheet copied but gameplay integration is not part of this export",
        "rawSize": list(clean.size),
        "sheetSize": list(sheet.size),
        "grid": [4, 4],
        "cellSize": [CELL, CELL],
        "directions": list(DIRECTIONS),
        "frameOrder": [0, 1, 2, 3],
        "pivot": list(PIVOT),
        "durationMs": DURATION_MS,
        "loop": True,
        "alphaThreshold": 128,
        "chromaRemoval": False,
        "resample": "NEAREST",
        "sharedScale": shared_scale,
        "maxVisibleHeight": MAX_VISIBLE_HEIGHT,
        "rawBboxes": raw_bboxes,
        "removedDetachedBelowFeet": removed_noise,
        "frames": frame_records,
        "uniqueRGBAFrames": len({(ROOT / f"frame-{direction}-{column}.png").read_bytes() for direction in DIRECTIONS for column in range(4)}),
        "alphaValues": np.unique(np.asarray(sheet.getchannel("A"))).tolist(),
        "outputEdgeTouchFrames": [],
        "pasteClampedFrames": [],
        "processorMetadata": "processor/pipeline-meta.json",
        "rawSHA256": hashlib.sha256((ROOT / "raw-sheet.png").read_bytes()).hexdigest(),
        "priorRuntimeSHA256": hashlib.sha256((ROOT / "choimis-flower-runtime-before303.png").read_bytes()).hexdigest(),
        "battleReferenceSHA256": hashlib.sha256((ROOT / "choimis-flower-battle-idle-reference.png").read_bytes()).hexdigest(),
        "processorSHA256": hashlib.sha256(processor.read_bytes()).hexdigest(),
    }
    (ROOT / "qc-meta.json").write_text(json.dumps(qc, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
