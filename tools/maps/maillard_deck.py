#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/maillard_deck.py [--check]
# ──────────────────
"""Generate the enclosed Maillard lower hold; the exterior deck comes later."""
import json
from pathlib import Path
import sys
from typing import Final

WIDTH: Final = 30
HEIGHT: Final = 14
MAP_ID: Final = 'maillard_deck'
rows = [' ' * WIDTH for _ in range(5)]
rows.extend(' ' + 'M' * (WIDTH - 2) + ' ' for _ in range(5, HEIGHT - 2))
rows.extend([' ' * WIDTH] * 2)
map_data = {
    'id': MAP_ID, 'name': '마이야르호 선창', 'stage': 'void_fallen',
    'bgm': 'wind', 'dim': 0.08, 'rows': rows,
    'enter': {'script': 'maillard_hold', 'flag': 'maillard_hold_done', 'early': True},
    'preload': ['assets/tiles/maillard_deck.png', 'assets/props/maillard_hold_walls.png',
                'assets/props/maillard_hold_hatch.png', 'assets/props/maillard_hold_stairs.png'],
    'spawns': {
        'start': {'x': 452, 'y': 216, 'facing': 'up'},
        'arrival': {'x': 452, 'y': 216, 'facing': 'up'},
        'from_path': {'x': 760, 'y': 248, 'facing': 'right'},
    },
    'meta': {'connected': True, 'stage': {
        'player': [452, 216], 'gyeongsub': [388, 280], 'ppaman': [516, 280],
        'yongjun': [316, 248],
    }},
    'entities': [
        {'type': 'prop', 'id': 'hold_walls', 'image': 'assets/props/maillard_hold_walls.png',
         'x': 0, 'y': 0, 'w': 960, 'h': 448, 'solid': False, 'sortY': -1000},
        {'type': 'prop', 'id': 'hold_hatch', 'image': 'assets/props/maillard_hold_hatch.png',
         'x': 432, 'y': 320, 'w': 64, 'h': 48, 'solid': False, 'sortY': -10,
         'script': 'maillard_hold_hatch'},
        {'type': 'prop', 'id': 'hold_stage', 'image': 'assets/props/maillard_hold_hatch.png',
         'x': 452, 'y': 216, 'w': 24, 'h': 16, 'hidden': True, 'solid': False},
        {'type': 'prop', 'id': 'hold_stairs', 'image': 'assets/props/maillard_hold_stairs.png',
         'x': 832, 'y': 224, 'w': 96, 'h': 80, 'solid': False, 'sortY': -5,
         },
        {'type': 'door', 'id': 'hold_stairs_door', 'x': 808, 'y': 216, 'w': 144, 'h': 88,
         'to': 'maillard_path', 'spawn': 'from_hold', 'requires': 'maillard_hold_done',
         'lockedScript': 'maillard_hold_stairs', 'sfx': False, 'interact': True},
        {'type': 'npc', 'id': 'yongjun', 'sprite': 'yongjun', 'x': 48, 'y': 248,
         'facing': 'right', 'wander': 0, 'solid': False, 'hidden': True,
         'unless': 'maillard_hold_done'},
    ],
}
output = Path(f'assets/maps/{MAP_ID}.json')
index_path = Path('assets/maps/index.json')
index = json.loads(index_path.read_text(encoding='utf-8'))
if '--check' in sys.argv:
    same = json.loads(output.read_text(encoding='utf-8')) == map_data
    registered = MAP_ID in index['maps']
    print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
    sys.exit(0 if same and registered else 1)
output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1), encoding='utf-8')
if MAP_ID not in index['maps']:
    index['maps'].append(MAP_ID)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)
