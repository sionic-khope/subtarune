#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from the repository root: uv run tools/maps/youngcle6.py [--check]
# ──────────────────
"""Generate the compact blue iron lounge after the three cargo puzzles."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle6'
WIDTH: Final = 20
HEIGHT: Final = 14


def main() -> None:
    """Write the lounge map or verify its registered generator output."""
    rows = ['J' * WIDTH] * 6
    rows.extend('J' + 'I' * (WIDTH - 2) + 'J' for _ in range(6, 13))
    rows.append('J' * WIDTH)
    map_data = {
        'id': MAP_ID, 'name': '영클 전함 휴게실', 'stage': 'void_fallen',
        'bgm': 'youngcle_factory', 'dim': 0.04, 'followScreenY': 300, 'rows': rows,
        'enter': {'script': 'youngcle_lounge_plan_b', 'early': True},
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/props/youngcle6_walls.png',
                    'assets/props/youngcle_tv_frame.png', 'assets/props/sofa.png',
                    'assets/props/youngcle1_walls.png', 'assets/props/youngcle_angel_door145.png',
                    'assets/props/youngcle_electric_cage.png',
                    'assets/props/maillard_storage_door.png',
                    *[f'assets/illustrations/youngcle-tv-{pose}.png'
                      for pose in ('middle-finger', 'question', 'questions', 'facepalm')]],
        'spawns': {
            'start': {'x': 80, 'y': 304, 'facing': 'right'},
            'left': {'x': 80, 'y': 304, 'facing': 'right'},
            'from_stage': {'x': 548, 'y': 240, 'facing': 'down'},
        },
        'meta': {'connected': True, 'stage': {
            'player': [308, 328], 'gyeongsub': [244, 328], 'ppaman': [372, 328],
            'junhee': [252, 244], 'yongjun': [364, 244],
        }},
        'entities': [
            {'type': 'prop', 'id': 'youngcle6_walls', 'image': 'assets/props/youngcle6_walls.png',
             'x': 0, 'y': 0, 'w': 640, 'h': 448, 'solid': False, 'sortY': -1000},
            {'type': 'prop', 'id': 'youngcle_tv', 'image': 'assets/props/youngcle_tv_frame.png',
             'x': 176, 'y': 24, 'w': 288, 'h': 176, 'solid': False, 'sortY': -900},
            {'type': 'sign', 'id': 'youngcle_tv_screen', 'x': 176, 'y': 188,
             'w': 288, 'h': 12, 'solid': False},
            *[{'type': 'prop', 'id': f'youngcle6_bench_{index}',
               'image': 'assets/props/sofa.png', 'x': x + 6, 'y': 398,
               'w': 88, 'h': 18, 'ix': x, 'iy': 368, 'solid': True}
              for index, x in ((1, 64), (2, 476))],
            *[{'type': 'npc', 'id': sprite, 'sprite': sprite,
               'x': x, 'y': y, 'facing': facing, 'wander': 0, 'visualScale': scale,
               'hidden': True, 'solid': False}
              for sprite, x, y, facing, scale in (
                  ('warm_bidet', 116, 248, 'down', 1),
                  ('mini_mario', 180, 344, 'right', 1),
                  ('lucky_guy', 436, 344, 'down', 1.79),
                  ('park_guardian_costume', 500, 248, 'down', 2.22),
              )],
            {'type': 'npc', 'id': 'youngcle6_junhee', 'sprite': 'junhee',
             'x': 252, 'y': 244, 'facing': 'up', 'wander': 0, 'solid': False,
             'unless': 'youngcle_lounge_plan_b_done'},
            {'type': 'npc', 'id': 'youngcle6_yongjun', 'sprite': 'yongjun',
             'x': 364, 'y': 244, 'facing': 'up', 'wander': 0, 'solid': False,
             'unless': 'youngcle_lounge_plan_b_done'},
            {'type': 'door', 'id': 'youngcle6_left', 'x': 32, 'y': 288, 'w': 16, 'h': 64,
             'to': 'youngcle_cats', 'spawn': 'right', 'sfx': False, 'interact': False},
            {'type': 'prop', 'id': 'youngcle6_stage_door_image',
             'image': 'assets/props/maillard_storage_door.png',
             'x': 512, 'y': 96, 'w': 96, 'h': 96, 'solid': False, 'sortY': -900},
            {'type': 'door', 'id': 'youngcle6_to_stage', 'x': 528, 'y': 180, 'w': 64, 'h': 32,
             'to': 'youngcle7', 'spawn': 'left', 'requires': 'youngcle_lounge_plan_b_done',
             'lockedScript': 'youngcle_left_door_locked',
             'sfx': 'plug', 'interact': True, 'solid': False},
        ],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
