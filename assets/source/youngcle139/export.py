#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# uv run assets/source/youngcle139/export.py
# ──────────────────

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[3]
SOURCE: Final = ROOT / "assets/source/youngcle139"
POSES: Final = ("smirk", "laugh", "greet", "oh")
HEAD_CENTERS: Final = (326, 294, 326, 294)
CURL_TOPS: Final = (46, 46, 40, 40)


def main() -> None:
    actors = Image.new("RGBA", (384, 384))
    portraits = Image.new("RGBA", (384, 96))
    actor_bounds: list[tuple[int, int, int, int]] = []
    with Image.open(SOURCE / "actor/processed/raw-sheet-clean.png") as source:
        for index, pose in enumerate(POSES):
            row, column = divmod(index, 2)
            raw = source.crop(
                (column * 627, row * 627, (column + 1) * 627, (row + 1) * 627)
            )
            actor = Image.new("RGBA", (192, 192))
            position = (
                96 - round(HEAD_CENTERS[index] * 188 / 627),
                14 - round(CURL_TOPS[index] * 188 / 627),
            )
            actor.paste(raw.resize((188, 188), Image.Resampling.NEAREST), position)
            box = actor.getbbox()
            assert box is not None and min(box[:2]) > 0 and max(box[2:]) < 192
            actor_bounds.append(box)
            actor.save(ROOT / f"assets/sprites/youngcle_tv_{pose}.png")
            actor.save(SOURCE / f"actor/{pose}.png")
            actors.paste(actor, (column * 192, row * 192))

            top = CURL_TOPS[index] - 4
            crop = raw.crop(
                (HEAD_CENTERS[index] - 164, top, HEAD_CENTERS[index] + 164, top + 336)
            )
            face = Image.new("RGBA", (96, 96))
            face.paste(crop.resize((88, 90), Image.Resampling.NEAREST), (4, 3))
            rgba = np.array(face)
            mask = rgba[:, :, 3] >= 128
            luminance = (
                rgba[:, :, 0] * 0.299 + rgba[:, :, 1] * 0.587 + rgba[:, :, 2] * 0.114
            )
            padded = np.pad(mask, 1)
            interior = (
                padded[:-2, 1:-1]
                & padded[2:, 1:-1]
                & padded[1:-1, :-2]
                & padded[1:-1, 2:]
            )
            white = (luminance >= 255 * 0.38) | ~interior
            mono = np.zeros_like(rgba)
            mono[:, :, :3] = np.where((white & mask)[:, :, None], 255, 0)
            mono[:, :, 3] = np.where(mask, 255, 0)
            portrait = Image.fromarray(mono)
            portrait.save(ROOT / f"assets/portraits/youngcle_tv_{pose}.png")
            portrait.save(SOURCE / f"actor/portrait-{pose}.png")
            portraits.paste(portrait, (index * 96, 0))
    actors.save(SOURCE / "actor/four-expression-preview.png")
    portraits.resize((768, 192), Image.Resampling.NEAREST).save(
        SOURCE / "actor/portraits-preview.png"
    )

    with Image.open(SOURCE / "frame/raw-sheet.png") as source:
        rgba = np.array(source.convert("RGBA"))
        rgba[:, :, 3][rgba[:, :, 3] < 32] = 0
        clean = Image.fromarray(rgba)
        clean.save(SOURCE / "frame/raw-alpha-clean.png")
        frame = Image.new("RGBA", (288, 176))
        frame.paste(Image.new("RGBA", (258, 119), (0, 0, 0, 255)), (15, 29))
        frame.alpha_composite(
            clean.crop((34, 96, 1571, 873)).resize(
                (284, 144), Image.Resampling.NEAREST
            ),
            (2, 16),
        )
        frame.save(ROOT / "assets/props/youngcle_tv_frame.png")
        frame.save(SOURCE / "frame/frame.png")
    metadata = {
        "poses": POSES,
        "actor_size": [192, 192],
        "actor_source_cells": [627, 627],
        "actor_uniform_scale": 188 / 627,
        "actor_head_center_x": 96,
        "actor_curl_top_y": 14,
        "actor_source_head_centers": HEAD_CENTERS,
        "actor_source_curl_tops": CURL_TOPS,
        "actor_alpha_bounds": actor_bounds,
        "portrait_size": [96, 96],
        "portrait_threshold": 0.38,
        "portrait_edge_rule": "Opaque silhouette edge is white, matching gfx.monoPortrait.",
        "frame_size": [288, 176],
        "frame_source_crop": [34, 96, 1571, 873],
        "frame_fit_size": [284, 144],
        "frame_position": [2, 16],
        "frame_alpha_bbox": [2, 16, 286, 160],
        "frame_screen_rect": [15, 29, 258, 119],
        "frame_screen_alpha": 255,
        "frame_underlay": "Opaque black screen baked beneath generated frame pixels; no runtime underlay required.",
        "resampling": "NEAREST",
        "palette_quantization": False,
    }
    _ = (SOURCE / "export-meta.json").write_text(json.dumps(metadata, indent=2) + "\n")


if __name__ == "__main__":
    main()
