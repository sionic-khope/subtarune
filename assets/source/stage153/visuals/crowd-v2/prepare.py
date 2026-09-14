#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run prepare.py
# ──────────────────
"""Crop generated bleachers and preserve sixteen complete spectator busts."""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Final

from PIL import Image

RAW: Final = Path('/Users/khope@sionic.ai/.codex/generated_images/01a094db-7a81-76c2-aca4-9bb437fc989a')


def main() -> None:
    """Keep opaque art while removing only transparent-edge noise and padding."""
    root = Path(__file__).resolve().parent
    shutil.copy2(RAW / 'exec-e7bfad8a-00f1-41f9-b0cd-e7462b608b11.png', root / 'bleachers-raw.png')
    shutil.copy2(RAW / 'exec-2f9433df-d53f-4719-9746-1a670a36592a.png', root / 'crowd-raw.png')
    with Image.open(root / 'bleachers-raw.png') as raw:
        cleaned = raw.convert('RGBA')
        cleaned.putalpha(cleaned.getchannel('A').point(lambda alpha: 255 if alpha >= 64 else 0))
        bounds = cleaned.getbbox()
        assert bounds is not None
        cleaned.crop(bounds).resize((672, 176), Image.Resampling.NEAREST).save(root / 'editor_union_audience.png')
    with Image.open(root / 'crowd-raw.png') as raw:
        regrouped = Image.new('RGBA', (1360, 1280))
        for row, (top, bottom) in enumerate(((0, 297), (297, 590), (590, 888), (888, 1190))):
            for column in range(4):
                tile = raw.crop((column * 330, top, (column + 1) * 330, bottom))
                regrouped.paste(tile, (column * 340 + 5, row * 320 + 8))
        regrouped.save(root / 'crowd-regrouped.png')
    (root / 'crop-contract.json').write_text(json.dumps({
        'base_bounds': bounds, 'alpha_threshold': 64, 'base_size': [672, 176],
        'base_interpolation': 'NEAREST', 'atlas_row_bands': [[0, 297], [297, 590], [590, 888], [888, 1190]],
        'atlas_cell': [340, 320], 'atlas_padding': [5, 8], 'atlas_regroup_resized': False,
    }, indent=2) + '\n')


if __name__ == '__main__':
    main()
