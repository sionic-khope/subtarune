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
ROWS: Final = 20
COLS: Final = 242
PATH_ROWS: Final = (10, 11)
PATH_END: Final = 241   # (PATH_END−1)×32 가 192의 배수 — 바닥 띠가 길 끝에서 딱 끝난다
# BUILD331: 샘 방에서 올라온 흐름 그대로 — 아래에서 위로 올라갔다가 오른쪽으로 꺾는다
STUB_COLS: Final = (1, 2)
STUB_ROWS: Final = range(12, 20)
FLOOR: Final = '▓'
# walking speed 218.4px/s × 5s ≈ 1092px between reveals (BUILD331 사용자 “5초에 하나씩”)
FIRST_AT: Final = 400
STEP: Final = 1092
PANELS: Final = [('prophecy328_1.png', 163, '인생의 시작'), ('prophecy328_2.png', 141, '실패와 고통'),
                 ('prophecy328_3.png', 123, '성공의 갈망, 후회'), ('prophecy328_4.png', 184, '외딴섬'),
                 ('prophecy328_5.png', 137, '다시 시작.'), ('prophecy328_6.png', 151, '끝')]
PANEL_H: Final = 140
DOOR_X: Final = 7400
DOOR_W, DOOR_H = 202, 264


def main() -> None:
    """Write the path, the hidden panels (revealed by the scene), the door and the arrival anchors."""
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_prophecy.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * COLS for _ in range(ROWS)]
    for row in PATH_ROWS:
        for col in range(STUB_COLS[0], PATH_END):
            cells[row][col] = FLOOR
    for row in STUB_ROWS:
        for col in STUB_COLS:
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
    # BUILD331 사파이어 바닥(아주 어둡게) + 길 위쪽 그림자
    for x in range(STUB_COLS[0] * 32, PATH_END * 32, 192):
        entities.append({'type': 'prop', 'id': f'prophecy_floor_{x}', 'image': 'assets/props/castle331_prophecy_strip.png',
                         'x': x, 'y': PATH_ROWS[0] * 32, 'w': 192, 'h': 2, 'solid': False, 'sortY': -2})
        entities.append({'type': 'prop', 'id': f'prophecy_shadow_{x}', 'image': 'assets/props/castle331_shadow_top_long.png',
                         'x': x, 'y': PATH_ROWS[0] * 32, 'w': 192, 'h': 2, 'solid': False, 'sortY': -0.5})
    for y in (STUB_ROWS[0] * 32, STUB_ROWS[0] * 32 + 192):
        entities.append({'type': 'prop', 'id': f'prophecy_floor_stub_{y}', 'image': 'assets/props/castle331_prophecy_strip_v.png',
                         'x': STUB_COLS[0] * 32, 'y': y, 'w': 64, 'h': 2, 'solid': False, 'sortY': -2})
    entities.append({'type': 'trigger', 'id': 'prophecy_back', 'x': STUB_COLS[0] * 32, 'y': ROWS * 32 - 10, 'w': 64, 'h': 10,
                     'script': 'castle_spire_back'})
    data = {
        'id': MAP_ID, 'name': '가재맨성 예언의 회랑', 'stage': 'castle_prophecy_seen',
        'bgm': 'dark_place', 'bgmVolume': 0.5, 'followScreenY': 300, 'rows': [''.join(row) for row in cells],
        'preload': [f'assets/props/{image}' for image, _, _ in PANELS] + ['assets/props/prophecy328_door.png'],
        'spawns': {'start': {'x': STUB_COLS[0] * 32 + 20, 'y': ROWS * 32 - 44, 'facing': 'up'},
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
