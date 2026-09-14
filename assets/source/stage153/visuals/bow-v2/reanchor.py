#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run reanchor.py
# ──────────────────
"""Translate generated cells to a shared baseline without resizing any pose."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


def main() -> None:
    """Use the already chroma-keyed source to retain all eight poses intact."""
    root = Path(__file__).resolve().parent
    with Image.open(root / 'raw-sheet-clean.png') as image:
        result = Image.new('RGBA', (1024, 1664))
        shifts: list[list[int]] = []
        for index in range(8):
            column, row = index % 2, index // 2
            frame = image.crop((column * 512, row * 384, (column + 1) * 512, (row + 1) * 384))
            bounds = frame.getbbox()
            assert bounds is not None
            offset = 400 - bounds[3]
            result.paste(frame, (column * 512, row * 416 + offset))
            shifts.append([index, 0, offset])
        result.save(root / 'regrouped.png')
    (root / 'reanchor-contract.json').write_text(json.dumps({
        'source': 'raw-sheet-clean.png', 'cell': [512, 416],
        'baseline': 400, 'translations': shifts, 'resized': False,
    }, indent=2) + '\n')


if __name__ == '__main__':
    main()
