# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# Run: uv run tools/maps/obj5.py [--check]
"""Generate the object-region grass approach, gun chest, and open-water raft dock."""
import json
from pathlib import Path
import sys
from typing import Final

sys.path.insert(0, '.')
from tools.maps.objlib import build

WIDTH: Final = 48
HEIGHT: Final = 18
SHORE: Final = 24
entities = [
    {'type': 'door', 'x': 32, 'y': 288, 'w': 8, 'h': 96,
     'to': 'obj2', 'spawn': 'from_right', 'sfx': False},
    {'type': 'prop', 'id': 'gun_chest', 'image': 'assets/props/chest_small.png',
     'x': 712, 'y': 296, 'w': 28, 'h': 10, 'ix': 712, 'iy': 284,
     'solid': True, 'script': 'obj5_chase'},
    {'type': 'trigger', 'x': 660, 'y': 288, 'w': 108, 'h': 96,
     'once': True, 'flag': 'obj5_boarding_seen', 'script': 'obj5_chase'},
    {'type': 'raft', 'id': 'obj5_raft', 'image': 'assets/props/raft.png',
     'x': 776, 'y': 308, 'route': [[1408, 308]], 'speed': 171, 'jump': True,
     'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below'},
]
land_rows = build(SHORE, HEIGHT, 9, 11, entities,
                  clear=((19, 23, 'top'), (19, 23, 'bottom')))
grid = [list(row) for row in land_rows]
for row in range(8, 13):
    for col in range(19, SHORE):
        grid[row][col] = 'a' if (row + col) % 2 == 0 else 'A'
for col in range(2, 19):
    for row in (8, 12):
        entities.append({
            'type': 'prop', 'id': f'grass_{row}_{col}',
            'image': 'assets/props/bush_teal.png', 'solid': False,
            'x': col * 32, 'y': row * 32, 'w': 32, 'h': 8,
            'ix': col * 32 - 12, 'iy': row * 32 - 24,
        })
rows = [''.join(row) + ''.join('o' if (r + c) % 2 == 0 else 'O'
        for c in range(SHORE, WIDTH)) for r, row in enumerate(grid)]
map_data = {
    'id': 'obj5', 'name': '옵젝영역 해안', 'bgm': 'baron_intro',
    'stage': 'void_fallen', 'dim': 0, 'backdrop': 'obj_forest', 'rows': rows,
    'enter': {'script': 'obj5_resume'},
    'preload': ['assets/props/wooden_gun.png'],
    'spawns': {
        'start': {'x': 60, 'y': 328, 'facing': 'right'},
        'from_left': {'x': 60, 'y': 328, 'facing': 'right'},
        'dock': {'x': 624, 'y': 328, 'facing': 'right'},
    },
    'meta': {'connected': True, 'seaColumn': SHORE, 'seaHoldX': 1200,
             'approachRunSeconds': 600 / 220, 'events': ['gun_chest'],
             'stage': {'player': [670, 328], 'ppaman': [734, 356], 'gyeongsub': [606, 356]}},
    'entities': entities,
}
path = Path('assets/maps/obj5.json')
if '--check' in sys.argv:
    same = json.loads(path.read_text(encoding='utf-8')) == map_data
    print('obj5', 'same' if same else 'DIFFERENT')
    sys.exit(0 if same else 1)
path.write_text(json.dumps(map_data, ensure_ascii=False, indent=1), encoding='utf-8')
print('wrote', path, WIDTH, 'x', HEIGHT)
