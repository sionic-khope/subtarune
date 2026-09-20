#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura.py [--check]
# ──────────────────
"""벚꽃 숲(jjajang_sakura, BUILD261 사용자 브리핑 2026-09-20 — 원문 design/narrative/cutscenes/jjajang_sakura.md):
"검은색 풀숲의 땅 타일을 만들어서 좀 구분되게 해주다가 (브금 MzEHcwoNlbE) 분홍색 벚꽃이 조금씩 날리는 맵임. 그러다가 위로 쭉 걷다가 8초정도 지나게 걷다보면
 좀 넓은 풀숲도 나오고 분홍 꽃잎이 맵 전체에 아주많이 깔리면서 그때부터 땅이 분홍색 꽃들로 다 바뀌는 맵 연출 (맵 자체가 조건부로 변하는 느낌, 배경 검은색 짜장은 비슷)
 그 화면 나온뒤에 살짝 더 올라가서 오른쪽으로 꺾어서 좀 걸어가게 / 근처 나무들도 분홍색으로 벚꽃이 전체를 덮으며 다 바뀌고 그 뒤에도 작은 벚꽃들은 계속 떨어짐 / 벚꽃맵부터는 발소리 안나게"
- 빛 드는 공터(jjajang_glade) 위 문에서 아래 가장자리로 들어와 13~16열 곧은 길(검은 풀숲 땅 '(' — 발소리 없음)을 위로 28행(X 천천히 걷기 ≈ 7초, 기본 달리기 ≈ 4초) → 20~35행의 넓은 풀숲(5~24열) → 다시 13~16열 길 → 8~11행에서 오른쪽으로 꺾어 28열까지.
- 넓은 풀숲 초입(34~35행) 트리거 한 번 → jjajang_sakura_bloom: 플래그 sakura_bloom, 꽃잎 폭발, 트리거 행에서부터 tileSwaps.sakura_bloom('(' → ')' 분홍 꽃잎 땅)과 소나무(jjajang_pine_dark_N → jjajang_sakura_N, 같은 크기) 그림이 번진다(멈춤 없음).
- 짜장 검은 숲 '@' 그대로, 소나무는 깊은숲과 같은 어두운 판. 브금 'sakura'(델타룬 5장 Garden of Hopes and Dreams), dim 0(꽃잎·분홍이 살아야 한다)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura'
WIDTH: Final = 30
HEIGHT: Final = 64
TILE: Final = 32
GROUND: Final = '('                   # 검은 풀숲 땅(발소리 없음)
BLOOM: Final = ')'                    # 분홍 꽃잎 땅(번진 뒤)
PATH_COLS: Final = (13, 16)           # 아래 입구 길·위쪽 길
ENTRY_ROWS: Final = (36, 63)          # 아래 곧은 길(28행: X 천천히 걷기 ≈ 7초, 기본 달리기 ≈ 4초)
MEADOW_COLS: Final = (5, 24)          # 넓은 풀숲
MEADOW_ROWS: Final = (20, 35)
UPPER_ROWS: Final = (8, 19)           # 풀숲 위 곧은 길
TURN_ROWS: Final = (8, 11)            # 오른쪽으로 꺾는 길
TURN_END_COL: Final = 28
TRIGGER_ROWS: Final = (34, 35)        # 넓은 풀숲 초입(여기 밟으면 벚꽃이 번진다)
BLOOM_FLAG: Final = 'sakura_bloom'
# assets/source/jjajang-pines-v1/runtime-contract.json (배율 0.345)과 같은 크기: (어두운 판, 벚꽃 판, 폭, 높이, 밑동 x) — 벚꽃 판은 assets/source/jjajang-sakura-v1/export.py 가 같은 bbox 로 잘라 크기가 같다
TREES: Final = (
    ('assets/props/jjajang_pine_dark_1.png', 'assets/props/jjajang_sakura_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_dark_2.png', 'assets/props/jjajang_sakura_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_dark_3.png', 'assets/props/jjajang_sakura_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_dark_4.png', 'assets/props/jjajang_sakura_4.png', 167, 146, 58),
)
PETALS: Final = {'rate': 3, 'burst': 220, 'burstRate': 70, 'burstSeconds': 2.5, 'after': 18}   # 초당 꽃잎: 처음 조금씩 → 번질 때 한꺼번에 220 + 초당 70 을 2.5초 → 그 뒤 계속 18
SPREAD_SPEED: Final = 9               # 번짐 속도(행/초)


def tree(index: int, col: int, row: int) -> dict[str, object] | None:
    dark, bloom, width, height, base_x = TREES[index % len(TREES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {
        'type': 'prop', 'id': f'sakura_tree_{index + 1}', 'image': dark, 'bloom': bloom,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True,
    }


def tree_cells() -> list[tuple[int, int]]:
    """길·풀숲 가장자리를 따라 소나무: 아래 길 양옆(11·18열 어긋나게), 풀숲 둘레(3·26열, 17~18행), 위 길·오른쪽 길 위아래"""
    cells: list[tuple[int, int]] = []
    for row in range(ENTRY_ROWS[0] + 1, ENTRY_ROWS[1] - 1, 3):          # 아래 길 양옆
        offset = (row // 3) % 2
        cells += [(10 + offset, row), (19 - offset, row), (6 + offset, row + 1), (23 - offset, row + 1)]
    for row in range(MEADOW_ROWS[0] - 1, MEADOW_ROWS[1] + 2, 3):        # 풀숲 양옆(바깥)
        offset = (row // 3) % 2
        cells += [(2 + offset, row), (27 - offset, row)]
    for col in range(MEADOW_COLS[0] + 1, MEADOW_COLS[1], 4):             # 풀숲 위 가장자리(17~18행)와 아래 가장자리(37행 바깥 쪽)
        if not PATH_COLS[0] - 1 <= col <= PATH_COLS[1] + 1:
            cells += [(col, MEADOW_ROWS[0] - 2 - (col // 4) % 2), (col, MEADOW_ROWS[1] + 2 + (col // 4) % 2)]
    for row in range(UPPER_ROWS[0] + 5, UPPER_ROWS[1], 3):               # 위 길 양옆(꺾이는 곳 아래)
        offset = (row // 3) % 2
        cells += [(10 + offset, row), (19 - offset, row)]
    for col in range(PATH_COLS[0] + 2, TURN_END_COL + 1, 3):             # 오른쪽 길 위(5~6행)·아래(13~14행, 위 길 13~16열은 비운다)
        offset = (col // 3) % 2
        cells.append((col, TURN_ROWS[0] - 3 + offset))
        if not PATH_COLS[0] - 1 <= col <= PATH_COLS[1] + 1:
            cells.append((col, TURN_ROWS[1] + 3 - offset))
    for col in range(1, PATH_COLS[0] - 1, 3):                            # 꺾이는 곳 왼쪽(위 길 위쪽 빈 숲)
        cells.append((col, 4 + (col // 3) % 2))
    unique: list[tuple[int, int]] = []
    for cell in cells:                                                   # 같은 칸에 두 번 잡히면 하나만(풀숲 아래 가장자리와 아래 길 양옆이 겹친다)
        if cell not in unique:
            unique.append(cell)
    return unique


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = GROUND
    fill(PATH_COLS[0], PATH_COLS[1], ENTRY_ROWS[0], ENTRY_ROWS[1])
    fill(MEADOW_COLS[0], MEADOW_COLS[1], MEADOW_ROWS[0], MEADOW_ROWS[1])
    fill(PATH_COLS[0], PATH_COLS[1], UPPER_ROWS[0], UPPER_ROWS[1])
    fill(PATH_COLS[0], TURN_END_COL, TURN_ROWS[0], TURN_ROWS[1])
    trees = [t for t in (tree(i, col, row) for i, (col, row) in enumerate(tree_cells())) if t]
    seen: set[tuple[int, int]] = set()
    for t in trees:
        col, row = (t['x'] + 12) // TILE, (t['y'] + 6) // TILE
        assert rows[row][col] == '@', f'나무 밑동이 길·풀숲 위: {col},{row}'
        assert (col, row) not in seen, f'나무 겹침 {col},{row}'
        seen.add((col, row))
    swaps = {str(r): ''.join(row).replace(GROUND, BLOOM) for r, row in enumerate(rows) if GROUND in row}
    trigger = {'type': 'trigger', 'id': 'sakura_bloom_trigger', 'x': PATH_COLS[0] * TILE, 'y': TRIGGER_ROWS[0] * TILE,
               'w': (PATH_COLS[1] - PATH_COLS[0] + 1) * TILE, 'h': (TRIGGER_ROWS[1] - TRIGGER_ROWS[0] + 1) * TILE,
               'once': True, 'flag': 'sakura_bloom_started', 'unless': BLOOM_FLAG, 'script': 'jjajang_sakura_bloom'}
    door_south = {'type': 'door', 'id': 'sakura_glade_door', 'x': PATH_COLS[0] * TILE, 'y': HEIGHT * TILE - 10, 'w': (PATH_COLS[1] - PATH_COLS[0] + 1) * TILE, 'h': 10,
                  'to': 'jjajang_glade', 'spawn': 'from_north', 'sfx': False}
    mid_x = (PATH_COLS[0] + PATH_COLS[1] + 1) * TILE // 2 - 12
    return {
        'id': MAP_ID,
        'name': '벚꽃 숲',
        'stage': 'ship_sinking_done',
        'bgm': 'sakura',
        'dim': 0,
        'rows': [''.join(row) for row in rows],
        'tileSwaps': {BLOOM_FLAG: {'rows': swaps}},
        'preload': [t[1] for t in TREES],
        'spawns': {
            'from_south': {'x': mid_x, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'start': {'x': mid_x, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'before_bloom': {'x': mid_x, 'y': (TRIGGER_ROWS[1] + 3) * TILE + 6, 'facing': 'up'},
            'meadow': {'x': mid_x, 'y': (MEADOW_ROWS[0] + 8) * TILE + 6, 'facing': 'up'},
            'east_end': {'x': (TURN_END_COL - 2) * TILE + 4, 'y': (TURN_ROWS[0] + 1) * TILE + 6, 'facing': 'right'},
        },
        'meta': {
            'connected': True,
            'route': [[PATH_COLS[0] + 1, HEIGHT - 3], [PATH_COLS[0] + 1, MEADOW_ROWS[0]], [PATH_COLS[0] + 1, TURN_ROWS[0] + 1], [TURN_END_COL - 1, TURN_ROWS[0] + 1]],
            'role': '빛 드는 공터 위 문 다음(BUILD261): 검은 풀숲 땅 길을 위로 8초쯤 → 넓은 풀숲 초입에서 벚꽃이 번지며 땅·나무가 분홍으로 → 위로 조금 더 → 오른쪽으로 꺾어 걷는다. 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'bloom': {'flag': BLOOM_FLAG, 'tiles': BLOOM_FLAG, 'speed': SPREAD_SPEED},
            'sakura': {'entryRows': list(ENTRY_ROWS), 'meadow': [list(MEADOW_COLS), list(MEADOW_ROWS)], 'trigger': list(TRIGGER_ROWS), 'turn': [list(TURN_ROWS), TURN_END_COL], 'pathCols': list(PATH_COLS)},
        },
        'entities': [*trees, trigger, door_south],
    }


def main() -> None:
    if '--help' in sys.argv:
        print(f'Usage: /usr/bin/python3 tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura_tree')]))


if __name__ == '__main__':
    main()
