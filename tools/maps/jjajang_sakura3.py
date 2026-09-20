#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura3.py [--check]
# ──────────────────
"""벚꽃 숲 3(jjajang_sakura3, BUILD264 사용자 브리핑 2026-09-20 — 원문 design/narrative/cutscenes/jjajang_sakura2.md):
"그다음에 위로 맵 가면 위로갓다가 오른쪽으로 가는길, 그리고 떗목 오른쪽으로 파란물 길 만들어주고 땟목 타서 오른쪽으로 가고 아래로 가는 맵도 찍어줘 … 땟목타면 한 8초정도 이동하는길이로 만들고 4초쯤에 벚꽃 좀 휘날리고도 넣어주고"
- 벚꽃 숲 2 윗줄 문에서 아래 가장자리로 들어와(5~8열) 위로 → 23~26행에서 오른쪽으로 → 물가(16열). 파란 물길 '['(막힘): 17~46열 × 22~27행 오른쪽으로, 41~46열 × 28~45행 아래로.
  뗏목(raft.png, 171px/s)이 물가에 떠 있고 C 로 걸어 올라타(동료는 옆에서 헤엄) 오른쪽 → 아래로 약 8.6초(1,472px) → 아래 물가 뭍(37~50열 × 46~49행)에 내린다. 4초쯤 꽃잎 휘날림(meta.rideGust).
- 땅은 분홍 꽃잎 땅 ')', 나무는 벚꽃 판, 꽃잎 초당 18, 브금 sakura 유지, 발소리 없음. 아래 뭍의 다음 맵은 아직 없다."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura3'
WIDTH: Final = 52
HEIGHT: Final = 50
TILE: Final = 32
GROUND: Final = ')'
WATER: Final = '['
ENTRY_COLS: Final = (5, 8)            # 아래 가장자리 입구 길(4열)
ENTRY_TOP: Final = 23                 # 위로 가다 오른쪽으로 꺾는 행
ROAD_ROWS: Final = (23, 26)           # 오른쪽으로 가는 길 행
SHORE_COL: Final = 16                 # 물가(길 끝 열)
CHANNEL_COLS: Final = (17, 46)        # 파란 물길 가로 구간(오른쪽으로 25칸 ≈ 4.7초)
CHANNEL_ROWS: Final = (22, 27)
DOWN_COLS: Final = (41, 46)           # 파란 물길 세로 구간(아래로 20칸 ≈ 3.7초)
DOWN_END_ROW: Final = 45              # 물길이 끝나는 행(그 아래는 뭍)
LANDING_COLS: Final = (37, 50)        # 아래 물가 뭍
LANDING_ROWS: Final = (46, 49)
RAFT_SPEED: Final = 171
RIDE_GUST: Final = {'at': 4.0, 'burst': 160, 'rate': 60, 'seconds': 2.0}   # 타고 4초쯤 꽃잎 휘날림
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
    return {'type': 'prop', 'id': f'sakura3_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int, ch: str = GROUND) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = ch
    fill(ENTRY_COLS[0], ENTRY_COLS[1], ENTRY_TOP, HEIGHT - 1)             # 아래에서 위로
    fill(ENTRY_COLS[0], SHORE_COL, ROAD_ROWS[0], ROAD_ROWS[1])              # 오른쪽으로 물가까지
    fill(CHANNEL_COLS[0], CHANNEL_COLS[1], CHANNEL_ROWS[0], CHANNEL_ROWS[1], WATER)   # 물길 오른쪽으로
    fill(DOWN_COLS[0], DOWN_COLS[1], CHANNEL_ROWS[1] + 1, DOWN_END_ROW, WATER)        # 물길 아래로
    fill(LANDING_COLS[0], LANDING_COLS[1], LANDING_ROWS[0], LANDING_ROWS[1])          # 아래 물가 뭍
    # 뗏목: 물가 바로 오른쪽 물 위(17열), 길 높이(24~25행) → 오른쪽 37열 → 아래 33행(그 아래 뭍에 내린다)
    raft_x, raft_y = CHANNEL_COLS[0] * TILE + 4, (ROAD_ROWS[0] + 1) * TILE - 4
    turn_x = (DOWN_COLS[0] + 1) * TILE + 4
    end_y = LANDING_ROWS[0] * TILE - 36                                   # 뗏목 아래가 뭍 첫 행에 4px 걸치게 — 뭍에서 위를 보고 C 로 다시 탈 수 있다(사용자 2026-09-20 “뗏목 반대로는 안타지네”: 전엔 물 한 행이 사이에 있어 probe 가 안 닿았다)
    raft = {'type': 'raft', 'id': 'sakura_raft', 'image': 'assets/props/raft.png', 'x': raft_x, 'y': raft_y,
            'route': [[turn_x, raft_y], [turn_x, end_y]], 'speed': RAFT_SPEED, 'walkOn': True,
            'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below'}
    ride_px = (turn_x - raft_x) + (end_y - raft_y)
    assert 7.0 <= ride_px / RAFT_SPEED <= 9.0, f'뗏목 8초쯤: {ride_px / RAFT_SPEED:.1f}초'
    assert rows[(raft_y + 20) // TILE][(raft_x + 28) // TILE] == WATER and rows[(end_y + 16) // TILE][(turn_x + 28) // TILE] == WATER, '뗏목 경로는 물 위'
    assert rows[LANDING_ROWS[0]][(turn_x + 28) // TILE] == GROUND, '내리는 곳은 뭍'
    cells: list[tuple[int, int]] = []
    for row in range(ENTRY_TOP + 2, HEIGHT - 1, 3):                       # 입구 길 양옆
        offset = (row // 3) % 2
        cells += [(ENTRY_COLS[0] - 3 + offset, row), (ENTRY_COLS[1] + 2 + offset, row)]
    for col in range(ENTRY_COLS[1] + 3, SHORE_COL + 1, 3):                 # 오른쪽 길 위아래
        offset = (col // 3) % 2
        cells += [(col, ROAD_ROWS[0] - 3 + offset), (col, ROAD_ROWS[1] + 3 - offset)]
    for col in range(CHANNEL_COLS[0], CHANNEL_COLS[1] + 1, 3):             # 물길 위아래 둑
        offset = (col // 3) % 2
        cells += [(col, CHANNEL_ROWS[0] - 3 + offset), (col + 1, CHANNEL_ROWS[1] + 3 - offset)]
    for row in range(CHANNEL_ROWS[1] + 2, DOWN_END_ROW, 3):                # 세로 물길 양옆
        offset = (row // 3) % 2
        cells += [(DOWN_COLS[0] - 3 + offset, row), (DOWN_COLS[1] + 2 + offset, row)]
    for col in range(1, WIDTH - 1, 5):                                     # 위쪽 빈 숲
        cells += [(col, 3 + (col // 5) % 3), (col + 2, 12 + (col // 5) % 3)]
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or not (0 <= col < WIDTH and 0 <= row < HEIGHT) or rows[row][col] != '@':
            continue
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    door_south = {'type': 'door', 'id': 'sakura3_south_door', 'x': ENTRY_COLS[0] * TILE, 'y': HEIGHT * TILE - 10, 'w': (ENTRY_COLS[1] - ENTRY_COLS[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura2', 'spawn': 'from_north', 'sfx': False}
    mid_x = (ENTRY_COLS[0] + ENTRY_COLS[1] + 1) * TILE // 2 - 12
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 3', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_south': {'x': mid_x, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'start': {'x': mid_x, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'dock': {'x': (SHORE_COL - 1) * TILE + 4, 'y': (ROAD_ROWS[0] + 1) * TILE + 6, 'facing': 'right'},
            'landing': {'x': (DOWN_COLS[0] + 1) * TILE + 4, 'y': (LANDING_ROWS[0] + 1) * TILE + 6, 'facing': 'down'},
        },
        'meta': {
            'connected': True,
            'route': [[ENTRY_COLS[0] + 1, HEIGHT - 3], [ENTRY_COLS[0] + 1, ROAD_ROWS[0] + 1], [SHORE_COL - 1, ROAD_ROWS[0] + 1]],
            'role': '벚꽃 숲 2 윗줄 문 다음(BUILD264): 위로 → 오른쪽으로 물가 → 뗏목(파란 물길)으로 오른쪽 8초, 4초쯤 꽃잎 휘날림 → 아래로 → 아래 물가 뭍(다음 맵은 아직 없음)',
            'petals': PETALS,
            'rideGust': RIDE_GUST,
            'sakura3': {'entryCols': list(ENTRY_COLS), 'roadRows': list(ROAD_ROWS), 'shoreCol': SHORE_COL, 'channel': [list(CHANNEL_COLS), list(CHANNEL_ROWS)], 'down': [list(DOWN_COLS), DOWN_END_ROW], 'landing': [list(LANDING_COLS), list(LANDING_ROWS)], 'rideSeconds': round(ride_px / RAFT_SPEED, 2)},
        },
        'entities': [*trees, raft, door_south],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura3_tree')]), 'ride', map_data['meta']['sakura3']['rideSeconds'])


if __name__ == '__main__':
    main()
