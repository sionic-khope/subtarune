#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# uv run assets/source/youngcle143/export.py [--check]
# ──────────────────

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[3]
SOURCE: Final = ROOT / "assets/source/youngcle143"
POSES: Final = ("read", "shock", "hide")
COLUMNS: Final = ((0, 675), (675, 1360), (1360, 2172))
HEAD_CENTERS: Final = (355, 1052, 1720)
FACE_BOXES: Final = ((150, 30, 560, 459), (850, 30, 1242, 465), (1510, 52, 1910, 479))


def emit(image: Image.Image, path: Path, check: bool) -> None:
    if check:
        with Image.open(path) as actual:
            matches = np.array_equal(
                np.array(actual.convert("RGBA")), np.array(image.convert("RGBA"))
            )
        if not matches:
            raise SystemExit(f"Pixel mismatch: {path.relative_to(ROOT)}")
    else:
        image.save(path)


def main() -> None:
    arguments = sys.argv[1:]
    if arguments and arguments != ["--check"]:
        raise SystemExit("Usage: export.py [--check]")
    check = bool(arguments)
    with Image.open(SOURCE / "raw-characters.png") as raw:
        assert raw.size == (2172, 724)
        rgba = np.array(raw.convert("RGBA"))
    colors = rgba[:, :, :3].astype(np.int16)
    neutral = (colors.max(axis=2) - colors.min(axis=2) <= 40) & (
        colors.min(axis=2) >= 35
    )
    outside = np.zeros_like(neutral)
    outside[0, :] = neutral[0, :]
    outside[-1, :] = neutral[-1, :]
    outside[:, 0] = neutral[:, 0]
    outside[:, -1] = neutral[:, -1]
    while True:
        padded = np.pad(outside, 1)
        adjacent = (
            padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:]
        )
        expanded = outside | (adjacent & neutral)
        if np.array_equal(expanded, outside):
            break
        outside = expanded
    rgba[:, :, 3] = np.where(outside, 0, 255)
    clean = Image.fromarray(rgba)
    emit(clean, SOURCE / "characters-clean.png", check)
    frames = [clean.crop((left, 0, right, 724)) for left, right in COLUMNS]
    bounds = [frame.getbbox() for frame in frames]
    valid_bounds = [box for box in bounds if box is not None]
    assert len(valid_bounds) == 3
    scale = 60 / max(box[3] - box[1] for box in valid_bounds)
    prepared = Image.new("RGBA", (2700, 800))
    for index, frame in enumerate(frames):
        prepared.paste(frame, (index * 900 + (900 - frame.width) // 2, 38))
    emit(prepared, SOURCE / "characters-qc-grid.png", check)
    plate_path = ROOT / "assets/source/youngcle142/background-native.png"
    with Image.open(plate_path) as raw_plate:
        plate = raw_plate.convert("RGB")
    assert plate.size == (258, 119)
    scenes = Image.new("RGB", (774, 119))
    portraits = Image.new("RGBA", (288, 96))
    extraction = Image.new("RGB", (384, 64), (42, 90, 92))
    pose_meta: list[dict[str, str | int | bool | tuple[int, ...]]] = []

    for index, (pose, frame, box) in enumerate(
        zip(POSES, frames, valid_bounds, strict=True)
    ):
        logical = Image.new("RGBA", (128, 64))
        size = (round((box[2] - box[0]) * scale), round((box[3] - box[1]) * scale))
        position = (
            64 - round((HEAD_CENTERS[index] - COLUMNS[index][0] - box[0]) * scale),
            62 - size[1],
        )
        logical.paste(frame.crop(box).resize(size, Image.Resampling.NEAREST), position)
        logical_bounds = logical.getbbox()
        assert (
            logical_bounds is not None
            and logical_bounds[0] > 0
            and logical_bounds[1] > 0
            and logical_bounds[2] < 128
            and logical_bounds[3] < 64
        )
        emit(logical, SOURCE / f"foreground-{pose}.png", check)
        native_actor = Image.new("RGBA", (258, 119))
        native_actor.paste(
            logical.resize((238, 119), Image.Resampling.NEAREST), (10, 0)
        )
        final = Image.alpha_composite(plate.convert("RGBA"), native_actor).convert(
            "RGB"
        )
        native_mask = np.array(native_actor)[:, :, 3] > 0
        assert np.array_equal(
            np.array(final)[~native_mask], np.array(plate)[~native_mask]
        )
        emit(final, ROOT / f"assets/illustrations/youngcle-tv-{pose}.png", check)
        scenes.paste(final, (index * 258, 0))
        extraction.paste(logical, (index * 128, 0), logical)

        face = clean.crop(FACE_BOXES[index])
        face_scale = 43 / max(face.size)
        face_size = (round(face.width * face_scale), round(face.height * face_scale))
        canvas = Image.new("RGBA", (48, 48))
        canvas.paste(
            face.resize(face_size, Image.Resampling.NEAREST),
            ((48 - face_size[0]) // 2, (48 - face_size[1]) // 2),
        )
        pixels = np.array(canvas)
        mask = pixels[:, :, 3] >= 128
        luminance = (
            pixels[:, :, 0] * 0.299 + pixels[:, :, 1] * 0.587 + pixels[:, :, 2] * 0.114
        )
        padded = np.pad(mask, 1)
        interior = (
            padded[:-2, 1:-1] & padded[2:, 1:-1] & padded[1:-1, :-2] & padded[1:-1, 2:]
        )
        white = (luminance >= 255 * 0.38) | ~interior
        mono = np.zeros_like(pixels)
        mono[:, :, :3] = np.where((white & mask)[:, :, None], 255, 0)
        mono[:, :, 3] = np.where(mask, 255, 0)
        portrait = Image.fromarray(mono).resize((96, 96), Image.Resampling.NEAREST)
        emit(portrait, ROOT / f"assets/portraits/youngcle_tv_{pose}.png", check)
        portraits.paste(portrait, (index * 96, 0))
        pose_meta.append(
            {
                "pose": pose,
                "source_cell": (COLUMNS[index][0], 0, COLUMNS[index][1], 724),
                "source_bbox": box,
                "logical_bbox": logical_bounds,
                "head_center_x": 64,
                "exact_142_background_outside_foreground": True,
            }
        )

    emit(scenes, SOURCE / "tv-preview.png", check)
    emit(
        portraits.resize((576, 192), Image.Resampling.NEAREST),
        SOURCE / "portraits-preview.png",
        check,
    )
    emit(
        extraction.resize((768, 128), Image.Resampling.NEAREST),
        SOURCE / "cutout-preview.png",
        check,
    )
    with Image.open(SOURCE / "raw-factory.png") as raw:
        factory = raw.convert("RGB").resize((240, 360), Image.Resampling.NEAREST)
    emit(factory, SOURCE / "factory-logical.png", check)
    emit(
        factory.resize((480, 720), Image.Resampling.NEAREST),
        ROOT / "assets/backdrops/youngcle_factory.png",
        check,
    )
    metadata = {
        "character_generation": "exec-ed257363-01d8-4ab7-87e8-8da6e927544c.png",
        "source_alpha": "RGB with baked checkerboard",
        "checker_removal": "Border-connected neutral pixels with RGB spread<=40 and minimum>=35; enclosed eye/teeth/book-page whites retained.",
        "removed_checker_pixels": int(np.count_nonzero(outside)),
        "shared_character_scale": scale,
        "resampling": "NEAREST",
        "logical_character_size": (128, 64),
        "scene_size": (258, 119),
        "portrait_size": (96, 96),
        "poses": pose_meta,
        "background_source": "../youngcle142/background-native.png",
        "background_sha256": hashlib.sha256(plate_path.read_bytes()).hexdigest(),
        "factory_generation": "exec-c255c43e-cf74-4a38-b1cb-291e4119a4e8.png",
        "factory_logical_size": (240, 360),
        "factory_output_size": (480, 720),
    }
    payload = json.dumps(metadata, indent=2) + "\n"
    metadata_path = SOURCE / "export-meta.json"
    if check:
        if metadata_path.read_text() != payload:
            raise SystemExit(
                "Metadata mismatch: assets/source/youngcle143/export-meta.json"
            )
        print(
            "PASS: 3 scenes, 3 portraits, factory, derived previews and metadata; no files written."
        )
    else:
        _ = metadata_path.write_text(payload)


if __name__ == "__main__":
    main()
