#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle_cats.py [--check]
# ──────────────────
"""Generate the two cat patrols and central spring before the ship lounge."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle_cats'
WIDTH: Final = 36
HEIGHT: Final = 14


def main() -> None:
    """Write the corridor or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    for row in range(7, 10):
        for col in range(1, WIDTH - 1):
            cells[row][col] = 'I'
    for left, right in ((10, 14), (17, 19), (22, 26)):
        for row in range(5, 7):
            for col in range(left, right):
                cells[row][col] = 'I'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] != 'I':
                continue
            for delta_row in (-1, 0, 1):
                for delta_col in (-1, 0, 1):
                    edge_row, edge_col = row + delta_row, col + delta_col
                    if (0 <= edge_row < HEIGHT and 0 <= edge_col < WIDTH
                            and cells[edge_row][edge_col] == '!'):
                        cells[edge_row][edge_col] = 'J'
    map_data = {
        'id': MAP_ID, 'name': '영클 공장 마나샘 연결로', 'stage': 'void_fallen',
        'bgm': 'youngcle_factory', 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.08,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png',
                    'assets/props/blue_buff.png'],
        'spawns': {
            'start': {'x': 80, 'y': 264, 'facing': 'right'},
            'left': {'x': 80, 'y': 264, 'facing': 'right'},
            'right': {'x': 1072, 'y': 264, 'facing': 'left'},
        },
        'meta': {'connected': True, 'route': [[2, 8], [18, 8], [33, 8]]},
        'entities': [
            {'type': 'door', 'id': 'youngcle_cats_left', 'x': 32, 'y': 224, 'w': 16, 'h': 96,
             'to': 'youngcle5', 'spawn': 'landing', 'sfx': False, 'interact': False},
            {'type': 'door', 'id': 'youngcle_cats_right', 'x': 1104, 'y': 224, 'w': 16, 'h': 96,
             'to': 'youngcle6', 'spawn': 'left', 'sfx': False, 'interact': False},
            *[{'type': 'factory_rail', 'id': f'youngcle_cats_rail_{index}',
               'x': x, 'y': y, 'w': width, 'h': 12}
              for index, (x, y, width) in enumerate((
                  (32, 320, 1088), (32, 212, 288), (448, 212, 96),
                  (608, 212, 96), (832, 212, 288),
                  (320, 148, 128), (544, 148, 64), (704, 148, 128),
              ))],
            *[{'type': 'enemy', 'id': enemy, 'sprite': enemy, 'enemies': [enemy],
               'x': x, 'y': 200, 'facing': 'down', 'wander': 12, 'chase': 150,
               'unless': f'{MAP_ID}_{enemy}_defeated'}
              for enemy, x in (('seopnyang', 384), ('gyeongnyang', 768))],
            {'type': 'prop', 'id': 'youngcle_cats_spring', 'image': 'assets/props/blue_buff.png',
             'anim': {'cols': 3, 'fps': 4}, 'x': 560, 'y': 212, 'w': 32, 'h': 12,
             'ix': 556, 'iy': 180, 'solid': True, 'script': 'maillard_spring'},
        ],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    registered = MAP_ID in json.loads(Path('assets/maps/index.json').read_text(encoding='utf-8'))['maps']
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
