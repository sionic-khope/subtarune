#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# uv run assets/source/youngcle142/export.py
# ──────────────────

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Final

import numpy as np
from numpy.typing import NDArray
from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[3]
SOURCE: Final = ROOT / "assets/source/youngcle142"
POSES: Final = (
    "smirk",
    "laugh",
    "greet",
    "oh",
    "taunt",
    "shrug",
    "bye",
    "yes",
    "surprise",
)


def main() -> None:
    arguments = sys.argv[1:]
    if arguments and arguments != ["--check"]:
        raise SystemExit("Usage: export.py [--check]")
    check_only = bool(arguments)
    with Image.open(SOURCE / "raw-background.png") as raw:
        background = raw.convert("RGB").resize((128, 64), Image.Resampling.NEAREST)
    if not check_only:
        background.save(SOURCE / "background-logical.png")
    native_background = Image.new("RGB", (258, 119), (12, 24, 48))
    native_background.paste(
        background.resize((238, 119), Image.Resampling.NEAREST), (10, 0)
    )
    if not check_only:
        native_background.save(SOURCE / "background-native.png")
    plate = np.array(background)
    native_plate = np.array(native_background)
    preview = Image.new("RGB", (774, 357))
    extraction_preview = Image.new("RGB", (768, 384))
    mask_atlas = Image.new("L", (384, 192))
    masks: list[NDArray[np.bool_]] = []
    outputs: list[NDArray[np.uint8]] = []
    pose_counts: list[dict[str, str | int | bool]] = []

    for index, pose in enumerate(POSES):
        original_path = ROOT / f"assets/source/youngcle140/logical-{pose}.png"
        with Image.open(original_path) as original:
            assert original.size == (128, 64)
            rgb = np.array(original.convert("RGB"))
        channels = rgb.astype(np.float32)
        red, green, blue = channels[:, :, 0], channels[:, :, 1], channels[:, :, 2]
        warm = (
            (red >= blue * 0.75) & (red >= green * 0.85) & (channels.max(axis=2) > 45)
        )
        cyan_green = (green >= blue * 0.70) & (green >= red * 1.35) & (green > 50)
        mask = warm | cyan_green
        dark = channels.max(axis=2) <= 40
        for _ in range(2):
            padded = np.pad(mask, 1)
            adjacent = np.zeros_like(mask)
            for dy in range(3):
                for dx in range(3):
                    adjacent |= padded[dy : dy + 64, dx : dx + 128]
            mask |= adjacent & dark

        exterior = np.zeros_like(mask)
        exterior[0, :] = ~mask[0, :]
        exterior[-1, :] = ~mask[-1, :]
        exterior[:, 0] = ~mask[:, 0]
        exterior[:, -1] = ~mask[:, -1]
        while True:
            padded = np.pad(exterior, 1)
            adjacent = (
                padded[:-2, 1:-1]
                | padded[2:, 1:-1]
                | padded[1:-1, :-2]
                | padded[1:-1, 2:]
            )
            expanded = exterior | (adjacent & ~mask)
            if np.array_equal(expanded, exterior):
                break
            exterior = expanded
        mask |= ~exterior & dark
        assert np.any(mask)
        combined = plate.copy()
        combined[mask] = rgb[mask]
        assert np.array_equal(combined[mask], rgb[mask])
        assert np.array_equal(combined[~mask], plate[~mask])

        native = native_background.copy()
        native.paste(
            Image.fromarray(combined).resize((238, 119), Image.Resampling.NEAREST),
            (10, 0),
        )
        native_mask_image = Image.new("L", (258, 119))
        native_mask_image.paste(
            Image.fromarray(mask.astype(np.uint8) * 255).resize(
                (238, 119), Image.Resampling.NEAREST
            ),
            (10, 0),
        )
        native_mask = np.array(native_mask_image) > 0
        prior_native = Image.new("RGB", (258, 119), (12, 24, 48))
        prior_native.paste(
            Image.fromarray(rgb).resize((238, 119), Image.Resampling.NEAREST), (10, 0)
        )
        native_pixels = np.array(native)
        assert np.array_equal(
            native_pixels[native_mask], np.array(prior_native)[native_mask]
        )
        assert np.array_equal(native_pixels[~native_mask], native_plate[~native_mask])
        output_path = ROOT / f"assets/illustrations/youngcle-tv-{pose}.png"
        if check_only:
            with Image.open(output_path) as actual:
                matches = np.array_equal(
                    np.array(actual.convert("RGBA")), np.array(native.convert("RGBA"))
                )
            if not matches:
                raise SystemExit(f"Pixel mismatch: {output_path.relative_to(ROOT)}")
        else:
            native.save(output_path)
        masks.append(native_mask)
        outputs.append(native_pixels)
        row, column = divmod(index, 3)
        preview.paste(native, (column * 258, row * 119))
        mask_atlas.paste(
            Image.fromarray(mask.astype(np.uint8) * 255), (column * 128, row * 64)
        )
        cutout = Image.fromarray(np.dstack((rgb, mask.astype(np.uint8) * 255)))
        if not check_only:
            cutout.save(SOURCE / f"foreground-{pose}.png")
        contrast = Image.new("RGB", (128, 64), (80, 60, 70))
        contrast.paste(cutout, (0, 0), cutout)
        extraction_preview.paste(
            contrast.resize((256, 128), Image.Resampling.NEAREST),
            (column * 256, row * 128),
        )
        pose_counts.append(
            {
                "pose": pose,
                "logical_foreground_pixels": int(np.count_nonzero(mask)),
                "native_foreground_pixels": int(np.count_nonzero(native_mask)),
                "foreground_rgb_and_coordinates_identical": True,
                "individual_background_matches_plate": True,
            }
        )

    union_mask = np.zeros((119, 258), dtype=np.bool_)
    for native_mask in masks:
        union_mask |= native_mask
    for output in outputs:
        assert np.array_equal(output[~union_mask], native_plate[~union_mask])
    if check_only:
        print(
            f"PASS: {len(POSES)} on-disk TV PNGs match expected pixels; no files written."
        )
        return
    preview.save(SOURCE / "fixed-background-preview.png")
    extraction_preview.save(SOURCE / "mask-preview.png")
    mask_atlas.save(SOURCE / "foreground-mask-atlas.png")
    metadata = {
        "background_generation": "exec-6967b4d3-1a97-4d96-8b39-1a4e40804b2a.png",
        "background_source_sha256": hashlib.sha256(
            (SOURCE / "raw-background.png").read_bytes()
        ).hexdigest(),
        "character_source": "../youngcle140/logical-<pose>.png",
        "logical_size": [128, 64],
        "native_size": [258, 119],
        "content_size": [238, 119],
        "content_position": [10, 0],
        "resampling": "NEAREST",
        "mask_rule": "Warm skin/hair/white and cyan/green seeds; two local dark-outline growth passes; enclosed dark glyph pixels retained. Blue room and blue gesture marks excluded.",
        "poses": pose_counts,
        "outside_union_background_identical": True,
        "union_native_foreground_pixels": int(np.count_nonzero(union_mask)),
        "shared_native_background_pixels": int(np.count_nonzero(~union_mask)),
        "portraits_modified": False,
    }
    _ = (SOURCE / "qc-meta.json").write_text(json.dumps(metadata, indent=2) + "\n")


if __name__ == "__main__":
    main()
