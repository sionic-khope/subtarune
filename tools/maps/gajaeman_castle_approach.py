#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/gajaeman_castle_approach.py [--check]
# ──────────────────
"""Build a ten-second northern stone approach ending at a closed castle gate."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_approach'
WIDTH: Final = 24
HEIGHT: Final = 88


def main() -> None:
    """Write the sole approach map or check its generated JSON."""
    if '--help' in sys.argv:
        print(f'Usage: uv run tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * WIDTH for _ in range(HEIGHT)]
    floor = {(col, row) for col in range(8, 16) for row in range(17, HEIGHT)}
    floor.update((col, row) for col in range(6, 18) for row in range(17, 29))
    for col, row in floor:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            if 0 <= row + dy < HEIGHT and 0 <= col + dx < WIDTH and (col + dx, row + dy) not in floor:
                cells[row + dy][col + dx] = '▥'
    for row in range(29, HEIGHT - 1):
        cells[row][6] = '!'
        cells[row][17] = '!'
    for col, row in floor:
        variation = (col * 7 + row * 11) % 13
        cells[row][col] = '♠' if variation < 3 else '♣' if variation < 5 else '♦' if variation == 5 else '♜'
    gate = {'type': 'prop', 'id': 'castle306_gate',
            'image': 'assets/props/castle306_gate.png', 'scale': 0.75,
            'x': 288, 'y': 528, 'w': 192, 'h': 16,
            'ix': 288, 'iy': 304, 'solid': True, 'sortY': 0,
            'script': 'castle_lobby_enter'}
    map_data = {
        'id': MAP_ID, 'name': '가재맨성 접근로', 'stage': 'ship_invasion_arrived',
        'bgm': 'castle_approach', 'backdrop': 'castle306_distant', 'followScreenY': 250,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/backdrops/castle306_distant.png',
                    'assets/props/castle306_gate.png', 'assets/tiles/gajaeman_castle_wall.png',
                    *[f'assets/tiles/castle306_{suffix}.png'
                      for suffix in ('floor', 'moss', 'cracked', 'moss_dense')]],
        'spawns': {'start': {'x': 372, 'y': 2720, 'facing': 'up'},
                   'from_lobby': {'x': 372, 'y': 608, 'facing': 'down'}},
        'meta': {'connected': True},
        'entities': [gate, {'type': 'door', 'id': 'castle_approach_return',
                           'x': 256, 'y': HEIGHT * 32 - 10, 'w': 256, 'h': 10,
                           'to': 'gajaeman_castle_entry', 'spawn': 'from_approach',
                           'interact': False, 'sfx': False}],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in json.loads(index_path.read_text(encoding='utf-8'))['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    _ = output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
