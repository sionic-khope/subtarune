#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/gajaeman_orb.py [--check]
# ──────────────────
"""Build the single-screen right-seal chamber after the purple torii."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_orb'


def main() -> None:
    """Emit the chamber with the adjacent castle's dark stone tiles."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/gajaeman_orb.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * 15 for _ in range(12)]
    for row in range(2, 10):
        for col in range(3, 12):
            cells[row][col] = '♧' if (col * 3 + row * 7) % 23 == 0 else '♤'
    for col in range(6, 9):
        cells[10][col] = '♤'
    data = {
        'id': MAP_ID, 'name': '오른쪽 봉인의 방', 'stage': 'castle_malzahar_won',
        'bgm': 'castle_orb', 'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/castle307_floor.png', 'assets/tiles/castle307_moss.png',
                    'assets/props/castle-seal-orb.png'],
        'spawns': {'start': {'x': 228, 'y': 286, 'facing': 'up'}},
        'meta': {'connected': True, 'orbRoom': {'camera': [0, 12], 'center': [240, 130]}},
        'entities': [
            {'type': 'prop', 'id': 'castle_seal_orb', 'image': 'assets/props/castle-seal-orb.png',
             'x': 208, 'y': 186, 'w': 64, 'h': 18, 'ix': 176, 'iy': 66, 'scale': 1,
             'solid': True, 'script': 'castle_orb_touch'},
            {'type': 'trigger', 'id': 'castle_orb_exit', 'x': 192, 'y': 342,
             'w': 96, 'h': 10, 'script': 'castle_orb_return'},
        ],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == data
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    _ = output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, '15 x 12')


if __name__ == '__main__':
    main()
