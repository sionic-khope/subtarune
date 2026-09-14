#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from the repository root: uv run tools/maps/youngcle7.py [--check]
# ──────────────────
"""Generate the silent approach and audience stage inside Youngcle's iron ship."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle7'
WIDTH: Final = 38
HEIGHT: Final = 20
DONE: Final = 'editor_union_stage_done'
WON: Final = 'park_guardian_won'


def main() -> None:
    """Write the stage map or check its registered generator output."""
    cells = [['J'] * WIDTH for _ in range(HEIGHT)]
    for row in range(9, 19):
        for col in range(10, 31):
            cells[row][col] = 'I'
    for row in range(13, 17):
        for col in range(1, 10):
            cells[row][col] = 'I'
        for col in range(31, 37):
            cells[row][col] = 'I'
    for row in range(1, 10):
        for col in range(29, 33):
            cells[row][col] = 'I'
    map_data = {
        'id': MAP_ID, 'name': '영클 전함 편집노조 스테이지', 'stage': 'void_fallen',
        'bgm': None, 'battleBg': 'editor_union_stage', 'dim': 0.68,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png',
                    'assets/props/editor_union_audience.png',
                    'assets/props/editor-union-crowd.png',
                    'assets/props/editor-union-glyphs.png',
                    'assets/props/editor-union-mushroom.png',
                    *[f'assets/props/editor-union-{part}.png'
                      for part in ('speaker', 'truss', 'curtain', 'control', 'wall-panel')]],
        'spawns': {
            'start': {'x': 96, 'y': 480, 'facing': 'right'},
            'left': {'x': 96, 'y': 480, 'facing': 'right'},
            'after_intro': {'x': 400, 'y': 504, 'facing': 'right'},
            'battle_ready': {'x': 730, 'y': 416, 'facing': 'right'},
        },
        'meta': {'connected': True, 'stage': {
            'player': [400, 504], 'gyeongsub': [448, 504], 'ppaman': [496, 504],
            'park_guardian_costume': [760, 416], 'warm_bidet': [480, 416],
            'ttuulla': [620, 488], 'mini_mario': [960, 488],
            'editor_one': [608, 448], 'editor_two': [704, 448],
            'editor_three': [800, 448], 'editor_four': [896, 448],
            'upper_passage': [964, 40], 'right_passage': [1144, 480],
        }},
        'entities': [
            *[{'type': 'prop', 'id': f'stage_decor_wall_{index}',
               'image': 'assets/props/editor-union-wall-panel.png',
               'x': x, 'y': y, 'w': 128, 'h': 76, 'solid': False, 'sortY': -980}
              for index, (x, y) in enumerate((
                  *[(x, y) for x in (0, 128, 1056) for y in (0, 76, 152, 228, 304)],
                  *[(x, 0) for x in (256, 384, 512, 640, 768)],
                  (0, 552), (128, 552), (992, 324),
              ))],
            *[{'type': 'prop', 'id': f'stage_decor_{part}_{index}',
               'image': f'assets/props/editor-union-{part}.png',
               'x': x, 'y': y, 'w': width, 'h': height, 'solid': False, 'sortY': -940}
              for index, (part, x, y, width, height) in enumerate((
                  ('speaker', 256, 272, 64, 88), ('speaker', 1088, 256, 64, 88),
                  ('truss', 208, 0, 218, 112), ('truss', 432, 0, 218, 112),
                  ('truss', 656, 0, 218, 112),
                  ('curtain', 128, 112, 96, 124), ('curtain', 1088, 96, 96, 124),
                  ('control', 1088, 560, 96, 52),
              ))],
            *[{'type': 'factory_rail', 'id': f'stage_stand_structure_{index}',
               'x': x, 'y': y, 'w': width, 'h': height, 'sortY': -920}
              for index, (x, y, width, height) in enumerate((
                  (212, 80, 696, 12), (212, 92, 12, 180),
                  (896, 92, 12, 180), (212, 272, 696, 16),
              ))],
            {'type': 'prop', 'id': 'stage_audience',
             'image': 'assets/props/editor_union_audience.png',
             'x': 224, 'y': 96, 'w': 672, 'h': 176, 'solid': False, 'sortY': -900},
            {'type': 'sign', 'id': 'stage_center', 'x': 600, 'y': 432,
             'w': 1, 'h': 1, 'solid': False},
            *[{'type': 'factory_rail', 'id': f'stage_rail_{index}',
               'x': x, 'y': y, 'w': width, 'h': 12}
              for index, (x, y, width) in enumerate((
                  (32, 404, 288), (32, 544, 288), (320, 608, 672),
                  (992, 404, 192), (992, 544, 192),
                  (320, 304, 608),
              ))],
            *[{'type': 'npc', 'id': sprite, 'sprite': sprite,
               'x': x, 'y': y, 'facing': facing, 'wander': 0,
               'visualScale': scale, 'hidden': True, 'solid': False, 'unless': DONE}
              for sprite, x, y, facing, scale in (
                  ('park_guardian_costume', 760, 416, 'left', 2.66),
                  ('warm_bidet', 480, 416, 'down', 1),
                  ('ttuulla', 620, 488, 'up', 1.79),
                  ('mini_mario', 960, 488, 'left', 1),
              )],
            {'type': 'npc', 'id': 'park_guardian_ready', 'sprite': 'park_guardian_costume',
             'x': 760, 'y': 416, 'facing': 'left', 'wander': 0, 'visualScale': 2.66,
             'solid': False, 'requires': DONE, 'unless': WON,
             'script': 'editor_union_stage_wait'},
            {'type': 'npc', 'id': 'park_guardian_defeated', 'sprite': 'park_guardian',
             'x': 760, 'y': 416, 'facing': 'left', 'wander': 0,
             'solid': False, 'requires': WON},
            {'type': 'trigger', 'id': 'editor_union_stage_trigger',
             'x': 464, 'y': 416, 'w': 80, 'h': 112, 'once': True,
             'unless': DONE, 'script': 'editor_union_stage'},
            {'type': 'door', 'id': 'youngcle7_left', 'x': 32, 'y': 448, 'w': 16, 'h': 64,
             'to': 'youngcle6', 'spawn': 'from_stage', 'sfx': False, 'interact': False},
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
