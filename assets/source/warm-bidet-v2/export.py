#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow==11.3.0", "numpy==2.3.3"]
# ///
# ─── How to run ───
# 1. Install uv: https://docs.astral.sh/uv/getting-started/installation/
# 2. Run: uv run assets/source/warm-bidet-v2/export.py
# ──────────────────
"""Export approved warm-bidet v2 pixels with reversible crop coordinates."""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from collections.abc import Mapping, Sequence
from hashlib import sha256
from pathlib import Path
from typing import Final, TypeAlias

import numpy as np
import numpy.typing as npt
from PIL import Image, ImageDraw

ROOT: Final = Path(__file__).resolve().parents[3]
SOURCE: Final = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from tools.sprites.slice_sheet import key_cell

Json: TypeAlias = str | int | float | Sequence["Json"] | Mapping[str, "Json"]
WALK_BACKGROUND_SEEDS: Final = (
    (
        (40, 40),
        (56, 48),
        (58, 96),
        (60, 105),
        (174, 185),
        (87, 186),
        (89, 229),
        (89, 236),
    ),
    ((43, 42), (55, 48), (61, 97), (177, 185), (92, 193)),
    ((42, 39), (56, 50), (63, 95), (176, 186), (90, 189)),
    ((42, 41), (51, 48), (59, 93), (173, 181), (89, 188), (132, 266)),
    ((52, 36), (71, 42), (71, 88), (110, 189)),
    ((59, 42), (68, 90), (106, 190)),
    ((66, 43), (67, 89), (102, 195)),
    ((65, 40), (69, 88), (101, 196)),
    ((174, 87), (139, 189)),
    ((177, 38), (171, 89), (137, 190)),
    ((183, 40), (138, 192)),
    ((178, 39), (136, 189)),
    ((177, 42), (181, 103), (150, 190)),
    ((177, 42), (178, 101), (65, 178), (145, 233)),
    ((182, 35), (173, 81), (182, 99)),
    ((177, 102), (62, 181), (144, 233)),
)


@dataclass(frozen=True, slots=True)
class Frame:
    """One source cell and its transparent export in pixel coordinates."""

    path: str
    direction: str
    source_rect: tuple[int, int, int, int]
    opaque_bounds_in_source_cell: tuple[int, int, int, int]
    source_pivot: tuple[int, int]
    pivot: tuple[int, int]
    atlas_rect: tuple[int, int, int, int]


