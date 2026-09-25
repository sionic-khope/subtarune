#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_arena.py [--check]
# ──────────────────
"""BUILD332/333 final-battle chamber: one generated backdrop (assets/source/arena332) over walkable stone.

BUILD333 (사용자 “너무 붙어있음… 왼쪽 오른쪽 공간을 넓혀서 카메라이동으로 커버”): the room is the widened art
(1152×768). The causeway runs up to the pit's south rim; wide terraces on the far left/right hold the summoned
monsters and the arriving allies, well apart from the party. 2400px of darkness above lets the camera climb.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_arena'
TOP_PAD: Final = 2400
W, H = 1152, 768
COLS, ROWS = W // 32, (H + TOP_PAD) // 32
FLOOR: Final = '▓'
# 걷는 곳(배경 그림 기준 px): 둑길, 구덩이 앞 테두리, 왼쪽·오른쪽 테라스, 테라스와 테두리 연결
WALK: Final = [(480, 440, 142, 328), (320, 396, 480, 56), (8, 216, 322, 146), (822, 216, 322, 146),
               (296, 352, 96, 60), (760, 352, 96, 60), (780, 352, W - 780, 100)]
ROW_Y: Final = 420 + TOP_PAD
PARTY_X: Final = {'youngcle': 371, 'gyeongsub': 457, 'player': 543, 'ppaman': 629, 'junhee': 715}
PIT: Final = [555, 307 + TOP_PAD, 217, 90]
# (name, image w, image h, image-left x on the left terrace, feet y) — mirrored for the right side
LEFT: Final = [('chogath', 116, 112, 20, 300), ('thresh', 84, 92, 150, 262), ('blitzcrank', 104, 100, 60, 356),
               ('ahri', 84, 72, 188, 340), ('teemo', 60, 44, 258, 354)]
RIGHT_NAMES: Final = [('darius', 92, 90), ('nasus', 92, 96), ('malphite', 123, 118), ('fiddlesticks', 88, 94), ('lux', 54, 58)]
ALLIES: Final = [('arena_mario', 'mini_mario', 284, 352, 'left', None), ('arena_bidet', 'warm_bidet', 312, 396, 'left', None),
                 ('arena_park', 'park_guardian_costume', 814, 396, 'right', 2.22), ('arena_ttuulla', 'ttuulla', 844, 352, 'right', 1.79)]
JOIN: Final = {'bidet': 486, 'mario': 522, 'ttuulla': 562, 'park': 598}
# 오른쪽으로 튈 때 땅을 따라가는 길목: 테두리 오른쪽 끝 → 테라스로 올라가 → 오른쪽 끝
ESCAPE: Final = [('arena_escape_1', 776, ROW_Y), ('arena_escape_2', 800, 300 + TOP_PAD), ('arena_escape_3', 1110, 300 + TOP_PAD)]
# 비데·마리오가 영클 쪽(왼쪽)으로 달려가는 길목
RUSH: Final = [('arena_rush_1', 360, ROW_Y), ('arena_rush_2', 330, 300 + TOP_PAD)]


def anchor(name: str, x: int, y: int) -> dict:
    return {'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
            'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True}


def main() -> None:
    """Write rows, backdrop, anchors, actors and the summon line-up."""
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_arena.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * COLS for _ in range(ROWS)]
    for x, y, w, h in WALK:
        for row in range((y + TOP_PAD) // 32, (y + TOP_PAD + h + 31) // 32):
            for col in range(x // 32, min(COLS, (x + w + 31) // 32)):
                if 0 <= row < ROWS:
                    cells[row][col] = FLOOR
    entities = [{'type': 'prop', 'id': 'arena_upper', 'image': 'assets/props/arena332_upper.png',
                 'x': 0, 'y': 0, 'w': W, 'h': 2, 'solid': False, 'sortY': -3},
                {'type': 'prop', 'id': 'arena_room', 'image': 'assets/props/arena332_room.png',
                 'x': 0, 'y': TOP_PAD, 'w': W, 'h': 2, 'solid': False, 'sortY': -3}]
    for name, x in PARTY_X.items():
        entities.append(anchor(f'arena_stand_{name}', x, ROW_Y))
    for name, x in JOIN.items():
        entities.append(anchor(f'arena_join_{name}', x, ROW_Y + 60))
    for name, x, y in ESCAPE + RUSH:
        entities.append(anchor(name, x, y))
    entities.extend([
        {'type': 'npc', 'id': 'arena_gajaeman', 'sprite': 'gajaeman_shadow', 'x': 543, 'y': 240 + TOP_PAD,
         'facing': 'up', 'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.89},
        {'type': 'npc', 'id': 'arena_youngcle', 'sprite': 'youngcle_hover', 'x': 510, 'y': 730 + TOP_PAD,
         'facing': 'up', 'solid': False, 'wander': 0},
        {'type': 'npc', 'id': 'arena_junhee', 'sprite': 'junhee', 'x': 580, 'y': 730 + TOP_PAD,
         'facing': 'up', 'solid': False, 'wander': 0},
    ])
    for actor_id, sprite, x, y, facing, scale in ALLIES:
        entities.append({'type': 'npc', 'id': actor_id, 'sprite': sprite, 'x': x, 'y': y + TOP_PAD, 'facing': facing,
                         'solid': False, 'wander': 0, 'hidden': True, **({'visualScale': scale} if scale else {})})
    summons = []
    for index, (name, w, h, x, feet) in enumerate(LEFT):
        for side, (n, ww, hh) in (('left', (name, w, h)), ('right', RIGHT_NAMES[index])):
            final_x = x if side == 'left' else W - x - ww
            start_x = final_x - 110 if side == 'left' else final_x + 110
            prop_id = f'arena_mon_{n}'
            entities.append({'type': 'prop', 'id': prop_id, 'image': f'assets/props/arena332_{n}.png',
                             'x': start_x, 'y': feet - hh + TOP_PAD, 'solid': False, 'hidden': True})
            summons.append({'id': prop_id, 'side': side, 'x': final_x, 'y': feet - hh + TOP_PAD})
    # BUILD334: 오른쪽 테라스 끝으로 가면 무너지는 계단으로
    # 화면 끝(맵 오른쪽 끝)에 닿으면 바로 넘어간다: 테두리에서 오른쪽으로 계속 걸어도 끝까지 이어지고, 문은 그 높이 전체(사용자 “화면 밖으로 가면 바로 이동”)
    entities.append({'type': 'door', 'id': 'arena_to_stairs', 'x': W - 12, 'y': 216 + TOP_PAD, 'w': 12, 'h': 236,
                     'to': 'gajaeman_castle_stairs', 'spawn': 'start', 'interact': False, 'sfx': False})
    entities.append({'type': 'trigger', 'id': 'arena_back', 'x': 480, 'y': ROWS * 32 - 10, 'w': 142, 'h': 10,
                     'script': 'castle_spire_back'})
    data = {
        'id': MAP_ID, 'name': '가재맨성 결전지', 'stage': 'castle_prophecy_seen',
        'bgm': None, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_arena_intro', 'early': True},
        'preload': ['assets/props/arena332_room.png', 'assets/props/arena332_upper.png', 'assets/props/cathedral323_sword.png',
                    'assets/props/arena332_cheong_orb.png', 'assets/props/arena332_arm.png', 'assets/props/arena332_giant.png']
        + [f'assets/props/arena332_{n}.png' for n, *_ in LEFT + RIGHT_NAMES],
        'spawns': {'start': {'x': 540, 'y': 700 + TOP_PAD, 'facing': 'up'},
                   'rim': {'x': 540, 'y': ROW_Y, 'facing': 'up'}},
        'meta': {'connected': True, 'arena': {'summons': summons, 'gajaeman': 'arena_gajaeman', 'youngcle': 'arena_youngcle',
                                              'pit': PIT, 'topPad': TOP_PAD,
                                              'giant': {'x': 555, 'bottom': TOP_PAD + 120, 'image': 'assets/props/arena332_giant.png'}}},
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
