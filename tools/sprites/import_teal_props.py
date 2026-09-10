#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow==12.3.0", "numpy==2.5.3"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# Run: uv run tools/sprites/import_teal_props.py
# ──────────────────
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image, ImageDraw

from slice_sheet import key_cell

ROOT: Final = Path(__file__).resolve().parents[2]
SOURCE: Final = ROOT / 'assets/source/teal-props-v1'


@dataclass(frozen=True, slots=True)
class Prop:
    name: str
    canvas: tuple[int, int]
    envelope: tuple[int, int, int, int]
    centers: tuple[float, int]
    purple_seed: tuple[int, int] | None = None


PROPS: Final = (
    Prop('banana', (32, 20), (1, 3, 31, 18), (788, 16)),
    Prop('tree_teal', (240, 264), (0, 0, 240, 255), (600, 120)),
    Prop('tree_forest', (56, 84), (3, 8, 54, 84), (504, 28)),
    Prop('banana_peel', (26, 14), (1, 1, 23, 14), (858, 12)),
    Prop('black_flower', (28, 36), (3, 0, 25, 36), (556, 14), purple_seed=(556, 467)),
    Prop('button_teal', (26, 22), (0, 3, 26, 22), (681.5, 13)),
    Prop('bush_teal', (56, 40), (0, 4, 56, 40), (744, 28)),
)


@dataclass(frozen=True, slots=True)
class ImportRecord:
    prop: Prop
    source_bounds: tuple[int, int, int, int]
    scale: float
    placement: tuple[int, int]
    resized: tuple[int, int]


def render(prop: Prop) -> tuple[Image.Image, ImportRecord]:
    """Fit the whole keyed silhouette around its inspected trunk centerline."""
    with Image.open(SOURCE / f'{prop.name}-raw.png') as raw:
        rgb = np.asarray(raw.convert('RGB')).astype(np.int64)
    pixels = np.array(key_cell(rgb))
    magenta = (rgb[..., 0] > rgb[..., 1] + 20) & (rgb[..., 2] > rgb[..., 1] + 20)
    if prop.purple_seed is not None:
        # Preserve the connected purple flower center; other purple pixels are chromakey fringe.
        purple = Image.fromarray(np.where(magenta, 255, 0).astype(np.uint8)).copy()
        ImageDraw.floodfill(purple, prop.purple_seed, 128)
        pixels[magenta & (np.asarray(purple) != 128)] = 0
    else:
        pixels[magenta] = 0
    keyed = Image.fromarray(pixels)
    bounds = keyed.getbbox()
    assert bounds is not None, f'Empty prop: {prop.name}'
    left, top, right, bottom = bounds
    x0, y0, x1, baseline = prop.envelope
    source_center, target_center = prop.centers
    scale = min(
        (target_center - x0) / (source_center - left),
        (x1 - target_center) / (right - source_center),
        (baseline - y0) / (bottom - top),
    )
    size = (round((right - left) * scale), round((bottom - top) * scale))
    offset = (round(target_center - (source_center - left) * scale), baseline - size[1])
    assert x0 <= offset[0] and offset[0] + size[0] <= x1, prop.name
    assert y0 <= offset[1] and offset[1] + size[1] == baseline, prop.name
    sprite = keyed.crop(bounds).resize(size, Image.Resampling.NEAREST)
    frame = Image.new('RGBA', prop.canvas)
    frame.paste(sprite, offset)
    return frame, ImportRecord(prop, bounds, scale, offset, size)


def main() -> None:
    rendered = [render(prop) for prop in PROPS]
    (SOURCE / 'runtime').mkdir(parents=True, exist_ok=True)
    records = []
    for frame, record in rendered:
        runtime = SOURCE / 'runtime' / f'{record.prop.name}.png'
        frame.save(runtime)
        data = runtime.read_bytes()
        (ROOT / 'assets/props' / runtime.name).write_bytes(data)
        records.append({**asdict(record), 'sha256': hashlib.sha256(data).hexdigest()})
    metadata = {'resampling': 'NEAREST', 'paletteQuantization': False,
                'background': 'magenta chromakey', 'imports': records}
    (SOURCE / 'import.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
