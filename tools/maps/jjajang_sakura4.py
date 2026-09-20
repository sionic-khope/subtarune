#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura4.py [--check]
# ──────────────────
"""벚꽃 숲 4(jjajang_sakura4, BUILD266 사용자 브리핑 2026-09-20 — 원문 design/narrative/cutscenes/jjajang_sakura4.md):
"다오랑 배찌라는 몬스터를 그다음맵 알맞게 적당히 길게 찍어주고 몹 두개 추가해줘 … 두마리 다음맵에 각각 다른곳에 배치해줘"
- 벚꽃 숲 3 아래 물가 뭍의 문에서 윗줄로 들어와(16~19열) 아래로 → 오른쪽 → 아래 → 왼쪽 → 아래 → 오른쪽 → 아래(지그재그로 적당히 길게, 걷기 약 40초) → 아랫줄(다음 맵은 아직 없음).
- 다오는 첫 오른쪽 길(15행)에서, 배찌는 왼쪽 길(35행)에서 걸어 다니며 닿으면 표준 조우(체력 36, 카트라이더 아이템 패턴). 이기면 영구 제거.
- 땅은 분홍 꽃잎 땅 ')', 벚꽃 나무, 꽃잎 초당 18, 브금 sakura 유지, 발소리 없음, 전투 배경 sakura."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura4'
WIDTH: Final = 36
HEIGHT: Final = 70
TILE: Final = 32
GROUND: Final = ')'
ENTRY_COLS: Final = (16, 19)          # 윗줄 입구(벚꽃 숲 3 아래 문에서)
LEGS: Final = (                       # (열0, 열1, 행0, 행1) 순서대로 이어지는 길
    (16, 19, 0, 17),                  # 아래로
    (16, 30, 14, 17),                 # 오른쪽으로(다오)
    (27, 30, 14, 37),                 # 아래로
    (5, 30, 34, 37),                  # 왼쪽으로(배찌)
    (5, 8, 34, 55),                   # 아래로
    (5, 30, 52, 55),                  # 오른쪽으로
    (27, 30, 52, 69),                 # 아래로 아랫줄까지
)
DAO_CELL: Final = (24, 15)
BAZZI_CELL: Final = (14, 35)
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
    return {'type': 'prop', 'id': f'sakura4_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for c0, c1, r0, r1 in LEGS:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = GROUND
    cells: list[tuple[int, int]] = []
    for row in range(1, HEIGHT - 1, 3):                                   # 길 바깥에 어긋난 격자로 나무
        offset = (row // 3) % 2
        for col in range(1 + offset, WIDTH - 1, 5):
            cells.append((col, row))
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or rows[row][col] != '@':
            continue
        if any(c0 - 1 <= col <= c1 + 1 and r0 - 1 <= row <= r1 + 1 for c0, c1, r0, r1 in LEGS):
            pass                                                          # 길에 붙은 칸도 허용(밑동만 숲이면 된다)
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    def enemy(eid: str, sprite: str, cell: tuple[int, int]) -> dict[str, object]:
        col, row = cell
        assert rows[row][col] == GROUND, f'{eid} 는 길 위'
        return {'type': 'enemy', 'id': eid, 'sprite': sprite, 'x': col * TILE + 4, 'y': row * TILE + 8, 'facing': 'left', 'wander': 40,
                'enemies': [sprite], 'unless': f'{MAP_ID}_{eid}_defeated'}
    dao, bazzi = enemy('dao', 'dao', DAO_CELL), enemy('bazzi', 'bazzi', BAZZI_CELL)
    assert abs(DAO_CELL[1] - BAZZI_CELL[1]) >= 10, '둘은 다른 곳에'
    door_north = {'type': 'door', 'id': 'sakura4_north_door', 'x': ENTRY_COLS[0] * TILE, 'y': 0, 'w': (ENTRY_COLS[1] - ENTRY_COLS[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura3', 'spawn': 'landing', 'sfx': False}
    mid_x = (ENTRY_COLS[0] + ENTRY_COLS[1] + 1) * TILE // 2 - 12
    walk_tiles = sum((c1 - c0 + 1 if r1 - r0 < c1 - c0 else r1 - r0 + 1) for c0, c1, r0, r1 in LEGS)
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 4', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_north': {'x': mid_x, 'y': 1 * TILE + 16, 'facing': 'down'},
            'start': {'x': mid_x, 'y': 1 * TILE + 16, 'facing': 'down'},
            'before_dao': {'x': 20 * TILE + 4, 'y': 15 * TILE + 8, 'facing': 'right'},
            'before_bazzi': {'x': 22 * TILE + 4, 'y': 35 * TILE + 8, 'facing': 'left'},
            'south_end': {'x': 28 * TILE + 4, 'y': (HEIGHT - 3) * TILE + 8, 'facing': 'down'},
        },
        'meta': {
            'connected': True,
            'route': [[17, 1], [17, 15], [28, 15], [28, 35], [6, 35], [6, 53], [28, 53], [28, HEIGHT - 3]],
            'role': '벚꽃 숲 3 아래 물가 문 다음(BUILD266): 지그재그로 적당히 긴 벚꽃 길, 다오(첫 오른쪽 길)·배찌(왼쪽 길) 표준 조우. 아랫줄 다음 맵은 아직 없음. 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'sakura4': {'legs': [list(l) for l in LEGS], 'dao': list(DAO_CELL), 'bazzi': list(BAZZI_CELL), 'walkTiles': walk_tiles},
        },
        'entities': [*trees, dao, bazzi, door_north],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura4_tree')]), 'walk tiles', map_data['meta']['sakura4']['walkTiles'])


if __name__ == '__main__':
    main()
