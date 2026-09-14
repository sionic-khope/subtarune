#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
from __future__ import annotations

import hashlib
import json
import sys
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[3]
SOURCE: Final = ROOT / "assets/source/youngcle151"
PLATE: Final = ROOT / "assets/source/youngcle142/background-native.png"
LOGICAL_SIZE: Final = (128, 64)
NATIVE_SIZE: Final = (258, 119)
CONTENT_SIZE: Final = (238, 119)
MAGENTA_THRESHOLD: Final = 190


@dataclass(frozen=True, slots=True)
class Pose:
    slug: str
    raw_name: str


POSES: Final = (
    Pose("middle-finger", "youngcle-middle-finger-exec-00523150-d4c5-4374-8dd3-6ac51dc1e4da.png"),
    Pose("question", "youngcle-question-exec-1b235fbc-97bc-4361-b624-24476c628588.png"),
    Pose("questions", "youngcle-questions-exec-3e928b13-863a-45bb-99b5-8556a578ebae.png"),
    Pose("facepalm", "youngcle-facepalm-exec-1a7d0348-4f9b-40d2-8425-fb8502483d5c.png"),
)
CAGE: Final = "youngcle-electric-cage-exec-75ed7aac-5dda-40b8-969f-9667aab047be.png"


def emit(image: Image.Image, path: Path, check: bool) -> None:
    if check:
        with Image.open(path) as actual:
            if not np.array_equal(np.array(actual.convert("RGBA")), np.array(image.convert("RGBA"))):
                raise SystemExit(f"Pixel mismatch: {path.relative_to(ROOT)}")
        return
    image.save(path)


def clean_magenta(path: Path) -> Image.Image:
    with Image.open(path) as source:
        rgba = np.array(source.convert("RGBA"))
    colors = rgba[:, :, :3].astype(np.float32)
    distance = np.sqrt(
        (colors[:, :, 0] - 255) ** 2
        + colors[:, :, 1] ** 2
        + (colors[:, :, 2] - 255) ** 2
    )
    removed = distance < MAGENTA_THRESHOLD
    magenta_halo = (
        (colors[:, :, 0] > 80)
        & (colors[:, :, 2] > 80)
        & (colors[:, :, 1] < 50)
        & (np.abs(colors[:, :, 0] - colors[:, :, 2]) < 75)
    )
    height, width = removed.shape
    seen = np.zeros_like(removed)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        if removed[0, x] or magenta_halo[0, x]:
            queue.append((x, 0))
        if removed[height - 1, x] or magenta_halo[height - 1, x]:
            queue.append((x, height - 1))
    for y in range(height):
        if removed[y, 0] or magenta_halo[y, 0]:
            queue.append((0, y))
        if removed[y, width - 1] or magenta_halo[y, width - 1]:
            queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or seen[y, x]:
            continue
        seen[y, x] = True
        if not (removed[y, x] or magenta_halo[y, x]):
            continue
        removed[y, x] = True
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    rgba[:, :, 3] = np.where(removed, 0, rgba[:, :, 3])
    return Image.fromarray(rgba)


