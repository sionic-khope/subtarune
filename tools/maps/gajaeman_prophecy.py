#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_prophecy.py [--check]
# ──────────────────
"""BUILD328 prophecy hall: a narrow dark-navy path on black, six prophecy panels ~3s apart, the navy grand door at the end."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_prophecy'
ROWS: Final = 14
COLS: Final = 155
PATH_ROWS: Final = (10, 11)
PATH_END: Final = 153
FLOOR: Final = '▓'
# walking speed 218.4px/s × 3s ≈ 655px between reveals
FIRST_AT: Final = 400
STEP: Final = 650
PANELS: Final = [('prophecy328_1.png', 179, '인생의 시작'), ('prophecy328_2.png', 137, '실패와 고통'),
                 ('prophecy328_3.png', 139, '성공의 갈망, 후회'), ('prophecy328_4.png', 169, '외딴섬'),
                 ('prophecy328_5.png', 126, '다시 시작.'), ('prophecy328_6.png', 146, '끝')]
PANEL_H: Final = 140
DOOR_X: Final = 4700
DOOR_W, DOOR_H = 202, 264


def main() -> None:
    """Write the path, the hidden panels (revealed by the scene), the door and the arrival anchors."""
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_prophecy.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * COLS for _ in range(ROWS)]
    for row in PATH_ROWS:
        for col in range(0, PATH_END):
            cells[row][col] = FLOOR
    entities, prophecy = [], []
    # 그림은 소품이 아니라 장면(src/scenes/prophecy-hall.js)이 먼 벽처럼 반 속도로 그린다: at = 드러나는 주인공 x
    for index, (image, width, text) in enumerate(PANELS):
        prophecy.append({'image': f'assets/props/{image}', 'w': width, 'h': PANEL_H, 'at': FIRST_AT + index * STEP, 'text': text})
    door_left = DOOR_X - DOOR_W // 2
    entities.append({'type': 'prop', 'id': 'prophecy_door', 'image': 'assets/props/prophecy328_door.png',
                     'x': door_left + 21, 'y': 304, 'w': DOOR_W - 42, 'h': 16, 'ix': door_left, 'iy': 320 - DOOR_H,
                     'solid': True, 'script': 'castle_prophecy_door',
                     'aura': {'rgb': '110,140,255', 'radius': 130, 'alpha': 0.32, 'pulse': 1.4, 'centerY': 0.55}})
    for name, x in (('prophecy_stand_player', DOOR_X - 12), ('prophecy_stand_gyeongsub', DOOR_X - 76),
                    ('prophecy_stand_ppaman', DOOR_X + 52)):
        entities.append({'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
                         'x': x, 'y': 322, 'w': 24, 'h': 16, 'solid': False, 'hidden': True})
    entities.append({'type': 'trigger', 'id': 'prophecy_back', 'x': 0, 'y': 320, 'w': 10, 'h': 64,
                     'script': 'castle_spire_back'})
    data = {
        'id': MAP_ID, 'name': '가재맨성 예언의 회랑', 'stage': 'castle_prophecy_seen',
        'bgm': 'dark_place', 'bgmVolume': 0.5, 'followScreenY': 300, 'rows': [''.join(row) for row in cells],
        'preload': [f'assets/props/{image}' for image, _, _ in PANELS] + ['assets/props/prophecy328_door.png'],
        'spawns': {'start': {'x': 48, 'y': 336, 'facing': 'right'},
                   'door': {'x': DOOR_X - 12, 'y': 336, 'facing': 'up'}},
        'meta': {'connected': True, 'prophecy': prophecy},
        'entities': entities,
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == data and MAP_ID in index['maps']
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID)


if __name__ == '__main__':
    main()
