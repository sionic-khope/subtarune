#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/maillard_lounge.py [--check]
# ──────────────────
"""Generate the large, otherwise empty Maillard ship lounge."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

WIDTH: Final = 48
HEIGHT: Final = 28
MAP_ID: Final = 'maillard_lounge'


def main() -> None:
    """Write the lounge map or verify the committed generator output."""
    rows = [' ' * WIDTH for _ in range(5)]
    rows.extend(' ' + 'M' * (WIDTH - 2) + ' ' for _ in range(5, HEIGHT - 2))
    rows.extend([' ' * WIDTH] * 2)
    map_data = {
        'id': MAP_ID, 'name': '마이야르호 라운지', 'stage': 'void_fallen',
        'bgm': 'maillard_lounge', 'dim': 0.08, 'rows': rows,
        'preload': ['assets/tiles/maillard_deck.png',
                    'assets/props/maillard_lounge_walls.png', 'assets/props/blue_buff.png'],
        'spawns': {
            'start': {'x': 176, 'y': 440, 'facing': 'right'},
            'from_path': {'x': 176, 'y': 440, 'facing': 'right'},
        },
        'meta': {'connected': True},
        'entities': [
            {'type': 'prop', 'id': 'lounge_walls',
             'image': 'assets/props/maillard_lounge_walls.png',
             'x': 0, 'y': 0, 'w': 1536, 'h': 896, 'solid': False, 'sortY': -1000},
            {'type': 'prop', 'id': 'lounge_spring', 'image': 'assets/props/blue_buff.png',
             'anim': {'cols': 3, 'fps': 4}, 'x': 1124, 'y': 404, 'w': 32, 'h': 12,
             'ix': 1120, 'iy': 372, 'solid': True},
            {'type': 'door', 'id': 'lounge_to_path', 'x': 24, 'y': 384, 'w': 40, 'h': 128,
             'to': 'maillard_path', 'spawn': 'from_lounge', 'sfx': False, 'interact': False},
        ],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        sys.exit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
