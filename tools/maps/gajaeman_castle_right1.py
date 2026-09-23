#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/gajaeman_castle_right1.py [--check]
# ──────────────────
"""Build a five-second northern castle aisle beside recessed violet lava."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_right1'
WIDTH: Final = 24
HEIGHT: Final = 40


def main() -> None:
    """Write the right interior corridor without inventing its next destination."""
    if '--help' in sys.argv:
        print(f'Usage: uv run tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * WIDTH for _ in range(HEIGHT)]
    for row in range(HEIGHT):
        for col in range(9, 15):
            cells[row][col] = '♧' if (col * 3 + row * 7) % 11 < 3 else '♤'
        for col in (8, 15):
            cells[row][col] = '▥'
        for col in (7, 16):
            cells[row][col] = '♨' if (row + col // 2) % 3 else '♩'
    for row in (0, HEIGHT - 1):
        for col in (7, 8, 15, 16):
            cells[row][col] = '▥'
    for row in range(2):
        for col in range(9, 15):
            cells[row][col] = '▥'
    map_data = {
        'id': MAP_ID, 'name': '가재맨성 동쪽 회랑', 'stage': 'castle_lobby_seen',
        'bgm': 'castle_right', 'backdrop': 'castle307_right', 'followScreenY': 250,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/backdrops/castle307_right.png',
                    'assets/tiles/gajaeman_castle_wall.png',
                    *[f'assets/tiles/castle307_{suffix}.png'
                      for suffix in ('floor', 'moss', 'lava', 'lava_dark')]],
        'spawns': {'start': {'x': 372, 'y': 1120, 'facing': 'up'}},
        'meta': {'connected': True, 'walkSeconds': 4.84},
        'entities': [{'type': 'door', 'id': 'castle_right_return',
                      'x': 288, 'y': HEIGHT * 32 - 10, 'w': 192, 'h': 10,
                      'to': 'gajaeman_castle_lobby', 'spawn': 'from_right',
                      'interact': False, 'sfx': False}],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    _ = output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        _ = index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
