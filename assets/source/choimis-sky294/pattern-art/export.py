#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow", "pydantic"]
# ///
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
CHARACTER_CELL: Final = 160
CHARACTER_PIVOT: Final = (80, 152)
CHARACTER_HEIGHT: Final = 123
FASHION_CELL: Final = 96
FASHION_PIVOT: Final = (48, 48)


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
        raise RuntimeError("A required source frame has no opaque pixels")
    return bbox


def median_foot_x(image: Image.Image) -> int:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.nonzero(alpha)
    lower_band = ys >= np.percentile(ys, 90)
    return int(np.median(xs[lower_band]))


def prepare_raw(folder: Path) -> Image.Image:
    with Image.open(folder / "raw-sheet.png") as source:
        pixels = np.asarray(source.convert("RGBA")).copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    clean = Image.fromarray(pixels)
    if clean.width != clean.height or clean.width % 2:
        raise RuntimeError(f"Expected a square 2x2 sheet, got {clean.size}")
    clean.save(folder / "raw-sheet-clean.png")
    return clean


def run_processor(game: Path, folder: Path, target_height: int, mode: str) -> ProcessorResult:
    clean = prepare_raw(folder)
    raw_cell = clean.width // 2
    first_bbox = alpha_bbox(clean.crop((0, 0, raw_cell, raw_cell)))
    shared_scale = target_height / (first_bbox[3] - first_bbox[1])
    processor = game / "tools/sprites/sheet_processor.py"
    subprocess.run(
        [
            sys.executable,
            str(processor),
            "process",
            "--input",
            str(folder / "raw-sheet-clean.png"),
            "--target",
            "player" if mode != "single" else "asset",
            "--mode",
            mode,
            "--rows",
            "2",
            "--cols",
            "2",
            "--cell-size",
            str(CHARACTER_CELL if mode != "single" else FASHION_CELL),
            "--output-dir",
            str(folder / "processor"),
            "--fit-scale",
            str(shared_scale * raw_cell / (CHARACTER_CELL if mode != "single" else FASHION_CELL)),
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
            "0.12" if mode == "single" else "0.08",
            "--max-anchor-y-std",
            "0.08" if mode == "single" else "0.05",
        ],
        check=True,
    )
    return ProcessorResult.model_validate_json((folder / "processor/pipeline-meta.json").read_text())


