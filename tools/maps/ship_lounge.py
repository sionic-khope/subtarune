#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/ship_lounge.py [--check]
# ──────────────────
"""엄청대박인배 라운지(BUILD225). 24x36 세로 방: 가운데 보라 융단 통로(cols 10~13), 위쪽 가운데 웅장한 보라 문, 좌우에 소파·탁자 대화 구역과 샘물·홀로 탁자.
뒷벽 소품은 x=384 기준 좌우 대칭이다 — 현창(ix 40 / 632) · 플라즈마 배관(ix 176 / 494) · 문(ix 304). 서로 겹치지 않게 사이를 40/30px 띄운다(BUILD225 사용자 "라운지맵 전반적으로 너무 이상").
NPC 는 소파·탁자 그림 위에 겹쳐 서지 않는다(발 y 를 소품 그림 아래끝보다 내린다). 영클·쥰희·용준 셋은 성 이벤트 연출 자리라 통로 위쪽(y<300)에 남는다."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'ship_lounge'
WIDTH: Final = 24
HEIGHT: Final = 36
P: Final = 'assets/props/'
NPCS: Final = (
    ('youngcle', 'youngcle', 286, 276, 'down'),
    ('junhee', 'junhee', 370, 258, 'down'),
    ('yongjun', 'yongjun', 454, 276, 'down'),
    ('naram', 'naram_giant', 228, 532, 'left'),
    ('obangsun', 'obangsun', 132, 604, 'right'),
    ('ttuulla', 'ttuulla', 478, 576, 'left'),
    ('warm_bidet', 'warm_bidet', 486, 796, 'left'),
    ('park_guardian', 'park_guardian_costume', 248, 964, 'right'),
    ('mini_mario', 'mini_mario', 568, 1008, 'left'),
)


def main() -> None:
    """Write deterministic map JSON, or audit it without mutating files."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/ship_lounge.py [--check]')
        return
    if any(arg not in ('--check',) for arg in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [['G'] * WIDTH for _ in range(HEIGHT)]
    for row in range(6, HEIGHT - 1):
        for col in range(1, WIDTH - 1):
            cells[row][col] = ';' if row in (6, 34) else ':'
    for row in range(6, 34):
        for col in range(10, 14):
            cells[row][col] = '/'
    entities = [
        {'type': 'prop', 'id': 'ship_lounge_grand_door', 'image': P + 'ship_lounge_grand_door.png',
         'x': 304, 'y': 184, 'w': 160, 'h': 24, 'ix': 304, 'iy': 16,
         'solid': True, 'sortY': 0, 'script': 'ship_lounge_door'},
        *[{'type': 'prop', 'id': f'ship_lounge_window_{i}', 'image': P + 'ship_lounge_window.png',
           'x': x + 20, 'y': 176, 'w': 76, 'h': 16, 'ix': x, 'iy': 40,
           'solid': False, 'sortY': 0}
          for i, x in enumerate((40, 632))],
        {'type': 'trigger', 'id': 'ship_castle_trigger', 'x': 312, 'y': 322, 'w': 144, 'h': 96,
         'once': True, 'flag': 'ship_castle_started', 'unless': 'ship_castle_done',
         'script': 'ship_castle'},
        {'type': 'prop', 'id': 'ship_lounge_ladder', 'image': P + 'ship_lounge_ladder.png',
         'x': 352, 'y': 1088, 'w': 64, 'h': 24, 'ix': 352, 'iy': 1024,
         'solid': True, 'script': 'ship_lounge_return'},
        {'type': 'prop', 'id': 'ship_lounge_spring', 'image': P + 'blue_buff.png',
         'x': 652, 'y': 756, 'w': 32, 'h': 12, 'ix': 648, 'iy': 724,
         'solid': True, 'anim': {'cols': 3, 'fps': 4}, 'script': 'ship_lounge_spring'},
        *[{'type': 'prop', 'id': f'lounge_sofa_{i}', 'image': P + 'backstage_couch.png',
           'x': x, 'y': y + 58, 'w': 96, 'h': 40, 'ix': x, 'iy': y, 'solid': True}
          for i, (x, y) in enumerate(((104, 368), (548, 368), (104, 768), (548, 592)))],
        *[{'type': 'prop', 'id': f'lounge_table_{i}', 'image': P + 'table_low.png',
           'x': x + 4, 'y': y + 20, 'w': 72, 'h': 26, 'ix': x, 'iy': y, 'solid': True}
          for i, (x, y) in enumerate(((112, 480), (556, 480), (556, 704)))],
        *[{'type': 'prop', 'id': f'lounge_conduit_{i}', 'image': P + 'ship_conduit.png',
           'x': x, 'y': 128, 'w': 98, 'h': 24, 'ix': x, 'iy': 20, 'solid': True,
           'anim': {'cols': 3, 'fps': 5}}
          for i, x in enumerate((176, 494))],
        {'type': 'prop', 'id': 'lounge_holo', 'image': P + 'ship_holo_table.png',
         'x': 548, 'y': 944, 'w': 96, 'h': 28, 'ix': 548, 'iy': 900,
         'solid': True, 'anim': {'cols': 3, 'fps': 5}},
        {'type': 'prop', 'id': 'lounge_tv', 'image': P + 'ship_tv.png',
         'x': 112, 'y': 720, 'w': 80, 'h': 24, 'ix': 112, 'iy': 672,
         'solid': True, 'anim': {'cols': 2, 'fps': 6}},
        *[{'type': 'npc', 'id': f'lounge_{id_}', 'sprite': sprite, 'x': x, 'y': y,
           'facing': facing, 'wander': 0, 'script': f'ship_lounge_{id_}',
           **({'visualScale': 2} if id_ == 'youngcle' else {}),
           **({'visualScale': 2.22} if id_ == 'park_guardian' else {}),
           **({'visualScale': 1.79} if id_ == 'ttuulla' else {}),
           **({'requires': 'ship_ending_done'} if id_ in ('youngcle', 'junhee', 'yongjun') else {})}
          for id_, sprite, x, y, facing in NPCS],
    ]
    map_data = {
        'id': MAP_ID, 'name': '엄청대박인배 라운지', 'stage': 'ship_ending_done',
        'bgm': 'ship_lounge', 'dim': 0.06, 'rows': [''.join(row) for row in cells],
        'spawns': {
            'from_control': {'x': 372, 'y': 900, 'facing': 'up'},
            'castle_approach': {'x': 372, 'y': 470, 'facing': 'up'},
        },
        'meta': {'connected': True, 'route': [[11, 28], [11, 7]],
                 'role': '보스전 뒤 휴식, 좌우 대화 공간과 위쪽 보라 문'},
        'entities': entities,
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
