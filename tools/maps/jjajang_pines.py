#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_pines.py [--check]
# ──────────────────
"""검은 소나무 숲(jjajang_pines, BUILD226 사용자 브리핑 2026-09-18):
"그 다음 맵은 다시 펼쳐지는데 나무 스프라이트 뭔가 검은 색깔 좀 더 큰 나무가 조금씩 존재하는 방식으로 나뭇가지도 역동적이게 생겼고 뭔가 꾸불꾸불한 소나무 느낌으로 배치해 주며
오른쪽으로 갔다가 위로 좀 올라갔다가 왼쪽으로 좀 갔다가 아래로 내려갔다가 가운데쯤 오른쪽으로 쭉 가는 길, 거기 중간에 풀숲하고 적당히 정사각형의 공간 만들어 줘 거기서 몹 이벤트 하나 만들 거라서 일단
그리고 그 뒤에 오른쪽 길도 더 만들어 주고" / "다음 맵도 그 브금(my_castle_town)".
- 짜장 곧은 길(jjajang_walk) 오른쪽 문에서 왼쪽 가장자리(16~17행)로 들어와 오른쪽 → 위(12~13열) → 왼쪽(4~5행) → 아래(4~5열) → 가운데(10~11행)에서 오른쪽 끝까지. 위 다리와 가운데 길은 12~13열에서 교차한다.
- 공터: 34~41열 × 7~14행 정사각형(가운데 길이 관통), 둘레는 풀숲 타일 '"'(걸을 수 있음), 안쪽 6×6 은 비어 있음 — 몹 이벤트 자리(브리핑 대기). 오른쪽 끝은 통로만 열림(다음 맵 대기).
- 소나무: gpt-image-2.5-sunburst 4종을 검은 실루엣 톤으로 후처리(assets/source/jjajang-pines-v1), 기존 짜장 나무보다 크고 드문드문. 히트박스는 밑동 한 칸(24×12)만.
- 시야 오버레이 없음(“다시 펼쳐지는데”), dim 0.08. 발소리는 숲과 같은 '$' 에코."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_pines'
WIDTH: Final = 64
HEIGHT: Final = 22
TILE: Final = 32
ENTRY_ROWS: Final = (16, 17)
UP_COLS: Final = (12, 13)
TOP_ROWS: Final = (4, 5)
DOWN_COLS: Final = (4, 5)
ROAD_ROWS: Final = (10, 11)
PLAZA: Final = (34, 41, 7, 14)   # col0, col1, row0, row1 (포함)
# assets/source/jjajang-pines-v1/runtime-contract.json (배율 0.345): (파일, 폭, 높이, 밑동 x)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
)
# 밑동 칸(열, 행): 길·공터에서 한 칸 이상 떨어진 검은 숲 칸, 드문드문
PINE_CELLS: Final = (
    (17, 5), (24, 6), (31, 5), (45, 5), (54, 6), (60, 5),
    (2, 8), (9, 8), (20, 7), (27, 8), (48, 7), (58, 8),
    (3, 13), (8, 13), (22, 15), (30, 15), (50, 16), (60, 15),
    (6, 20), (16, 20), (28, 20), (40, 19), (56, 20),
)


def pine(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = PINES[index % len(PINES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {
        'type': 'prop', 'id': f'jjajang_pine_{index + 1}', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True,
    }


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def path(cols: range, row_range: range) -> None:
        for row in row_range:
            for col in cols:
                rows[row][col] = '$'
    path(range(0, UP_COLS[1] + 1), range(ENTRY_ROWS[0], ENTRY_ROWS[1] + 1))          # 오른쪽으로
    path(range(UP_COLS[0], UP_COLS[1] + 1), range(TOP_ROWS[0], ENTRY_ROWS[1] + 1))     # 위로
    path(range(DOWN_COLS[0], UP_COLS[1] + 1), range(TOP_ROWS[0], TOP_ROWS[1] + 1))     # 왼쪽으로
    path(range(DOWN_COLS[0], DOWN_COLS[1] + 1), range(TOP_ROWS[0], ROAD_ROWS[1] + 1))  # 아래로
    path(range(DOWN_COLS[0], WIDTH), range(ROAD_ROWS[0], ROAD_ROWS[1] + 1))            # 가운데쯤 오른쪽으로 쭉
    c0, c1, r0, r1 = PLAZA
    for row in range(r0, r1 + 1):
        for col in range(c0, c1 + 1):
            edge = row in (r0, r1) or col in (c0, c1)
            on_road = row in ROAD_ROWS
            rows[row][col] = '$' if (on_road or not edge) else '"'
    for row in ENTRY_ROWS:
        rows[row][0] = '&'
    for row in ROAD_ROWS:
        rows[row][WIDTH - 1] = '&'
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(PINE_CELLS)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    door_west = {
        'type': 'door', 'id': 'pines_walk_door', 'x': 0, 'y': ENTRY_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_walk', 'spawn': 'from_east', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '검은 소나무 숲',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ENTRY_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ENTRY_ROWS[0] * TILE + 6, 'facing': 'right'},
            'plaza': {'x': 37 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ENTRY_ROWS[0]], [UP_COLS[0], TOP_ROWS[0]], [DOWN_COLS[0], ROAD_ROWS[0]], [WIDTH - 2, ROAD_ROWS[0]]],
            'role': '곧은 길 다음: 왼쪽 입구 → 오른쪽 → 위 → 왼쪽 → 아래 → 가운데에서 오른쪽 끝까지. 공터(34~41열×7~14행, 둘레 풀숲)는 몹 이벤트 자리(브리핑 대기). 오른쪽 끝 다음 맵 대기. 브금 my_castle_town 이어짐',
            'plaza': list(PLAZA),
        },
        'entities': [*pines, door_west],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_pines.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json')
    map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'pines', len(map_data['entities']) - 1)


if __name__ == '__main__':
    main()