def main() -> None:
    """Export the two fixed source layouts without resizing or recoloring."""
    layouts = (
        (
            "walk",
            "walk-sheet.png",
            "assets/sprites/warm-bidet-v2",
            ((25, 284), (298, 554), (570, 828), (844, 1100)),
            ((58, 369), (382, 688), (702, 1008), (1022, 1339)),
            (12, 5, 244, 309),
            (240, 312),
            ("down", "left", "right", "up"),
            ((136, 307),) * 4
            + ((148, 301),) * 4
            + ((114, 301),) * 4
            + ((114, 309),) * 4,
            0.14,
            WALK_BACKGROUND_SEEDS,
        ),
        (
            "idle",
            "battle-idle-sheet.png",
            "assets/battle",
            ((60, 615), (639, 1194)),
            ((84, 635), (659, 1196)),
            (65, 15, 527, 535),
            (470, 528),
            ("right", "right"),
            ((230, 535), (226, 535), (230, 533), (226, 533)),
            0.25,
            ((),) * 4,
        ),
    )
    actions: list[Json] = []
    manifest: dict[str, Json] = {
        "name": "따듯한비데",
        "version": 2,
        "status": "asset-handoff-only",
        "coordinates": "pixels; rect=[x,y,width,height]; bounds=[left,top,right,bottom) relative to source cell; pivot relative to frame top-left",
        "processing": "slice_sheet.key_cell; shared crop; 4px padding; explicit enclosed-background seed flood fill; scale=1; no recoloring, quantization, redraw or resampling",
        "source_sha256": {
            p.name: sha256(p.read_bytes()).hexdigest()
            for p in sorted(SOURCE.iterdir())
            if p.suffix in {".png", ".txt"}
        },
        "actions": actions,
    }
    for (
        action,
        filename,
        destination,
        columns,
        rows,
        crop,
        size,
        directions,
        pivots,
        duration,
        seeds,
    ) in layouts:
        with Image.open(SOURCE / filename) as original:
            pixels = np.array(original.convert("RGB"), dtype=np.int64)
        output_dir = ROOT / destination
        output_dir.mkdir(parents=True, exist_ok=True)
        atlas = Image.new("RGBA", (size[0] * len(columns), size[1] * len(rows)))
        frames: list[Frame] = []
        alpha_removed_counts: list[int] = []
        for row, (top, bottom) in enumerate(rows):
            for column, (left, right) in enumerate(columns):
                cell = pixels[top:bottom, left:right]
                keyed = key_cell(cell)
                bounds = keyed.getbbox()
                assert bounds is not None, (action, row, column)
                assert crop[0] <= bounds[0] < bounds[2] <= crop[2]
                assert crop[1] <= bounds[1] < bounds[3] <= crop[3]
                frame = Image.new("RGBA", size)
                frame.paste(keyed.crop(crop), (4, 4))
                index = row * len(columns) + column
                rgba: npt.NDArray[np.uint8] = np.array(frame)
                rgb: npt.NDArray[np.int64] = rgba[..., :3].astype(np.int64)
                corners: npt.NDArray[np.int64] = np.concatenate(
                    [
                        cell[2:14, 2:14].reshape(-1, 3),
                        cell[-14:-2, 2:14].reshape(-1, 3),
                        cell[2:14, -14:-2].reshape(-1, 3),
                        cell[-14:-2, -14:-2].reshape(-1, 3),
                    ]
                )
                background = np.asarray(np.median(corners, axis=0), dtype=np.float64)
                distance = np.asarray(np.abs(rgb - background).sum(axis=2), dtype=np.float64)
                candidate: npt.NDArray[np.bool_] = (distance <= 90) | (
                    (rgb[..., 0] > rgb[..., 1] + 20)
                    & (rgb[..., 2] > rgb[..., 0] + 10)
                    & (distance <= 240)
                )
                remaining = Image.fromarray(candidate.astype(np.uint8) * 255).copy()
                for seed in seeds[index]:
                    assert candidate[seed[1], seed[0]], (action, index, seed)
                    ImageDraw.floodfill(remaining, seed, 0)
                removed = np.asarray(candidate & (np.array(remaining) == 0), dtype=np.bool_)
                alpha_removed_counts.append(int(np.count_nonzero(removed)))
                rgba[removed] = 0
                frame = Image.fromarray(rgba)
                source_pivot = pivots[index]
                name = f"warm-bidet-{action}-{index}.png"
                frame.save(output_dir / name)
                atlas.paste(frame, (column * size[0], row * size[1]))
                frames.append(
                    Frame(
                        f"{destination}/{name}",
                        directions[row],
                        (left, top, right - left, bottom - top),
                        bounds,
                        source_pivot,
                        (source_pivot[0] - crop[0] + 4, source_pivot[1] - crop[1] + 4),
                        (column * size[0], row * size[1], *size),
                    )
                )
        atlas_path = f"{destination}/warm-bidet-{action}.png"
        atlas.save(ROOT / atlas_path)
        actions.append(
            {
                "action": action,
                "source": filename,
                "source_size": [pixels.shape[1], pixels.shape[0]],
                "atlas": atlas_path,
                "atlas_grid": [len(columns), len(rows)],
                "cell_size": size,
                "shared_crop_in_source_cell": crop,
                "row_order": directions,
                "frames": [asdict(frame) for frame in frames],
                "suggested_duration_seconds": duration,
                "timing_status": "suggestion; not gameplay-verified",
                "background_seeds_in_output_frame": [
                    [list(point) for point in frame_seeds] for frame_seeds in seeds
                ],
                "background_alpha_removed_pixels": alpha_removed_counts,
            }
        )
    _ = (SOURCE / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
