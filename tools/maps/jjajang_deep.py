#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_deep.py [--check]
# ──────────────────
"""깊은숲 입구(jjajang_deep, BUILD254 사용자 브리핑 2026-09-20):
"깊은숲 입구는 일단 오브제맵0의 브금을쓴 좀더 다크한 짜장숲느낌의 스프라이트로 만들어서 위로 가는길 하나랑 마법의샘하나만 추가한맵 찍어주샘"
- 석상 앞 숲(jjajang_statue) 통로 위 문에서 아래 가장자리로 들어와 위로 곧게 가는 길 하나(9~10열, 'U' = 짜장 길보다 어두운 바닥, 발소리는 같은 숲 에코).
  윗줄 가운데 문 → 빛 드는 공터(jjajang_glade, BUILD257). 길 오른쪽 작은 나들목(11~12열 × 16~17행) 끝에 마법의샘(마이야르 샘물 소품 blue_buff, C → 전체 회복 jjajang_spring).
- 짜장숲 자산을 어둡게: 검은 숲 '@' 그대로, 소나무는 jjajang_pine_N 을 0.88 밝기로 낮춘 jjajang_pine_dark_N(PIL 후처리; 0.5·0.66·0.8 과 dim 0.1·길 #161918 은 사용자 화면에서 “아무것도 안 보였다” — BUILD255), dim 0.06. 브금은 옵젝영역0 의 'wind'(짜장숲과 같은 곡).
  (2026-09-12 회고: 옛 지역 타일·소품은 쓰지 않는다 — 짜장섬 자산의 어두운 판만)"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_deep'
WIDTH: Final = 20
HEIGHT: Final = 36
TILE: Final = 32
PATH_COLS: Final = (9, 10)
NOOK_COLS: Final = (11, 12)          # 길 오른쪽 마법의샘 나들목
NOOK_ROWS: Final = (16, 17)
SPRING_COL: Final = 12
PATH_CHAR: Final = 'U'
EDGE_CHAR: Final = '^'
# assets/source/jjajang-pines-v1/runtime-contract.json (배율 0.345)과 같은 크기의 어두운 판: (파일, 폭, 높이, 밑동 x)
PINES: Final = (
    ('assets/props/jjajang_pine_dark_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_dark_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_dark_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_dark_4.png', 167, 146, 58),
)


def pine(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = PINES[index % len(PINES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {
        'type': 'prop', 'id': f'jjajang_pine_dark_{index + 1}', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True,
    }


def pine_cells() -> list[tuple[int, int]]:
    cells: list[tuple[int, int]] = []
    for row in range(5, HEIGHT - 1, 3):
        offset = (row // 3) % 2
        for col in (1 + offset, 4 + (1 - offset), 6 + offset, 13 + offset, 15 + (1 - offset), 18 - offset):
            if NOOK_ROWS[0] - 2 <= row <= NOOK_ROWS[1] + 2 and NOOK_COLS[0] - 1 <= col <= NOOK_COLS[1] + 2:
                continue   # 샘 나들목 주변은 비운다
            cells.append((col, row))
    return cells


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in range(1, HEIGHT):
        for col in range(PATH_COLS[0], PATH_COLS[1] + 1):
            rows[row][col] = PATH_CHAR
    for col in range(PATH_COLS[0], PATH_COLS[1] + 1):   # 윗줄 출입구 칸(BUILD257: 위 문 → 빛 드는 공터)
        rows[0][col] = EDGE_CHAR
    for row in range(NOOK_ROWS[0], NOOK_ROWS[1] + 1):
        for col in range(NOOK_COLS[0], NOOK_COLS[1] + 1):
            rows[row][col] = PATH_CHAR
    for col in range(PATH_COLS[0], PATH_COLS[1] + 1):
        rows[HEIGHT - 1][col] = EDGE_CHAR
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(pine_cells())) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    # 마법의샘: 나들목 끝(12열)에 서 있고(막힘) C 로 전체 회복 — 찢칠라 길 2 의 마나샘과 같은 소품·동작
    spring_cx, spring_top, spring_base = SPRING_COL * TILE + 16, NOOK_ROWS[0] * TILE + 6, NOOK_ROWS[1] * TILE + 14
    spring = {'type': 'prop', 'id': 'deep_spring', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4},
              'x': spring_cx - 16, 'y': spring_top, 'w': 32, 'h': spring_base - spring_top, 'ix': spring_cx - 20, 'iy': spring_base - 44, 'solid': True, 'script': 'jjajang_spring'}
    assert rows[(spring['y'] + 6) // TILE][(spring['x'] + 12) // TILE] == PATH_CHAR, '마법의샘은 나들목 위'
    door_south = {
        'type': 'door', 'id': 'deep_statue_door', 'x': PATH_COLS[0] * TILE, 'y': HEIGHT * TILE - 10, 'w': 2 * TILE, 'h': 10,
        'to': 'jjajang_statue', 'spawn': 'from_deep', 'sfx': False,
    }
    door_north = {
        'type': 'door', 'id': 'deep_glade_door', 'x': PATH_COLS[0] * TILE, 'y': 0, 'w': 2 * TILE, 'h': 10,
        'to': 'jjajang_glade', 'spawn': 'from_south', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '깊은숲 입구',
        'stage': 'ship_sinking_done',
        'bgm': 'wind',
        'dim': 0.06,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_south': {'x': PATH_COLS[1] * TILE - 8, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'start': {'x': PATH_COLS[1] * TILE - 8, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'spring': {'x': NOOK_COLS[0] * TILE + 4, 'y': NOOK_ROWS[0] * TILE + 10, 'facing': 'right'},
            'from_north': {'x': PATH_COLS[1] * TILE - 8, 'y': 1 * TILE + 16, 'facing': 'down'},
        },
        'meta': {
            'connected': True,
            'route': [[PATH_COLS[1], HEIGHT - 3], [PATH_COLS[1], 1]],
            'role': '석상 앞 숲 통로 위 문 다음(BUILD254): 어두운 짜장숲, 위로 가는 길 하나(위 문 → 빛 드는 공터 jjajang_glade, BUILD257)와 오른쪽 나들목의 마법의샘. 브금 wind',
            'spring': [SPRING_COL, NOOK_ROWS[0]],
        },
        'entities': [*pines, spring, door_south, door_north],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'pines', len([e for e in map_data['entities'] if e['id'].startswith('jjajang_pine')]))


if __name__ == '__main__':
    main()
