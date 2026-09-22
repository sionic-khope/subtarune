#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura8.py [--check]
# ──────────────────
"""벚꽃 숲 8 — 갈림길(jjajang_sakura8, BUILD282 사용자 브리핑 2026-09-21 — 원문 design/narrative/cutscenes/jjajang_sakura8.md):
"맵 하나 더 만들건데 쭉 가는길 하나있고 오른쪽으로 가는길, 위로가는길 두갈래로 나뉘어져있어. 오른쪽으로 3초정도 지나면 그 갈림길 나오고 갈림길에서 연출시작"
- 벚꽃 숲 7 오른쪽 끝 문에서 서쪽 가장자리(14~17행 길)로 들어와 오른쪽 22칸(달리기 ≈ 3초) → 갈림목(22~25열): 윗길(22~25열 × 0~13행 → 윗줄 문 → 벚꽃 숲 9 파란 토리이 달리기)과 오른쪽 길(26~39열 → 동쪽 끝, 다음 맵 없음).
- 갈림목 앞 트리거(20~21열, 길 세로 전체) → 연출 `jjajang_sakura8_split`: 경섭이 혼자 오른쪽으로 떠나고(동료 이탈) 억빠맨은 동료에서 빠져 오른쪽 길 앞(28열)을 막고 선다 → 요플래 혼자.
- 오른쪽 길 트리거(26~27열, unless sakura8_right_open) → `jjajang_sakura8_no_right`: 억빠맨 “윗길로 가보시는게 어때요?” + 한 칸 되돌림.
- NPC: gyeongsub_npc(연출용 경섭 사본, 숨김, unless sakura8_split_done), ppaman_npc(연출용 억빠맨 사본, 숨김, unless sakura8_split_done), ppaman_guard(재입장용 가드, requires sakura8_split_done, 28열에서 왼쪽을 봄).
- 땅은 분홍 꽃잎 땅 ')', 벚꽃 나무, 꽃잎 초당 18, 브금 sakura, 발소리 없음, 전투 배경 sakura."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura8'
WIDTH: Final = 40
HEIGHT: Final = 22
TILE: Final = 32
GROUND: Final = ')'
ROAD_ROWS: Final = (14, 17)           # 가로 길
ENTRY_COLS: Final = (0, 21)           # 서쪽 가장자리 → 갈림목(22칸 ≈ 달리기 3초)
JUNCTION_COLS: Final = (22, 25)       # 갈림목 = 윗길 폭
UP_ROWS: Final = (0, 13)              # 윗길 → 윗줄 문
RIGHT_COLS: Final = (26, WIDTH - 1)   # 오른쪽 길 → 동쪽 끝(다음 맵 없음)
SCENE_COLS: Final = (20, 21)          # 갈림목 앞 연출 트리거
BLOCK_COLS: Final = (26, 27)          # 오른쪽 길 막기 트리거
GUARD_COL: Final = 28                 # 억빠맨 가드 자리(오른쪽 길 바로 앞)
SPLIT_FLAG: Final = 'sakura8_split_done'
RIGHT_OPEN_FLAG: Final = 'sakura8_right_open'
TREES: Final = (
    ('assets/props/jjajang_sakura_1.png', 141, 157, 100),
    ('assets/props/jjajang_sakura_2.png', 135, 159, 30),
    ('assets/props/jjajang_sakura_3.png', 108, 167, 60),
    ('assets/props/jjajang_sakura_4.png', 167, 146, 58),
)
PETALS: Final = {'rate': 18, 'burst': 0, 'burstRate': 18, 'burstSeconds': 0, 'after': 18}


def tree(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {'type': 'prop', 'id': f'sakura8_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int, ch: str = GROUND) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = ch
    fill(ENTRY_COLS[0], ENTRY_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1])           # 서쪽 길
    fill(JUNCTION_COLS[0], JUNCTION_COLS[1], UP_ROWS[0], ROAD_ROWS[1])       # 갈림목 + 윗길(윗줄까지)
    fill(RIGHT_COLS[0], RIGHT_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1])           # 오른쪽 길
    road_y = (ROAD_ROWS[0] + 1) * TILE + 6
    junction_x = (JUNCTION_COLS[0] + 1) * TILE + 4
    guard = {'x': GUARD_COL * TILE + 4, 'y': road_y}
    actors = [
        {'type': 'npc', 'id': 'gyeongsub_npc', 'sprite': 'gyeongsub', 'x': junction_x, 'y': road_y, 'w': 24, 'h': 16, 'solid': False, 'facing': 'right', 'wander': 0, 'hidden': True, 'unless': SPLIT_FLAG},
        {'type': 'npc', 'id': 'ppaman_npc', 'sprite': 'ppaman', 'x': junction_x, 'y': road_y, 'w': 24, 'h': 16, 'solid': False, 'facing': 'right', 'wander': 0, 'hidden': True, 'unless': SPLIT_FLAG},
        {'type': 'npc', 'id': 'ppaman_guard', 'sprite': 'ppaman', 'x': guard['x'], 'y': guard['y'], 'w': 24, 'h': 16, 'solid': True, 'facing': 'left', 'wander': 0, 'requires': SPLIT_FLAG, 'unless': RIGHT_OPEN_FLAG},
        {'type': 'npc', 'id': 'ppaman_aside', 'sprite': 'ppaman', 'x': guard['x'], 'y': ROAD_ROWS[1] * TILE - 2, 'w': 24, 'h': 16, 'solid': True, 'facing': 'up', 'wander': 0, 'requires': RIGHT_OPEN_FLAG},
    ]
    assert rows[(guard['y'] + 8) // TILE][(guard['x'] + 12) // TILE] == GROUND and guard['x'] >= (BLOCK_COLS[1] + 1) * TILE, '가드는 막기 트리거 오른쪽 길 위'
    cells: list[tuple[int, int]] = []
    for col in range(1, WIDTH - 1, 3):                                       # 가로 길 위아래(갈림목 폭은 비운다)
        offset = (col // 3) % 2
        if not (JUNCTION_COLS[0] - 1 <= col <= JUNCTION_COLS[1] + 1):
            cells.append((col, ROAD_ROWS[0] - 3 + offset))
        cells.append((col, ROAD_ROWS[1] + 3 - offset))
    for row in range(UP_ROWS[0] + 3, ROAD_ROWS[0] - 2, 3):                    # 윗길 양옆
        offset = (row // 3) % 2
        cells += [(JUNCTION_COLS[0] - 2 - offset, row), (JUNCTION_COLS[1] + 2 + offset, row)]
    for col in range(2, WIDTH - 1, 5):                                        # 위·아래 빈 숲
        if not (JUNCTION_COLS[0] - 3 <= col <= JUNCTION_COLS[1] + 3):
            cells.append((col, 5 + (col // 5) % 2))
        cells.append((col + 2, HEIGHT - 2))
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or not (0 <= col < WIDTH and 0 <= row < HEIGHT) or rows[row][col] != '@':
            continue
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    scene = {'type': 'trigger', 'id': 'sakura8_split_trigger', 'x': SCENE_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': (SCENE_COLS[1] - SCENE_COLS[0] + 1) * TILE, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE,
             'once': True, 'flag': 'sakura8_split_started', 'unless': SPLIT_FLAG, 'script': 'jjajang_sakura8_split'}
    block = {'type': 'trigger', 'id': 'sakura8_block_trigger', 'x': BLOCK_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': (BLOCK_COLS[1] - BLOCK_COLS[0] + 1) * TILE, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE,
             'unless': RIGHT_OPEN_FLAG, 'script': 'jjajang_sakura8_no_right'}
    door_west = {'type': 'door', 'id': 'sakura8_west_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE, 'to': 'jjajang_sakura7', 'spawn': 'from_east', 'sfx': False}
    door_up = {'type': 'door', 'id': 'sakura8_up_door', 'x': JUNCTION_COLS[0] * TILE, 'y': 0, 'w': (JUNCTION_COLS[1] - JUNCTION_COLS[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura9', 'spawn': 'from_south', 'sfx': False}
    door_east = {'type': 'door', 'id': 'sakura8_east_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE,
                 'to': 'jjajang_night_cliff', 'spawn': 'from_west', 'requires': RIGHT_OPEN_FLAG, 'lockedScript': 'jjajang_sakura8_no_right', 'sfx': False}
    chase_anchors = [
        {'type': 'prop', 'id': name, 'image': TREES[0][0], 'x': x, 'y': 486,
         'w': 24, 'h': 16, 'solid': False, 'hidden': True}
        for name, x in (('chase_start', 1220), ('chase_end', 500))
    ]
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 8', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'chase': {'x': 1220, 'y': 486, 'facing': 'left'},
            'from_west': {'x': TILE + 4, 'y': road_y, 'facing': 'right'},
            'start': {'x': TILE + 4, 'y': road_y, 'facing': 'right'},
            'fork': {'x': (SCENE_COLS[0] - 2) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'after': {'x': junction_x, 'y': road_y, 'facing': 'up'},
            'from_north': {'x': junction_x, 'y': TILE + 6, 'facing': 'down'},
            'from_east': {'x': (WIDTH - 2) * TILE + 4, 'y': road_y, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0] + 1], [SCENE_COLS[0] - 2, ROAD_ROWS[0] + 1]],
            'role': '벚꽃 숲 7 오른쪽 끝 문 다음(BUILD282): 오른쪽 3초 → 갈림목(윗길·오른쪽 길). 갈림목 연출: 경섭 혼자 오른쪽으로 떠남, 억빠맨은 오른쪽 길 앞 가드(“윗길로 가보시는게 어때요?”) → 요플래 혼자 윗길 → 벚꽃 숲 9. 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'sakura8': {'roadRows': list(ROAD_ROWS), 'entryCols': list(ENTRY_COLS), 'junctionCols': list(JUNCTION_COLS), 'upRows': list(UP_ROWS), 'rightCols': list(RIGHT_COLS), 'sceneCols': list(SCENE_COLS), 'blockCols': list(BLOCK_COLS),
                        'roadY': road_y, 'junctionX': junction_x, 'guard': [guard['x'], guard['y']]},
        },
        'entities': [*trees, *actors, *chase_anchors, scene, block, door_west, door_up, door_east],
    }


def main() -> None:
    if '--help' in sys.argv:
        print(f'Usage: /usr/bin/python3 tools/maps/{MAP_ID}.py [--check]'); return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr); raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json'); index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8')); map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data; registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT'); raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID); index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura8_tree')]))


if __name__ == '__main__':
    main()
