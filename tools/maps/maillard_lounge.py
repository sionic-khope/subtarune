#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/maillard_lounge.py [--check]
# ──────────────────
"""Generate the Maillard lounge with its shop, statues, and healing spring."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

WIDTH: Final = 48
HEIGHT: Final = 20
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
                    'assets/props/maillard_lounge_walls.png', 'assets/props/blue_buff.png',
                    'assets/props/yongjun-shop.png', 'assets/props/maillard_storage_door.png',
                    'assets/props/door.png'],
        'spawns': {
            'start': {'x': 176, 'y': 440, 'facing': 'right'},
            'from_path': {'x': 176, 'y': 440, 'facing': 'right'},
            'from_storage': {'x': 180, 'y': 304, 'facing': 'down'},
            'from_saloon': {'x': 402, 'y': 304, 'facing': 'down'},
        },
        'meta': {'connected': True},
        'entities': [
            {'type': 'prop', 'id': 'lounge_walls',
             'image': 'assets/props/maillard_lounge_walls.png',
             'x': 0, 'y': 0, 'w': 1536, 'h': 640, 'solid': False, 'sortY': -1000},
            {'type': 'prop', 'id': 'lounge_storage_image',
             'image': 'assets/props/maillard_storage_door.png',
             'x': 144, 'y': 70, 'w': 96, 'h': 96, 'solid': False, 'sortY': -10},
            {'type': 'sign', 'id': 'lounge_storage_door', 'x': 156, 'y': 148,
             'w': 72, 'h': 24, 'solid': False, 'script': 'maillard_storage_enter'},
            {'type': 'prop', 'id': 'lounge_saloon_image', 'image': 'assets/props/door.png',
             'x': 384, 'y': 82, 'w': 60, 'h': 78, 'scale': 1.5,
             'solid': False, 'sortY': -10},
            {'type': 'door', 'id': 'lounge_saloon_door', 'x': 378, 'y': 148,
             'w': 72, 'h': 24, 'to': 'maillard_saloon', 'spawn': 'start',
             'sfx': 'plug', 'interact': True},
            *[{'type': 'prop', 'id': f'lounge_statue_{pose}',
               'image': f'assets/props/statue_junhee_{pose}.png',
               'x': x + 6, 'y': 226, 'w': 32, 'h': 14,
               'ix': x, 'iy': 180, 'solid': True, 'script': f'maillard_statue_{pose}'}
              for x, pose in ((300, 'arms_crossed'), (460, 'laugh'), (620, 'gesture'))],
            {'type': 'prop', 'id': 'lounge_shop', 'image': 'assets/props/yongjun-shop.png',
             'x': 1010, 'y': 310, 'w': 172, 'h': 48, 'ix': 1000, 'iy': 170, 'solid': True},
            {'type': 'sign', 'id': 'lounge_shop_door', 'x': 1072, 'y': 346,
             'w': 48, 'h': 16, 'solid': False, 'script': 'maillard_shop'},
            {'type': 'prop', 'id': 'lounge_spring', 'image': 'assets/props/blue_buff.png',
             'anim': {'cols': 3, 'fps': 4}, 'x': 1344, 'y': 244, 'w': 32, 'h': 12,
             'ix': 1340, 'iy': 212, 'solid': True, 'script': 'maillard_spring'},
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
