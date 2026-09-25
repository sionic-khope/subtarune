#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_arena.py [--check]
# ──────────────────
"""BUILD332 final-battle chamber: one generated backdrop (assets/source/arena332) over a walkable causeway + pit ring.

The causeway runs up from the bottom edge to the pit's south rim; the ring wings left/right are where the summoned
monsters and the arriving allies stand. Gajaeman floats above the far (north) side of the pit, seen from behind.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_arena'
TOP_PAD: Final = 2400             # 카메라가 위로 한참 올라가는 빈 공간(선반이 어둠으로 사라진다)
COLS, ROWS = 24, 36 + TOP_PAD // 32
FLOOR: Final = '▓'
CAUSEWAY: Final = (9, 15)          # cols 9..14 (x 288..480)
RING_ROWS: Final = (18 + TOP_PAD // 32, 21 + TOP_PAD // 32)   # 원래 rows 18..20 (y 576..672)
ROW_Y: Final = 612 + TOP_PAD       # the line the party stands on (south rim)
PARTY_X: Final = {'youngcle': 244, 'gyeongsub': 308, 'player': 372, 'ppaman': 436, 'junhee': 500}
# (name, image w, image h, final image-left x, final feet y, start offset toward the wall)
LEFT: Final = [('chogath', 116, 112, 20, 628), ('thresh', 84, 92, 96, 606), ('blitzcrank', 104, 100, 40, 672),
               ('ahri', 84, 72, 104, 662), ('teemo', 60, 44, 152, 648)]
RIGHT: Final = [('darius', 92, 90, 0, 628), ('nasus', 92, 96, 0, 606), ('malphite', 123, 118, 0, 672),
                ('fiddlesticks', 88, 94, 0, 662), ('lux', 54, 58, 0, 648)]
ALLIES: Final = [('arena_mario', 'mini_mario', 196, 598, 'left', None), ('arena_bidet', 'warm_bidet', 168, 640, 'left', None),
                 ('arena_park', 'park_guardian_costume', 572, 640, 'right', 2.22), ('arena_ttuulla', 'ttuulla', 548, 598, 'right', 1.79)]


def main() -> None:
    """Write rows, backdrop, anchors, actors and the summon line-up."""
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_arena.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * COLS for _ in range(ROWS)]
    for row in range(RING_ROWS[0], ROWS):
        for col in range(*CAUSEWAY):
            cells[row][col] = FLOOR
    for row in range(*RING_ROWS):
        for col in range(1, COLS - 1):
            cells[row][col] = FLOOR
    entities = [{'type': 'prop', 'id': 'arena_upper', 'image': 'assets/props/arena332_upper.png',
                 'x': 0, 'y': 0, 'w': COLS * 32, 'h': 2, 'solid': False, 'sortY': -3},
                {'type': 'prop', 'id': 'arena_room', 'image': 'assets/props/arena332_room.png',
                 'x': 0, 'y': TOP_PAD, 'w': COLS * 32, 'h': 2, 'solid': False, 'sortY': -3}]
    for name, x in PARTY_X.items():
        entities.append({'type': 'prop', 'id': f'arena_stand_{name}', 'image': 'assets/tiles/castle306_floor.png',
                         'x': x, 'y': ROW_Y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True})
    # 편집노조가 달려와 합류하는 자리(일행 뒷줄, 둑길 위)
    for name, x in (('bidet', 290), ('mario', 330), ('ttuulla', 414), ('park', 454)):
        entities.append({'type': 'prop', 'id': f'arena_join_{name}', 'image': 'assets/tiles/castle306_floor.png',
                         'x': x, 'y': ROW_Y + 52, 'w': 24, 'h': 16, 'solid': False, 'hidden': True})
    # 청소년거인 상체: 결전지 위 어둠 속(카메라가 페이드로 비출 때만 보인다)
    entities.append({'type': 'prop', 'id': 'arena_giant', 'image': 'assets/props/arena332_giant.png',
                     'x': 127, 'y': TOP_PAD - 300, 'w': 515, 'h': 2, 'solid': False, 'hidden': True, 'sortY': -1})
    entities.extend([
        {'type': 'npc', 'id': 'arena_gajaeman', 'sprite': 'gajaeman_shadow', 'x': 360, 'y': 390 + TOP_PAD,
         'facing': 'up', 'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.89},
        {'type': 'npc', 'id': 'arena_youngcle', 'sprite': 'youngcle_hover', 'x': 312, 'y': 1116 + TOP_PAD,
         'facing': 'up', 'solid': False, 'wander': 0},
        {'type': 'npc', 'id': 'arena_junhee', 'sprite': 'junhee', 'x': 432, 'y': 1116 + TOP_PAD,
         'facing': 'up', 'solid': False, 'wander': 0},
    ])
    for actor_id, sprite, x, y, facing, scale in ALLIES:
        entities.append({'type': 'npc', 'id': actor_id, 'sprite': sprite, 'x': x, 'y': y + TOP_PAD, 'facing': facing,
                         'solid': False, 'wander': 0, 'hidden': True, **({'visualScale': scale} if scale else {})})
    summons = []
    for side, group in (('left', LEFT), ('right', RIGHT)):
        for index, (name, w, h, x, feet) in enumerate(group):
            final_x = x if side == 'left' else COLS * 32 - LEFT[index][3] - w
            start_x = final_x - 96 if side == 'left' else final_x + 96
            prop_id = f'arena_mon_{name}'
            entities.append({'type': 'prop', 'id': prop_id, 'image': f'assets/props/arena332_{name}.png',
                             'x': start_x, 'y': feet - h + TOP_PAD, 'solid': False, 'hidden': True})
            summons.append({'id': prop_id, 'side': side, 'x': final_x, 'y': feet - h + TOP_PAD})
    entities.append({'type': 'trigger', 'id': 'arena_back', 'x': CAUSEWAY[0] * 32, 'y': ROWS * 32 - 10, 'w': 192, 'h': 10,
                     'script': 'castle_spire_back'})
    data = {
        'id': MAP_ID, 'name': '가재맨성 결전지', 'stage': 'castle_prophecy_seen',
        'bgm': None, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_arena_intro', 'early': True},
        'preload': ['assets/props/arena332_room.png', 'assets/props/arena332_upper.png', 'assets/props/cathedral323_sword.png', 'assets/props/arena332_cheong.png', 'assets/props/arena332_arm.png', 'assets/props/arena332_giant.png'] + [f'assets/props/arena332_{n}.png' for n, *_ in LEFT + RIGHT],
        'spawns': {'start': {'x': 360, 'y': 1096 + TOP_PAD, 'facing': 'up'},
                   'rim': {'x': 360, 'y': ROW_Y, 'facing': 'up'}},
        # 구덩이 중심·반지름(배경 그림 기준, 원본 1024×1536의 0.75배)
        'meta': {'connected': True, 'arena': {'summons': summons, 'gajaeman': 'arena_gajaeman', 'youngcle': 'arena_youngcle',
                                              'pit': [384, 457 + TOP_PAD, 322, 124], 'topPad': TOP_PAD}},
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