def export_character(
    game: Path,
    name: str,
    runtime_name: str,
    durations: tuple[int, int, int, int],
    poses: tuple[str, str, str, str],
) -> tuple[list[Image.Image], dict[str, object]]:
    folder = ROOT / name
    metadata = run_processor(game, folder, CHARACTER_HEIGHT, "attack")
    clean = Image.open(folder / "raw-sheet-clean.png").convert("RGBA")
    raw_cell = clean.width // 2
    first_bbox = alpha_bbox(clean.crop((0, 0, raw_cell, raw_cell)))
    shared_scale = CHARACTER_HEIGHT / (first_bbox[3] - first_bbox[1])
    sheet = Image.new("RGBA", (CHARACTER_CELL * 2, CHARACTER_CELL * 2))
    frames: list[Image.Image] = []
    records: list[dict[str, object]] = []
    for index, info in enumerate(metadata.frames):
        crop = clean.crop(info.source_box).crop(info.crop_bbox)
        sized = crop.resize(
            (round(crop.width * shared_scale), round(crop.height * shared_scale)),
            Image.Resampling.NEAREST,
        )
        paste = (CHARACTER_PIVOT[0] - median_foot_x(sized), CHARACTER_PIVOT[1] - sized.height)
        if paste[0] <= 0 or paste[1] <= 0 or paste[0] + sized.width >= CHARACTER_CELL:
            raise RuntimeError(f"{name} frame {index} would clip: paste={paste}, size={sized.size}")
        frame = Image.new("RGBA", (CHARACTER_CELL, CHARACTER_CELL))
        frame.alpha_composite(sized, paste)
        bbox = alpha_bbox(frame)
        if bbox[2] >= CHARACTER_CELL or bbox[3] != CHARACTER_PIVOT[1]:
            raise RuntimeError(f"{name} frame {index} violates final bounds/pivot: {bbox}")
        frame.save(folder / f"frame-{index}.png")
        sheet.alpha_composite(frame, ((index % 2) * CHARACTER_CELL, (index // 2) * CHARACTER_CELL))
        frames.append(frame)
        records.append(
            {
                "frame": index,
                "pose": poses[index],
                "bbox": bbox,
                "bodyHeight": bbox[3] - bbox[1],
                "feetMedianX": median_foot_x(frame),
                "feetBottomYExclusive": bbox[3],
                "paste": paste,
                "pasteClamped": False,
                "edgeTouch": False,
                "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest(),
            }
        )
    sheet.save(folder / "sheet-transparent.png")
    shutil.copyfile(folder / "sheet-transparent.png", game / "assets/enemies" / runtime_name)
    make_previews(folder, sheet, frames, durations)
    qc: dict[str, object] = {
        "status": "asset ready; runtime registration and user appearance approval remain separate",
        "rawSize": list(clean.size),
        "sheetSize": list(sheet.size),
        "cellSize": [CHARACTER_CELL, CHARACTER_CELL],
        "grid": [2, 2],
        "order": [0, 1, 2, 3],
        "pivot": list(CHARACTER_PIVOT),
        "durationsMs": list(durations),
        "playback": "one-shot 0→1→2→3; integrator chooses recovery/hold",
        "sharedScale": shared_scale,
        "alphaThreshold": 128,
        "chromaRemoval": False,
        "resample": "NEAREST",
        "frames": records,
        "bodyHeightMean": float(np.mean([entry["bodyHeight"] for entry in records])),
        "bodyHeightCV": float(np.std([entry["bodyHeight"] for entry in records]) / np.mean([entry["bodyHeight"] for entry in records])),
        "uniqueRGBAFrames": len({frame.tobytes() for frame in frames}),
        "alphaValues": np.unique(np.asarray(sheet.getchannel("A"))).tolist(),
        "outputEdgeTouchFrames": [],
        "pasteClampedFrames": [],
        "processorMetadata": "processor/pipeline-meta.json",
        "rawSHA256": hashlib.sha256((folder / "raw-sheet.png").read_bytes()).hexdigest(),
    }
    (folder / "qc-meta.json").write_text(json.dumps(qc, indent=2) + "\n")
    return frames, qc


def make_previews(
    folder: Path,
    sheet: Image.Image,
    frames: list[Image.Image],
    durations: tuple[int, int, int, int],
) -> None:
    preview = Image.new("RGBA", sheet.size, "#eee8dd")
    preview.alpha_composite(sheet)
    preview.resize((sheet.width * 4, sheet.height * 4), Image.Resampling.NEAREST).save(folder / "preview-4x.png")
    frames[0].save(
        folder / "animation.gif",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
    )
    playback: list[Image.Image] = []
    for frame in frames:
        panel = Image.new("RGBA", frame.size, "#eee8dd")
        panel.alpha_composite(frame)
        playback.append(panel.resize((frame.width * 4, frame.height * 4), Image.Resampling.NEAREST).convert("RGB"))
    playback[0].save(
        folder / "animation-preview-4x.gif",
        save_all=True,
        append_images=playback[1:],
        duration=durations,
        loop=0,
        disposal=2,
    )


def export_fashion(game: Path) -> tuple[list[Image.Image], dict[str, object]]:
    folder = ROOT / "fashion"
    metadata = run_processor(game, folder, 84, "single")
    clean = Image.open(folder / "raw-sheet-clean.png").convert("RGBA")
    crops = [clean.crop(info.source_box).crop(info.crop_bbox) for info in metadata.frames]
    max_dimension = max(max(crop.size) for crop in crops)
    shared_scale = 84 / max_dimension
    sheet = Image.new("RGBA", (FASHION_CELL * 2, FASHION_CELL * 2))
    frames: list[Image.Image] = []
    records: list[dict[str, object]] = []
    outfit_names = ("pink-leopard-suit", "pink-zebra-coat", "pink-checker-idol", "pink-heart-star-jumpsuit")
    for index, crop in enumerate(crops):
        sized = crop.resize((round(crop.width * shared_scale), round(crop.height * shared_scale)), Image.Resampling.NEAREST)
        paste = ((FASHION_CELL - sized.width) // 2, (FASHION_CELL - sized.height) // 2)
        frame = Image.new("RGBA", (FASHION_CELL, FASHION_CELL))
        frame.alpha_composite(sized, paste)
        bbox = alpha_bbox(frame)
        if min(bbox[0], bbox[1]) <= 0 or max(bbox[2], bbox[3]) >= FASHION_CELL:
            raise RuntimeError(f"fashion frame {index} violates containment: {bbox}")
        frame.save(folder / f"frame-{index}.png")
        sheet.alpha_composite(frame, ((index % 2) * FASHION_CELL, (index // 2) * FASHION_CELL))
        frames.append(frame)
        records.append(
            {
                "frame": index,
                "outfit": outfit_names[index],
                "bbox": bbox,
                "pivot": list(FASHION_PIVOT),
                "pasteClamped": False,
                "edgeTouch": False,
                "sha256RGBA": hashlib.sha256(frame.tobytes()).hexdigest(),
            }
        )
    sheet.save(folder / "sheet-transparent.png")
    shutil.copyfile(folder / "sheet-transparent.png", game / "assets/props/choimis-fashion.png")
    durations = (180, 180, 180, 220)
    make_previews(folder, sheet, frames, durations)
    qc: dict[str, object] = {
        "status": "asset ready; runtime registration and user appearance approval remain separate",
        "rawSize": list(clean.size),
        "sheetSize": list(sheet.size),
        "cellSize": [FASHION_CELL, FASHION_CELL],
        "grid": [2, 2],
        "order": [0, 1, 2, 3],
        "pivot": list(FASHION_PIVOT),
        "durationsMs": list(durations),
        "playback": "sequential one-shot 0→1→2→3",
        "sharedScale": shared_scale,
        "alphaThreshold": 128,
        "chromaRemoval": False,
        "resample": "NEAREST",
        "frames": records,
        "uniqueRGBAFrames": len({frame.tobytes() for frame in frames}),
        "alphaValues": np.unique(np.asarray(sheet.getchannel("A"))).tolist(),
        "outputEdgeTouchFrames": [],
        "pasteClampedFrames": [],
        "processorMetadata": "processor/pipeline-meta.json",
        "rawSHA256": hashlib.sha256((folder / "raw-sheet.png").read_bytes()).hexdigest(),
    }
    (folder / "qc-meta.json").write_text(json.dumps(qc, indent=2) + "\n")
    return frames, qc


def export_choso_portrait(game: Path, choso_frame: Image.Image) -> None:
    bbox = alpha_bbox(choso_frame)
    head_bottom = bbox[1] + round((bbox[3] - bbox[1]) * 0.48)
    head = choso_frame.crop((bbox[0], bbox[1], bbox[2], head_bottom))
    head_bbox = alpha_bbox(head)
    head = head.crop(head_bbox)
    scale = min(46 / head.width, 46 / head.height)
    head = head.resize((round(head.width * scale), round(head.height * scale)), Image.Resampling.NEAREST)
    portrait = Image.new("RGBA", (48, 48))
    portrait.alpha_composite(head, ((48 - head.width) // 2, (48 - head.height) // 2))
    portrait.save(ROOT / "choso/portrait.png")
    portrait.save(game / "assets/portraits/choimis_choso.png")


def make_comparison(game: Path, choso: list[Image.Image], rap: list[Image.Image], fashion: list[Image.Image]) -> None:
    with Image.open(game / "assets/source/choimis-flower-cape292/battle-neutral.png") as source:
        reference = source.convert("RGBA")
    canvas = Image.new("RGBA", (CHARACTER_CELL * 5, CHARACTER_CELL * 3), "#eee8dd")
    draw = ImageDraw.Draw(canvas)
    rows = (("CHOSO", choso), ("RAP", rap))
    for row, (label, frames) in enumerate(rows):
        canvas.alpha_composite(reference, (0, row * CHARACTER_CELL))
        draw.text((4, row * CHARACTER_CELL + 4), "292 REF", fill="#302e38")
        for index, frame in enumerate(frames):
            canvas.alpha_composite(frame, ((index + 1) * CHARACTER_CELL, row * CHARACTER_CELL))
            draw.text(((index + 1) * CHARACTER_CELL + 4, row * CHARACTER_CELL + 4), f"{label} {index}", fill="#302e38")
    fashion_y = CHARACTER_CELL * 2
    draw.text((4, fashion_y + 4), "FASHION 96px", fill="#302e38")
    for index, frame in enumerate(fashion):
        canvas.alpha_composite(frame, (CHARACTER_CELL + index * CHARACTER_CELL + 32, fashion_y + 32))
        draw.text((CHARACTER_CELL + index * CHARACTER_CELL + 4, fashion_y + 4), f"OUTFIT {index}", fill="#302e38")
    canvas.resize((canvas.width * 2, canvas.height * 2), Image.Resampling.NEAREST).save(ROOT / "comparison-all-2x.png")


def main() -> None:
    if len(sys.argv) != 2:
        raise RuntimeError("Usage: uv run export.py /absolute/path/to/subtarune")
    game = Path(sys.argv[1]).resolve()
    choso, _ = export_character(
        game,
        "choso",
        "choimis-choso.png",
        (220, 260, 150, 260),
        ("hands-rise", "joined-sign", "release-thrust", "aim-hold"),
    )
    rap, _ = export_character(
        game,
        "rap",
        "choimis-rap.png",
        (180, 180, 180, 220),
        ("mic-centered-neutral", "mic-centered-point", "mic-centered-open-hand", "mic-centered-chest"),
    )
    fashion, _ = export_fashion(game)
    export_choso_portrait(game, choso[1])
    make_comparison(game, choso, rap, fashion)


if __name__ == "__main__":
    main()
