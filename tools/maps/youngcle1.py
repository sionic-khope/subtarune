#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# uv run tools/maps/youngcle1.py [--check]
# ──────────────────
"""Generate the first blue iron ship interior and its central television stage."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle1'
WIDTH: Final = 42
HEIGHT: Final = 18


def main() -> None:
    """Write the interior map or verify the generated artifact is synchronized."""
    rows = ['J' * WIDTH] * 6
    rows.extend('J' + 'I' * (WIDTH - 2) + 'J' for _ in range(6, 16))
    rows.extend(['J' * WIDTH] * 2)
    map_data = {
        'id': MAP_ID, 'name': '영클 전함 1', 'stage': 'void_fallen',
        'bgm': None, 'dim': 0.04, 'rows': rows,
        'enter': {'script': 'youngcle_intro', 'early': True},
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/props/youngcle1_walls.png',
                    'assets/props/youngcle_tv_frame.png', 'assets/props/maillard_storage_door.png',
                    'assets/props/youngcle_angel_door145.png',
                    'assets/sprites/youngcle.png',
                    *[f'assets/illustrations/youngcle-tv-{pose}.png'
                      for pose in ('smirk', 'laugh', 'greet', 'oh', 'taunt', 'shrug', 'bye', 'yes', 'surprise',
                                   'read', 'shock', 'hide')]],
        'spawns': {
            'start': {'x': 660, 'y': 376, 'facing': 'up'},
            'from_bridge': {'x': 660, 'y': 376, 'facing': 'up'},
            'left': {'x': 108, 'y': 228, 'facing': 'down'},
            'right': {'x': 1212, 'y': 228, 'facing': 'down'},
        },
        'meta': {'connected': True, 'stage': {
            'player': [660, 264], 'gyeongsub': [596, 264], 'ppaman': [724, 264],
            'junhee': [532, 232], 'yongjun': [788, 232],
        }},
        'entities': [
            {'type': 'prop', 'id': 'youngcle_walls', 'image': 'assets/props/youngcle1_walls.png',
             'x': 0, 'y': 0, 'w': 1344, 'h': 576, 'solid': False, 'sortY': -1000},
            {'type': 'prop', 'id': 'youngcle_tv', 'image': 'assets/props/youngcle_tv_frame.png',
             'x': 528, 'y': 32, 'w': 288, 'h': 176, 'solid': False, 'sortY': -900},
            {'type': 'sign', 'id': 'youngcle_tv_screen', 'x': 528, 'y': 196,
             'w': 288, 'h': 12, 'solid': False, 'script': 'youngcle_tv_off',
             'inspectRect': {'x': 0, 'y': -164, 'w': 288, 'h': 176}},
            {'type': 'npc', 'id': 'youngcle_junhee', 'sprite': 'junhee',
             'x': 532, 'y': 232, 'facing': 'up', 'wander': 0, 'solid': False,
             'unless': 'youngcle_intro_done'},
            {'type': 'npc', 'id': 'youngcle_yongjun', 'sprite': 'yongjun',
             'x': 788, 'y': 232, 'facing': 'up', 'wander': 0, 'solid': False,
             'unless': 'youngcle_intro_done'},
            {'type': 'prop', 'id': 'youngcle_left_door_image',
             'image': 'assets/props/youngcle_angel_door145.png',
             'x': 48, 'y': 48, 'w': 144, 'h': 144, 'scale': 1.5,
             'solid': False, 'sortY': -900},
            {'type': 'door', 'id': 'youngcle_left_door', 'x': 80, 'y': 180,
             'w': 80, 'h': 32, 'to': MAP_ID, 'spawn': 'left',
             'requires': 'youngcle_left_door_open',
             'lockedScript': 'youngcle_left_door_locked', 'interact': True, 'solid': False},
            {'type': 'prop', 'id': 'youngcle_right_door_image',
             'image': 'assets/props/maillard_storage_door.png',
             'x': 1152, 'y': 48, 'w': 144, 'h': 144, 'scale': 1.5,
             'solid': False, 'sortY': -900},
            {'type': 'door', 'id': 'youngcle_right_door', 'x': 1184, 'y': 180,
             'w': 80, 'h': 32, 'to': 'youngcle2', 'spawn': 'left',
             'sfx': 'plug', 'interact': True, 'solid': False},
            {'type': 'door', 'id': 'youngcle_to_bridge', 'x': 624, 'y': 496,
             'w': 96, 'h': 24, 'to': 'youngcle_bridge', 'spawn': 'from_inside',
             'sfx': 'plug', 'interact': True},
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
