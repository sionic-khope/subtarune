#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# uv run assets/source/youngcle140/export.py
# ──────────────────

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[3]
SOURCE: Final = ROOT / "assets/source/youngcle140"
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
COLUMNS: Final = ((0, 590), (592, 1182), (1184, 1774))
ROWS: Final = ((0, 295), (297, 590), (592, 887))
FACES: Final = (
    (204, 3, 407, 224),
    (851, 6, 1077, 243),
    (1368, 3, 1578, 233),
    (182, 298, 397, 521),
    (803, 298, 1047, 541),
    (1382, 298, 1585, 526),
    (222, 597, 437, 819),
    (780, 599, 986, 818),
    (1362, 598, 1559, 817),
)


def main() -> None:
    montage = Image.new("RGB", (774, 357))
    portraits = Image.new("RGBA", (288, 288))
    panels: list[dict[str, str | float | tuple[int, ...]]] = []
    with Image.open(SOURCE / "raw-sheet.png") as raw:
        assert raw.size == (1774, 887)
        source = raw.convert("RGB")
        for index, pose in enumerate(POSES):
            row, column = divmod(index, 3)
            left, right = COLUMNS[column]
            top, bottom = ROWS[row]
            box = (left, top, right, bottom)
            panel = source.crop(box)
            panel.save(SOURCE / f"panel-{pose}.png")
            logical = panel.resize((128, 64), Image.Resampling.NEAREST)
            logical.save(SOURCE / f"logical-{pose}.png")
            scale = 119 / 64
            size = (238, 119)
            position = (10, 0)
            final = Image.new("RGB", (258, 119), (12, 24, 48))
            final.paste(logical.resize(size, Image.Resampling.NEAREST), position)
            final.save(ROOT / f"assets/illustrations/youngcle-tv-{pose}.png")
            montage.paste(final, (column * 258, row * 119))
            panels.append(
                {
                    "pose": pose,
                    "source_box": box,
                    "uniform_scale": scale,
                    "scaled_size": size,
                    "position": position,
                }
            )

            crop = source.crop(FACES[index]).convert("RGBA")
            face_scale = 43 / max(crop.width, crop.height)
            face_size = (
                round(crop.width * face_scale),
                round(crop.height * face_scale),
            )
            face = Image.new("RGBA", (48, 48))
            logical_face = crop.resize(face_size, Image.Resampling.NEAREST)
            face.paste(
                logical_face,
                ((48 - face_size[0]) // 2, (48 - face_size[1]) // 2),
            )
            rgba = np.array(face)
            channels = rgba[:, :, :3].astype(np.float32)
            navy = (
                (channels[:, :, 2] > channels[:, :, 0] * 1.25)
                & (channels[:, :, 2] > channels[:, :, 1] * 1.05)
                & (channels[:, :, 2] > 25)
            )
            mask = (rgba[:, :, 3] >= 128) & ~navy
            luminance = (
                channels[:, :, 0] * 0.299
                + channels[:, :, 1] * 0.587
                + channels[:, :, 2] * 0.114
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
            portrait = Image.fromarray(mono).resize((96, 96), Image.Resampling.NEAREST)
            portrait.save(ROOT / f"assets/portraits/youngcle_tv_{pose}.png")
            portraits.paste(portrait, (column * 96, row * 96))
    montage.save(SOURCE / "tv-scenes-native-preview.png")
    montage.resize((1548, 714), Image.Resampling.NEAREST).save(
        SOURCE / "tv-scenes-preview.png"
    )
    portraits.resize((576, 576), Image.Resampling.NEAREST).save(
        SOURCE / "portraits-preview.png"
    )
    metadata = {
        "source_dimensions": [1774, 887],
        "source_mode": "RGB",
        "scene_output_dimensions": [258, 119],
        "scene_resampling": "NEAREST",
        "scene_logical_dimensions": [128, 64],
        "scene_background": "Original opaque navy scene retained; contain padding RGB[12,24,48].",
        "scene_panels": panels,
        "portrait_source_boxes": FACES,
        "portrait_dimensions": [96, 96],
        "portrait_resampling": "NEAREST",
        "portrait_logical_face_maximum": 43,
        "portrait_logical_canvas": [48, 48],
        "portrait_threshold": 0.38,
        "portrait_background_removal": "Navy hue only inside separate face crops; never applied to full TV scenes.",
        "portrait_edge_rule": "White silhouette edge as in gfx.monoPortrait",
        "palette_quantization": False,
        "animation_frames": 0,
    }
    _ = (SOURCE / "export-meta.json").write_text(json.dumps(metadata, indent=2) + "\n")


if __name__ == "__main__":
    main()
