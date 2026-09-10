#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# Run: uv run tools/sprites/import_junhee_statues.py
# ──────────────────
from __future__ import annotations

import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

from slice_sheet import key_cell

ROOT: Final = Path(__file__).resolve().parents[2]
SOURCE: Final = ROOT / 'assets/source/junhee-statues'
POSES: Final = ('arms_crossed', 'laugh', 'gesture', 'arms_raised', 'thinking', 'look_back')
CELL: Final = (418, 627)
OUTPUT: Final = (44, 60)
DIVISOR: Final = 9


def main() -> None:
    with Image.open(SOURCE / 'statues.png') as sheet:
        assert sheet.size == (1254, 1254), 'Expected approved 3-column, 2-row sheet'
        source = np.asarray(sheet.convert('RGB')).astype(np.int64)
    frames = []
    for index, pose in enumerate(POSES):
        x = index % 3 * CELL[0]
        y = index // 3 * CELL[1]
        cell = source[y:y + CELL[1], x:x + CELL[0]]
        pixels = np.array(key_cell(cell))
        # The wood/teal palette has no magenta: also clear enclosed leg/arm gaps.
        magenta = (cell[..., 0] > 200) & (cell[..., 1] < 60) & (cell[..., 2] > 200)
        pixels[magenta] = 0
        keyed = Image.fromarray(pixels)
        bounds = keyed.getbbox()
        assert bounds is not None, f'Empty statue: {pose}'
        bottom = bounds[3]
        # Fixed 1/9 grid and plinth center preserve one scale across all six poses.
        crop = (11, bottom - OUTPUT[1] * DIVISOR, 407, bottom)
        assert bounds[0] >= crop[0] and bounds[2] <= crop[2] and bounds[1] >= crop[1]
        frame = keyed.crop(crop).resize(OUTPUT, Image.Resampling.NEAREST)
        output = f'assets/props/statue_junhee_{pose}.png'
        frame.save(ROOT / output)
        frames.append({'pose': pose, 'sourceCell': [x, y, *CELL], 'sourceBounds': bounds,
                       'cropInCell': crop, 'image': output})
    metadata = {'source': 'statues.png', 'grid': [3, 2], 'outputSize': OUTPUT,
                'scale': '1/9', 'resampling': 'NEAREST', 'paletteQuantization': False,
                'anchor': {'plinthCenterX': 22, 'plinthBottomY': 60}, 'frames': frames}
    (SOURCE / 'import.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
