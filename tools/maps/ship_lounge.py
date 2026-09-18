#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/ship_lounge.py [--check]
# ──────────────────
"""Generate the tall ship lounge: central promenade and side conversation pockets."""
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
    ('youngcle', 'youngcle', 488, 264, 'left'),
    ('junhee', 'junhee', 244, 330, 'right'),
    ('yongjun', 'yongjun', 220, 432, 'down'),
    ('naram', 'naram_giant', 220, 650, 'right'),
    ('obangsun', 'obangsun', 252, 708, 'left'),
    ('ttuulla', 'ttuulla', 548, 476, 'left'),
    ('warm_bidet', 'warm_bidet', 548, 676, 'left'),
    ('park_guardian', 'park_guardian_costume', 188, 868, 'right'),
    ('mini_mario', 'mini_mario', 556, 916, 'left'),
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
        {'type': 'prop', 'id': 'ship_lounge_ladder', 'image': P + 'ship_lounge_ladder.png',
         'x': 352, 'y': 1088, 'w': 64, 'h': 24, 'ix': 352, 'iy': 1024,
         'solid': True, 'script': 'ship_lounge_return'},
        {'type': 'prop', 'id': 'ship_lounge_spring', 'image': P + 'blue_buff.png',
         'x': 548, 'y': 804, 'w': 32, 'h': 12, 'ix': 544, 'iy': 772,
         'solid': True, 'anim': {'cols': 3, 'fps': 4}, 'script': 'ship_lounge_spring'},
        *[{'type': 'prop', 'id': f'lounge_sofa_{i}', 'image': P + 'sofa.png',
           'x': x + 6, 'y': y + 30, 'w': 88, 'h': 18, 'ix': x, 'iy': y, 'solid': True}
          for i, (x, y) in enumerate(((104, 288), (540, 340), (104, 544), (536, 572), (104, 784)))],
        *[{'type': 'prop', 'id': f'lounge_table_{i}', 'image': P + 'table_low.png',
           'x': x + 4, 'y': y + 20, 'w': 72, 'h': 26, 'ix': x, 'iy': y, 'solid': True}
          for i, (x, y) in enumerate(((108, 350), (544, 400), (108, 604)))],
        *[{'type': 'prop', 'id': f'lounge_plant_{i}', 'image': P + 'plant.png',
           'x': x + 8, 'y': y + 34, 'w': 20, 'h': 14, 'ix': x, 'iy': y, 'solid': True}
          for i, (x, y) in enumerate(((64, 250), (670, 250), (64, 720), (670, 720), (200, 1016), (536, 1016)))],
        *[{'type': 'prop', 'id': f'lounge_conduit_{i}', 'image': P + 'ship_conduit.png',
           'x': x, 'y': 128, 'w': 98, 'h': 24, 'ix': x, 'iy': 20, 'solid': True,
           'anim': {'cols': 3, 'fps': 5}}
          for i, x in enumerate((104, 566))],
        {'type': 'prop', 'id': 'lounge_holo', 'image': P + 'ship_holo_table.png',
         'x': 532, 'y': 980, 'w': 96, 'h': 28, 'ix': 532, 'iy': 936,
         'solid': True, 'anim': {'cols': 3, 'fps': 5}},
        {'type': 'prop', 'id': 'lounge_tv', 'image': P + 'ship_tv.png',
         'x': 80, 'y': 980, 'w': 80, 'h': 24, 'ix': 80, 'iy': 932,
         'solid': True, 'anim': {'cols': 2, 'fps': 6}},
        *[{'type': 'npc', 'id': f'lounge_{id_}', 'sprite': sprite, 'x': x, 'y': y,
           'facing': facing, 'wander': 0, 'script': f'ship_lounge_{id_}',
           **({'visualScale': 2} if id_ == 'youngcle' else {}),
           **({'requires': 'ship_ending_done'} if id_ in ('youngcle', 'junhee', 'yongjun') else {})}
          for id_, sprite, x, y, facing in NPCS],
    ]
    map_data = {
        'id': MAP_ID, 'name': '엄청대박인배 라운지', 'stage': 'ship_ending_done',
        'bgm': 'ship_lounge', 'dim': 0.06, 'rows': [''.join(row) for row in cells],
        'spawns': {'from_control': {'x': 372, 'y': 900, 'facing': 'up'}},
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
