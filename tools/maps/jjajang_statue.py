#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_statue.py [--check]
# ──────────────────
"""석상 앞 숲(jjajang_statue, BUILD228 사용자 브리핑 2026-09-19):
"다음 맵은 오른쪽 길 쭉 이어져 있고 가운데에서 살짝만 위로 올라가면 좀 더 넓게 가로로 펼쳐지면서 상단에 뭔가 깊숙한 곳으로 갈 수 있는 곳 같이
그림자 진 입구 같은 느낌인데 앞에 [사진] 이 사진 그대로에서 배경만 제거하고 석상 버전으로 바꾼 거로 앞에 깔려 있어서 막혀 있게 해 줘 좀 거대함. 화면 잘림 잘 고려하고 자연스러움도.
그리고 가운데로 가서 거기에 상호작용하면 (막히기도 해야 함) 브금 꺼지면서 …"
- 검은 소나무 숲(jjajang_pines) 오른쪽 문에서 왼쪽 가장자리(14~15행)로 들어와 오른쪽 끝까지 곧은 길. 오른쪽 끝은 통로만 열림(다음 맵 브리핑 대기 — 청소부 “오른쪽으로 가보는 건 어떻겠나”).
- 가운데(28~29열)에서 위로 세 칸 오르면 가로로 넓은 공터(17~40열 × 7~10행). 공터 위 가운데(27~30열, 1~6행)는 위로 갈수록 검게 잠기는 통로(그림자 오버레이 assets/props/jjajang_passage_shade.png, 해안 숲 입구와 같은 구성).
- 통로 입구를 석상(assets/props/jjajang_statue.png, gpt-image-2.5-sunburst 로 사용자 사진을 회색 석상으로, 160×177 = 요플래의 약 2.7배)이 막는다: 히트박스는 그림 폭(852~1008) × 6행 아래 24px 로 통로(864~992)보다 넓고 양옆은 검은 숲, 그림 밑변 = 히트박스 밑변(224). C 상호작용 → 컷신 jjajang_statue_talk(src/data/cutscenes/jjajang_statue.js).
- 소나무·검은 숲·'$' 에코 발소리·dim 0.08·브금 my_castle_town 이어짐(소나무 숲과 같은 지역 자산)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_statue'
WIDTH: Final = 60
HEIGHT: Final = 20
TILE: Final = 32
ROAD_ROWS: Final = (14, 15)
BRANCH_COLS: Final = (28, 29)
CLEARING: Final = (17, 40, 7, 10)    # col0, col1, row0, row1 (포함)
PASSAGE_COLS: Final = (27, 30)
PASSAGE_ROWS: Final = (1, 6)         # 0행은 맵 감사(윗줄 막힘)대로 검은 숲 — 오버레이가 완전히 검어 보이지 않는다
# assets/source/jjajang-statue-v1/runtime-contract.json (배율 0.18): (파일, 폭, 높이, 밑동 x)
STATUE: Final = ('assets/props/jjajang_statue.png', 160, 177, 78)
STATUE_CENTER_COL: Final = 29        # 밑동 중심 x = 29*32 (통로 27~30열 가운데)
STATUE_BASE_ROW: Final = 7           # 밑변 y = 7*32 = 224 (통로 마지막 행 아래, 공터 첫 행 위)
STATUE_HIT_INSET: Final = 2          # 히트박스 = 그림 폭 안쪽 2px(레이아웃 감사: 히트박스는 그림 x 안) — 통로(864~992)보다 넓어 옆으로 못 돈다
# 그림자 통로 오버레이: 통로 폭 128 + 양옆 16, 높이 336(112 까지 완전히 검고 공터 첫 행(224)에선 옅게)
SHADE: Final = ('assets/props/jjajang_passage_shade.png', 160, 336)
# assets/source/jjajang-pines-v1/runtime-contract.json (배율 0.345): (파일, 폭, 높이, 밑동 x)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
)
# 밑동 칸(열, 행): 길·공터·통로·석상에서 떨어진 검은 숲 칸, 드문드문 (5행 위는 그림이 맵 위로 나가 안 둔다)
PINE_CELLS: Final = (
    (7, 5), (14, 6), (21, 5), (37, 6), (44, 5), (52, 6),
    (11, 8), (13, 10), (45, 8), (50, 10), (56, 9),
    (5, 12), (15, 12), (22, 13), (35, 12), (42, 13), (49, 12), (57, 12),
    (6, 18), (12, 19), (19, 18), (26, 19), (33, 18), (40, 19), (47, 18), (54, 19),
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
    c0, c1, r0, r1 = CLEARING
    path(range(0, WIDTH), range(ROAD_ROWS[0], ROAD_ROWS[1] + 1))                        # 오른쪽으로 쭉
    path(range(BRANCH_COLS[0], BRANCH_COLS[1] + 1), range(r1 + 1, ROAD_ROWS[0]))         # 가운데에서 살짝 위로
    path(range(c0, c1 + 1), range(r0, r1 + 1))                                           # 가로로 넓은 공터
    path(range(PASSAGE_COLS[0], PASSAGE_COLS[1] + 1), range(PASSAGE_ROWS[0], PASSAGE_ROWS[1] + 1))   # 위쪽 그림자 통로(석상이 막는다)
    for row in ROAD_ROWS:
        rows[row][0] = '&'
        rows[row][WIDTH - 1] = '&'
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(PINE_CELLS)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    file, width, height, base_x = STATUE
    base_y = STATUE_BASE_ROW * TILE
    cx = STATUE_CENTER_COL * TILE
    statue = {
        'type': 'prop', 'id': 'jjajang_statue', 'image': file,
        'x': cx - base_x + STATUE_HIT_INSET, 'y': base_y - 24, 'w': width - 2 * STATUE_HIT_INSET, 'h': 24,
        'ix': cx - base_x, 'iy': base_y - height, 'solid': True, 'script': 'jjajang_statue_talk',
        # 그림자 오버레이(sortY 1e9)보다 위에 그려 석상은 밝게, 뒤 통로만 어둡게
        'sortY': 2000000000,
    }
    assert statue['ix'] >= 0 and statue['iy'] >= 0 and statue['ix'] + width <= WIDTH * TILE, '석상 그림이 맵 안'
    assert statue['iy'] + height == statue['y'] + statue['h'], '그림 밑변 = 히트박스 밑변'
    assert statue['x'] <= PASSAGE_COLS[0] * TILE and statue['x'] + statue['w'] >= (PASSAGE_COLS[1] + 1) * TILE, '석상 히트박스가 통로 폭을 다 덮는다'
    shade_file, shade_w, shade_h = SHADE
    passage_shade = {
        'type': 'prop', 'id': 'jjajang_passage_shade', 'image': shade_file,
        'x': PASSAGE_COLS[0] * TILE - 16, 'y': 0, 'w': 0, 'h': 0,
        'ix': PASSAGE_COLS[0] * TILE - 16, 'iy': 0, 'solid': False, 'sortY': 1000000000,
    }
    assert shade_w == (PASSAGE_COLS[1] - PASSAGE_COLS[0] + 1) * TILE + 32
    door_west = {
        'type': 'door', 'id': 'statue_pines_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_pines', 'spawn': 'from_east', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '석상 앞 숲',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_statue': {'x': BRANCH_COLS[0] * TILE + 8, 'y': (r1 - 1) * TILE + 6, 'facing': 'up'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0]], [BRANCH_COLS[0], ROAD_ROWS[0]], [BRANCH_COLS[0], r0], [WIDTH - 2, ROAD_ROWS[0]]],
            # 석상 뒤 통로는 걸어서 닿을 수 없어야 한다(막아야 하는 길 감사)
            'blocked': [[BRANCH_COLS[0], r1 - 1], [BRANCH_COLS[0], 2]],
            'role': '소나무 숲 다음: 왼쪽 입구 → 곧은 길 오른쪽 끝(다음 맵 대기). 가운데 위 공터, 그 위 그림자 통로를 석상이 막는다(C → 청소부 짜장숲 이야기). 브금 my_castle_town 이어짐',
            'clearing': list(CLEARING),
            'passage': [list(PASSAGE_COLS), list(PASSAGE_ROWS)],
            'statue': [STATUE_CENTER_COL, STATUE_BASE_ROW],
        },
        'entities': [*pines, passage_shade, statue, door_west],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_statue.py [--check]')
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'pines', len([e for e in map_data['entities'] if e['id'].startswith('jjajang_pine')]))


if __name__ == '__main__':
    main()