def fit_bbox(image: Image.Image, size: tuple[int, int], scale: float) -> Image.Image:
    bbox = image.getbbox()
    if bbox is None:
        raise SystemExit("Expected a non-empty transparent foreground.")
    cropped = image.crop(bbox)
    width = max(1, round(cropped.width * scale))
    height = max(1, round(cropped.height * scale))
    resized = cropped.resize((width, height), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", size)
    canvas.paste(resized, ((size[0] - width) // 2, (size[1] - height) // 2), resized)
    return canvas


def portrait_from(logical: Image.Image) -> Image.Image:
    face = logical.crop((34, 0, 94, 48))
    bbox = face.getbbox()
    if bbox is None:
        raise SystemExit("Expected an opaque face crop.")
    face = face.crop(bbox)
    scale = min(46 / face.width, 46 / face.height)
    size = (max(1, round(face.width * scale)), max(1, round(face.height * scale)))
    canvas = Image.new("RGBA", (48, 48))
    resized = face.resize(size, Image.Resampling.NEAREST)
    canvas.paste(resized, ((48 - size[0]) // 2, (48 - size[1]) // 2), resized)
    return canvas.resize((96, 96), Image.Resampling.NEAREST)


def main() -> None:
    arguments = sys.argv[1:]
    if arguments and arguments != ["--check"]:
        raise SystemExit("Usage: export.py [--check]")
    check = bool(arguments)
    if not check:
        SOURCE.mkdir(parents=True, exist_ok=True)
    with Image.open(PLATE) as source:
        plate = source.convert("RGB")
    if plate.size != NATIVE_SIZE:
        raise SystemExit(f"Expected a {NATIVE_SIZE} common TV background.")

    scene_preview = Image.new("RGB", (NATIVE_SIZE[0] * 2, NATIVE_SIZE[1] * 2))
    portrait_preview = Image.new("RGBA", (96 * len(POSES), 96))
    union_mask = np.zeros((NATIVE_SIZE[1], NATIVE_SIZE[0]), dtype=np.bool_)
    output_pixels: list[np.ndarray] = []
    pose_meta: list[dict[str, object]] = []
    plate_pixels = np.array(plate)

    for index, pose in enumerate(POSES):
        raw = clean_magenta(SOURCE / "raw" / pose.raw_name)
        raw_bbox = raw.getbbox()
        if raw_bbox is None:
            raise SystemExit(f"Empty raw still: {pose.slug}")
        logical = fit_bbox(raw, LOGICAL_SIZE, LOGICAL_SIZE[1] / (raw_bbox[3] - raw_bbox[1]))
        logical_bbox = logical.getbbox()
        if logical_bbox is None or logical_bbox[0] == 0 or logical_bbox[2] == LOGICAL_SIZE[0]:
            raise SystemExit(f"Horizontal crop in logical still: {pose.slug}")
        native_actor = Image.new("RGBA", NATIVE_SIZE)
        native_actor.paste(logical.resize(CONTENT_SIZE, Image.Resampling.NEAREST), (10, 0), logical.resize(CONTENT_SIZE, Image.Resampling.NEAREST))
        native_mask = np.array(native_actor.getchannel("A")) > 0
        final = Image.alpha_composite(plate.convert("RGBA"), native_actor).convert("RGB")
        if not np.array_equal(np.array(final)[~native_mask], plate_pixels[~native_mask]):
            raise SystemExit(f"Background changed outside foreground: {pose.slug}")
        emit(logical, SOURCE / f"logical-{pose.slug}.png", check)
        emit(raw, SOURCE / f"foreground-raw-{pose.slug}.png", check)
        emit(final, ROOT / f"assets/illustrations/youngcle-tv-{pose.slug}.png", check)
        portrait = portrait_from(logical)
        emit(portrait, ROOT / f"assets/portraits/youngcle_tv_{pose.slug.replace('-', '_')}.png", check)
        row, column = divmod(index, 2)
        scene_preview.paste(final, (column * NATIVE_SIZE[0], row * NATIVE_SIZE[1]))
        portrait_preview.paste(portrait, (index * 96, 0), portrait)
        union_mask |= native_mask
        output_pixels.append(np.array(final))
        pose_meta.append(
            {
                "pose": pose.slug,
                "raw": pose.raw_name,
                "raw_sha256": hashlib.sha256((SOURCE / "raw" / pose.raw_name).read_bytes()).hexdigest(),
                "raw_bbox": list(raw_bbox),
                "logical_bbox": list(logical_bbox),
                "intentional_waist_crop_at_logical_bottom": logical_bbox[3] == LOGICAL_SIZE[1],
                "background_identical_outside_foreground": True,
            }
        )

    for pixels in output_pixels:
        if not np.array_equal(pixels[~union_mask], plate_pixels[~union_mask]):
            raise SystemExit("Shared background changed outside foreground union.")
    cage_path = SOURCE / "raw" / CAGE
    with Image.open(cage_path) as source:
        cage_raw = source.convert("RGBA")
    cage_bbox = cage_raw.getbbox()
    if cage_bbox is None:
        raise SystemExit("Empty cage alpha.")
    cage = fit_bbox(cage_raw, (96, 160), min(84 / (cage_bbox[2] - cage_bbox[0]), 148 / (cage_bbox[3] - cage_bbox[1])))
    cage_bbox_output = cage.getbbox()
    if cage_bbox_output is None or cage_bbox_output[0] == 0 or cage_bbox_output[2] == 96 or cage_bbox_output[1] == 0 or cage_bbox_output[3] == 160:
        raise SystemExit("Cage was clipped during packaging.")
    emit(cage, ROOT / "assets/props/youngcle_electric_cage.png", check)
    cage_preview = Image.new("RGBA", (192, 160), (35, 59, 86, 255))
    cage_preview.paste(cage, (48, 0), cage)
    emit(scene_preview.resize((1032, 476), Image.Resampling.NEAREST), SOURCE / "tv-preview.png", check)
    emit(portrait_preview.resize((768, 192), Image.Resampling.NEAREST), SOURCE / "portraits-preview.png", check)
    emit(cage_preview.resize((384, 320), Image.Resampling.NEAREST), SOURCE / "cage-preview.png", check)

    metadata = {
        "background": "../youngcle142/background-native.png",
        "background_sha256": hashlib.sha256(PLATE.read_bytes()).hexdigest(),
        "logical_size": list(LOGICAL_SIZE),
        "native_size": list(NATIVE_SIZE),
        "content_size": list(CONTENT_SIZE),
        "content_position": [10, 0],
        "resampling": "NEAREST only for runtime artifacts",
        "chroma_key": "RGB Euclidean distance <190 from #FF00FF plus border-connected dark-magenta halo removed before bbox packaging",
        "poses": pose_meta,
        "outside_union_foreground_matches_142_background": True,
        "cage": {
            "raw": CAGE,
            "raw_sha256": hashlib.sha256(cage_path.read_bytes()).hexdigest(),
            "raw_has_alpha": True,
            "raw_bbox": list(cage_bbox),
            "output_bbox": list(cage_bbox_output),
            "output_size": [96, 160],
            "interior_transparency_preserved": True,
        },
    }
    metadata_text = json.dumps(metadata, ensure_ascii=False, indent=2) + "\n"
    metadata_path = SOURCE / "qc-meta.json"
    if check:
        if metadata_path.read_text(encoding="utf-8") != metadata_text:
            raise SystemExit("Metadata mismatch: assets/source/youngcle151/qc-meta.json")
        print("PASS: 4 TV stills, 4 face-crop portraits, and alpha cage match deterministic outputs.")
        return
    metadata_path.write_text(metadata_text, encoding="utf-8")


if __name__ == "__main__":
    main()
