#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow==12.3.0", "numpy==2.5.3"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# Run: uv run tools/sprites/import_teal6_props.py
# ──────────────────
from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[2]
SOURCE: Final = ROOT / 'assets/source/teal6-props-v1'
sys.path.insert(0, str(ROOT))

from tools.sprites.slice_sheet import key_cell


@dataclass(frozen=True, slots=True)
class Prop:
    name: str
    frame_size: tuple[int, int]
    selected_frames: tuple[int, ...]
    fps: int
    pivot: tuple[int, int]


PROPS: Final = (
    Prop('ward', (20, 36), (0, 1), 2, (10, 36)),
    Prop('blue_buff', (40, 44), (0, 1, 2), 4, (20, 44)),
)


@dataclass(frozen=True, slots=True)
class ImportRecord:
    prop: Prop
    source_cell_size: tuple[int, int]
    source_anchors: tuple[tuple[int, int], ...]
    shared_crop: tuple[int, int, int, int]
    scale: float
    resized_size: tuple[int, int]
    placement: tuple[int, int]
    frame_bounds: tuple[tuple[int, int, int, int], ...]
    sha256: str


def render(prop: Prop) -> tuple[Image.Image, ImportRecord]:
    """Use one crop, sampling grid and bottom anchor for every selected phase."""
    with Image.open(SOURCE / f'{prop.name}-raw.png') as raw:
        width, height = raw.size
        rgb = np.asarray(raw.convert('RGB')).astype(np.int64)
    cell_width, cell_height = width // 2, height // 2
    frames: list[Image.Image] = []
    bounds: list[tuple[int, int, int, int]] = []
    anchors: list[tuple[int, int]] = []
    for index in prop.selected_frames:
        x, y = index % 2 * cell_width, index // 2 * cell_height
        frame = key_cell(rgb[y:y + cell_height, x:x + cell_width])
        box = frame.getbbox()
        assert box is not None, f'Empty frame: {prop.name}/{index}'
        assert 0 < box[0] < box[2] < cell_width, (prop.name, index, box)
        assert 0 < box[1] < box[3] < cell_height, (prop.name, index, box)
        frames.append(frame)
        ax, ay = (box[0] + box[2]) // 2, box[3]
        anchors.append((ax, ay))
        bounds.append((box[0] - ax, box[1] - ay, box[2] - ax, 0))
    crop = (min(b[0] for b in bounds), min(b[1] for b in bounds),
            max(b[2] for b in bounds), max(b[3] for b in bounds))
    fw, fh = prop.frame_size
    scale = min((fw - 2) / (crop[2] - crop[0]), (fh - 2) / (crop[3] - crop[1]))
    size = (round((crop[2] - crop[0]) * scale), round((crop[3] - crop[1]) * scale))
    offset = ((fw - size[0]) // 2, fh - 1 - size[1])
    strip = Image.new('RGBA', (fw * len(frames), fh))
    output_bounds: list[tuple[int, int, int, int]] = []
    for index, frame in enumerate(frames):
        ax, ay = anchors[index]
        source_crop = (crop[0] + ax, crop[1] + ay, crop[2] + ax, crop[3] + ay)
        sprite = frame.crop(source_crop).resize(size, Image.Resampling.NEAREST)
        canvas = Image.new('RGBA', prop.frame_size)
        canvas.paste(sprite, offset)
        box = canvas.getbbox()
        assert box is not None, (prop.name, index)
        assert 0 < box[0] < box[2] < fw and 0 < box[1] < box[3] < fh, box
        output_bounds.append(box)
        strip.paste(canvas, (index * fw, 0))
    record = ImportRecord(prop, (cell_width, cell_height), tuple(anchors), crop, scale, size,
                          offset, tuple(output_bounds), '')
    return strip, record


def main() -> None:
    rendered = [render(prop) for prop in PROPS]
    (SOURCE / 'runtime').mkdir(parents=True, exist_ok=True)
    records: list[ImportRecord] = []
    for strip, record in rendered:
        runtime = SOURCE / 'runtime' / f'{record.prop.name}.png'
        strip.save(runtime)
        data = runtime.read_bytes()
        _ = (ROOT / 'assets/props' / runtime.name).write_bytes(data)
        records.append(replace(record, sha256=hashlib.sha256(data).hexdigest()))
    manifest = {'source_grid': [2, 2], 'frame_order': 'row-major, zero-based',
                'resampling': 'NEAREST', 'palette_quantization': False,
                'background': 'edge-connected magenta chromakey via slice_sheet.key_cell',
                'anchor': 'shared crop relative to source bottom-center, bottom at frame height minus 1',
                'imports': [asdict(record) for record in records]}
    _ = (SOURCE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
