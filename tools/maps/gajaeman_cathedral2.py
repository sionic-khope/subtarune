#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_cathedral2.py [--check]
# ──────────────────
"""BUILD325/326/328 second cathedral hall (no gajaeman: he has already gone ahead to the spire): ~70s at the forced slow walk (124.8px/s) + mid rescue ≈ 1분30초."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_cathedral2'
ROWS: Final = 275
MID_Y: Final = 6260


def main() -> None:
    """Write the aisle, its decoration, the rescue actors and the anchors."""
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_cathedral2.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * 24 for _ in range(ROWS)]
    for row in range(0, ROWS - 2):
        cells[row][8] = '╞'
        cells[row][15] = '╡'
        for col in range(9, 15):
            cells[row][col] = '░'
    entities = []
    for y in range(0, (ROWS - 2) * 32, 192):
        entities.append({'type': 'prop', 'id': f'cathedral2_floor_{y}', 'image': 'assets/tiles/castle321_aisle.png',
                         'x': 288, 'y': y, 'w': 192, 'h': 2, 'solid': False, 'sortY': -1})
    for y in range(112, (ROWS - 4) * 32, 160):
        for side, x in (('left', 204), ('right', 524)):
            entities.append({'type': 'prop', 'id': f'cathedral2_sconce_{side}_{y}', 'image': 'assets/props/castle321_sconce.png',
                             'x': x, 'y': y, 'w': 40, 'h': 72, 'solid': False, 'sortY': 0})
    for name, x, y in (('cath2_mid_player', 360, MID_Y), ('cath2_mid_gyeongsub', 296, MID_Y + 48),
                       ('cath2_mid_ppaman', 424, MID_Y + 48)):
        entities.append({'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
                         'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True})
    entities.extend([
        {'type': 'npc', 'id': 'cath2_youngcle', 'sprite': 'youngcle_hover', 'x': 60, 'y': MID_Y - 120,
         'facing': 'right', 'solid': False, 'wander': 0, 'hidden': True},
        {'type': 'npc', 'id': 'cath2_junhee', 'sprite': 'junhee', 'x': 700, 'y': MID_Y - 160,
         'facing': 'left', 'solid': False, 'wander': 0, 'hidden': True},
        # BUILD327: 꼭대기(성공 지점)는 맵 가장자리의 밟는 문으로 남색 오르막에 이어진다
        {'type': 'door', 'id': 'cathedral2_to_spire', 'x': 288, 'y': 0, 'w': 192, 'h': 10,
         'to': 'gajaeman_castle_spire', 'spawn': 'start', 'interact': False, 'sfx': False},
    ])
    data = {
        'id': MAP_ID, 'name': '가재맨성 검은 대성당 둘째 회랑', 'stage': 'castle_cathedral_climb',
        'bgm': None, 'followScreenY': 176, 'rows': [''.join(row) for row in cells],
        'preload': ['assets/props/cathedral323_sword.png'],
        'spawns': {'start': {'x': 360, 'y': (ROWS - 2) * 32 - 72, 'facing': 'up'},
                   'rescue': {'x': 360, 'y': MID_Y + 220, 'facing': 'up'},
                   'end': {'x': 360, 'y': 104, 'facing': 'up'}},
        'meta': {'connected': True, 'corridorWidth': 192, 'laneWidth': 64,
                 'cathedralClimb': {'part': 2, 'startY': (ROWS - 2) * 32 - 80, 'stopY': 560, 'topY': 120,
                                    'midY': MID_Y, 'leaveY': 0}},
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
