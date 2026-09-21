#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura11.py [--check]
# ──────────────────
"""벚꽃 숲 11 — 나무 정상(jjajang_sakura11, BUILD283 사용자 브리핑 2026-09-21 “그 다음맵은 나무 정상같은 느낌의 나뭇바닥과 벚꽃들”):
- 절벽에서 떨어져(벚꽃 숲 10 outro) 가운데(landing)에 착지한다. 둥근 나무 널빤지 바닥(타일 '-' sakura_deck) 한 덩이, 그 둘레는 허공(@)과 벚꽃 나무 캐노피(밑동을 바닥 가장자리 바깥에 둬 캐노피가 바닥 가장자리를 두른다), 꽃잎 초당 18.
- 위쪽 길(12~14열) 끝 문 → 벚꽃 숲 12 제단(BUILD284). 브금 sakura, 발소리 없음."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura11'
WIDTH: Final = 26
HEIGHT: Final = 20
TILE: Final = 32
DECK: Final = '-'
CENTER: Final = (13, 10)              # 바닥 가운데 칸
RADII: Final = (8.4, 5.4)             # 둥근 바닥 반지름(가로·세로 칸)
PETALS: Final = {'rate': 18, 'burst': 0, 'burstRate': 18, 'burstSeconds': 0, 'after': 18}
TREES: Final = (
    ('assets/props/jjajang_sakura_1.png', 141, 157, 100),
    ('assets/props/jjajang_sakura_2.png', 135, 159, 30),
    ('assets/props/jjajang_sakura_3.png', 108, 167, 60),
    ('assets/props/jjajang_sakura_4.png', 167, 146, 58),
)
RING: Final = 14                      # 둘레 나무 수(각도 등분)
PATH_COLS: Final = (12, 14)           # 위쪽 길(BUILD284 사용자 “그다음맵 위에 길 뚫어주고”): 바닥 위 끝에서 맵 위 끝까지 → 벚꽃 숲 12(제단)
RING_PAD: Final = (1.6, 1.9)          # 바닥 가장자리에서 밑동까지(가로·세로 칸)


def inside(col: int, row: int) -> bool:
    dx, dy = (col + 0.5 - CENTER[0] - 0.5) / RADII[0], (row + 0.5 - CENTER[1] - 0.5) / RADII[1]
    return dx * dx + dy * dy <= 1.0


def tree(index: int, cx: float, base_y: float) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    ix, iy = round(cx - base_x), round(base_y - height)
    if ix < -width // 2 or iy < -height // 2 or ix + width > WIDTH * TILE + width // 2 or base_y > HEIGHT * TILE + 8:
        return None
    return {'type': 'prop', 'id': f'sakura11_tree_{index + 1}', 'image': file,
            'x': round(cx) - 12, 'y': round(base_y) - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if inside(col, row):
                rows[row][col] = DECK
    for row in range(0, CENTER[1]):                                          # 위쪽 길: 바닥 위 끝 → 맵 위 끝(문)
        for col in range(PATH_COLS[0], PATH_COLS[1] + 1):
            rows[row][col] = DECK
    # 둘레 나무: 바닥 타원 바깥 RING_PAD 칸에 밑동을 두고 각도 등분. 위쪽 나무는 바닥 위 끝 뒤로, 아래·양옆은 캐노피가 바닥 가장자리 앞을 두른다
    trees = []
    for i in range(RING):
        ang = (i + 0.5) * 2 * math.pi / RING
        cx = (CENTER[0] + 0.5 + (RADII[0] + RING_PAD[0]) * math.cos(ang)) * TILE
        base_y = (CENTER[1] + 0.5 + (RADII[1] + RING_PAD[1]) * math.sin(ang)) * TILE + 30
        if base_y < CENTER[1] * TILE and abs(cx - (CENTER[0] + 0.5) * TILE) < (PATH_COLS[1] - PATH_COLS[0] + 3) * TILE / 2:   # 위쪽 길 자리엔 나무 없음
            continue
        t = tree(len(trees), cx, base_y)
        if t:
            trees.append(t)
    door_north = {'type': 'door', 'id': 'sakura11_north_door', 'x': PATH_COLS[0] * TILE, 'y': 0, 'w': (PATH_COLS[1] - PATH_COLS[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura12', 'spawn': 'from_south', 'sfx': False}
    landing = {'x': CENTER[0] * TILE + 4, 'y': CENTER[1] * TILE + 6, 'facing': 'down'}
    assert rows[CENTER[1]][CENTER[0]] == DECK and rows[CENTER[1] + 1][CENTER[0]] == DECK
    for t in trees:
        assert abs(t['x'] + 12 - landing['x'] - 12) > 96 or abs(t['y'] - landing['y']) > 96, '착지 자리 근처에 나무 밑동 없음'
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 11', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'spawns': {'landing': landing, 'start': dict(landing), 'from_north': {'x': CENTER[0] * TILE + 4, 'y': 38, 'facing': 'down'}},
        'meta': {
            'connected': True,
            'route': [[CENTER[0], CENTER[1]], [CENTER[0], 0]],
            'role': '벚꽃 숲 10 절벽 도약 낙하 뒤 착지(BUILD283): 나무 정상 — 둥근 나무 널빤지 바닥, 둘레는 벚꽃 캐노피와 허공. 위쪽 길 끝 문 → 벚꽃 숲 12 제단(BUILD284, 브금 꺼짐). 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'sakura11': {'center': list(CENTER), 'radii': list(RADII), 'landing': [landing['x'], landing['y']], 'ring': RING, 'pathCols': list(PATH_COLS)},
        },
        'entities': [*trees, door_north],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'deck', sum(row.count(DECK) for row in map_data['rows']), 'trees', len(map_data['entities']))


if __name__ == '__main__':
    main()
