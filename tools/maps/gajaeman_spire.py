#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_spire.py [--check]
# ──────────────────
"""BUILD327 navy spire: one windless aisle up to the magic-spring room; the north passage stays open (next map TBD)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_spire'
ROWS: Final = 64
ROOM: Final = range(4, 18)
FLOOR, LEFT, RIGHT = '▒', '╟', '╢'


def main() -> None:
    """Write the passage, spring room, aisle, decoration, intro actors and anchors."""
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_spire.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * 24 for _ in range(ROWS)]
    for row in range(ROWS):
        left, right = (3, 20) if row in ROOM else (8, 15)
        cells[row][left] = LEFT
        cells[row][right] = RIGHT
        for col in range(left + 1, right):
            cells[row][col] = FLOOR
    entities = []
    for y in range(0, ROWS * 32, 192):
        entities.append({'type': 'prop', 'id': f'spire_floor_{y}', 'image': 'assets/tiles/castle327_aisle.png',
                         'x': 288, 'y': y, 'w': 192, 'h': 2, 'solid': False, 'sortY': -1})
    for y in range(624, (ROWS - 3) * 32, 160):
        for side, x in (('left', 204), ('right', 524)):
            entities.append({'type': 'prop', 'id': f'spire_sconce_{side}_{y}', 'image': 'assets/props/castle321_sconce.png',
                             'x': x, 'y': y, 'w': 40, 'h': 72, 'solid': False, 'sortY': 0})
    for side, window_x, column_x in (('left', 144, 200), ('right', 552, 488)):
        entities.extend([
            {'type': 'prop', 'id': f'spire_window_{side}', 'image': 'assets/props/castle321_window.png',
             'x': window_x, 'y': 64, 'w': 72, 'h': 176, 'solid': False, 'sortY': 0},
            {'type': 'prop', 'id': f'spire_column_{side}', 'image': 'assets/props/castle321_column.png',
             'x': column_x, 'y': 176, 'w': 80, 'h': 16, 'ix': column_x, 'iy': 32, 'solid': True},
        ])
    entities.append({'type': 'prop', 'id': 'spire_spring', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4},
                     'x': 548, 'y': 420, 'w': 32, 'h': 12, 'ix': 544, 'iy': 388, 'solid': True, 'script': 'maillard_spring'})
    # 도착 연출 기준점(숨김): 화면 아래 입구 → 대화 간격 64px 정렬, 동료 둘이 빠져나가는 지점, 가재맨이 잠깐 멈추는 방 입구
    for name, x, y in (('spire_in_player', 360, 2030), ('spire_in_gyeongsub', 328, 2030), ('spire_in_ppaman', 392, 2030),
                       ('spire_stand_player', 360, 1864), ('spire_stand_gyeongsub', 296, 1908),
                       ('spire_stand_ppaman', 424, 1908), ('spire_run_out', 360, 1500)):
        entities.append({'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
                         'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True})
    entities.extend([
        {'type': 'npc', 'id': 'spire_gajaeman', 'sprite': 'gajaeman_shadow', 'x': 360, 'y': 1740,
         'facing': 'down', 'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.89},
        {'type': 'npc', 'id': 'spire_junhee', 'sprite': 'junhee', 'x': 424, 'y': 2030,
         'facing': 'up', 'solid': False, 'wander': 0, 'hidden': True},
        {'type': 'npc', 'id': 'spire_youngcle', 'sprite': 'youngcle_hover', 'x': 296, 'y': 2030,
         'facing': 'up', 'solid': False, 'wander': 0, 'hidden': True},
        {'type': 'trigger', 'id': 'spire_back', 'x': 288, 'y': 2038, 'w': 192, 'h': 10, 'script': 'castle_spire_back'},
    ])
    data = {
        'id': MAP_ID, 'name': '가재맨성 남색 오르막', 'stage': 'castle_spire_arrived',
        'bgm': None, 'followScreenY': 210, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_spire_intro', 'early': True},
        'spawns': {'start': {'x': 360, 'y': 2012, 'facing': 'up'},
                   'after': {'x': 360, 'y': 1848, 'facing': 'up'},
                   'spring': {'x': 540, 'y': 452, 'facing': 'up'}},
        'meta': {'connected': True, 'corridorWidth': 192},
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
