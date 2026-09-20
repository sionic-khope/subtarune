#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura2.py [--check]
# ──────────────────
"""벚꽃 숲 2(jjajang_sakura2, BUILD264 사용자 브리핑 2026-09-20 — 원문 design/narrative/cutscenes/jjajang_sakura2.md):
"그다음 벚꽃맵 똑같이 오른쪽으로 갔다가 위로갔다가 뭐 빙글빙글 도는것도 있고 그런 맵 찍어주고 마무리는 위로 올라가는건데 위로 올라가기 이전에 오른쪽으로 가면 연출 시작 (브금 유지하고)
 카메라가 오른쪽으로 그리드로 움직임 (길이 끊겨있음. 오른쪽으로 이동하면 또 벚꽃다리가 보이는데 거기 가순이들하고 최미스 가면쓰고있고 …"
- 벚꽃 숲(jjajang_sakura) 오른쪽 끝 문에서 왼쪽 가장자리로 들어와(50~53행) 오른쪽 → 9~12열로 위 → 빙글빙글(오른쪽 → 위 → 왼쪽 → 위로 감아 도는 길) → 8~11행 갈림목.
  갈림목에서 오른쪽 샛길(13~24열)은 24열에서 끊긴다(그 너머 25~29열은 검은 숲). 30~42열에 벚꽃다리 소품, 그 위에 가면 쓴 최미스·가순이 셋(닿을 수 없다). 샛길 끝 트리거 → jjajang_sakura2_bridge.
  갈림목에서 위 9~12열 길 → 윗줄 문 → 벚꽃 숲 3(뗏목).
- 땅은 전부 분홍 꽃잎 땅 ')'(이미 핀 뒤), 나무는 벚꽃 판, 꽃잎 초당 18 계속, 브금 sakura 유지, 발소리 없음."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura2'
WIDTH: Final = 44
HEIGHT: Final = 56
TILE: Final = 32
GROUND: Final = ')'
ENTRY_ROWS: Final = (50, 53)          # 왼쪽 가장자리 입구 길(4행)
COL_A: Final = (9, 12)                # 위로 가는 첫 길·마지막 길 열
COL_B: Final = (21, 24)               # 빙글빙글 오른쪽 열
LOOP_BOTTOM: Final = (33, 36)         # 빙글: 아래 가로 길 행(오른쪽으로)
LOOP_TOP: Final = (22, 25)            # 빙글: 위 가로 길 행(왼쪽으로)
JUNCTION_ROWS: Final = (8, 11)        # 갈림목·오른쪽 샛길 행
SIDE_END_COL: Final = 24              # 샛길이 끊기는 열
BRIDGE_COL: Final = 30                # 벚꽃다리 왼쪽 열(그 앞 25~29열은 검은 숲 — 건널 수 없다)
TRIGGER_COLS: Final = (21, 24)        # 샛길 끝 트리거
BRIDGE_FILE: Final = 'assets/props/sakura_bridge.png'
BRIDGE_FLAG: Final = 'sakura2_bridge_done'
TREES: Final = (
    ('assets/props/jjajang_sakura_1.png', 141, 157, 100),
    ('assets/props/jjajang_sakura_2.png', 135, 159, 30),
    ('assets/props/jjajang_sakura_3.png', 108, 167, 60),
    ('assets/props/jjajang_sakura_4.png', 167, 146, 58),
)
PETALS: Final = {'rate': 18, 'burst': 0, 'burstRate': 18, 'burstSeconds': 0, 'after': 18}


def png_size(path: str) -> tuple[int, int]:
    data = Path(path).read_bytes()
    return struct.unpack('>II', data[16:24])


def tree(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {'type': 'prop', 'id': f'sakura2_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = GROUND
    fill(0, COL_A[1], ENTRY_ROWS[0], ENTRY_ROWS[1])                      # 왼쪽에서 오른쪽으로
    fill(COL_A[0], COL_A[1], LOOP_BOTTOM[0], ENTRY_ROWS[1])              # 위로
    fill(COL_A[0], COL_B[1], LOOP_BOTTOM[0], LOOP_BOTTOM[1])             # 빙글: 오른쪽으로
    fill(COL_B[0], COL_B[1], LOOP_TOP[0], LOOP_BOTTOM[1])                # 빙글: 위로
    fill(COL_A[0], COL_B[1], LOOP_TOP[0], LOOP_TOP[1])                   # 빙글: 왼쪽으로
    fill(COL_A[0], COL_A[1], JUNCTION_ROWS[0], LOOP_TOP[1])              # 위로 갈림목까지
    fill(COL_A[0], SIDE_END_COL, JUNCTION_ROWS[0], JUNCTION_ROWS[1])     # 오른쪽 샛길(끊김)
    fill(COL_A[0], COL_A[1], 0, JUNCTION_ROWS[0])                        # 위로 윗줄까지(문)
    # 나무: 길 바깥을 따라 어긋나게
    cells: list[tuple[int, int]] = []
    for row in range(ENTRY_ROWS[0] - 2, ENTRY_ROWS[1] + 3, 4):
        for col in range(1, COL_A[1] + 2, 4):
            cells.append((col, row))
    for row in range(2, HEIGHT - 6, 3):
        offset = (row // 3) % 2
        for col in (COL_A[0] - 3 + offset, COL_A[1] + 2 + offset, COL_B[0] - 3 + offset, COL_B[1] + 2 + offset, 1 + offset, 17 - offset, 30 + offset, 36 - offset, 41 - offset):
            cells.append((col, row))
    for col in range(COL_A[1] + 3, SIDE_END_COL + 4, 3):                 # 샛길 위(5~6행)·아래(13~14행)
        offset = (col // 3) % 2
        cells += [(col, JUNCTION_ROWS[0] - 3 + offset), (col, JUNCTION_ROWS[1] + 3 - offset)]
    seen: set[tuple[int, int]] = set(); trees = []
    for i, (col, row) in enumerate(cells):
        if (col, row) in seen or not (0 <= col < WIDTH and 0 <= row < HEIGHT) or rows[row][col] != '@':
            continue
        if JUNCTION_ROWS[0] - 3 <= row <= JUNCTION_ROWS[1] + 2 and col >= BRIDGE_COL - 1:
            continue                                                     # 다리 자리는 비운다
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    bw, bh = png_size(BRIDGE_FILE)
    bridge_x = BRIDGE_COL * TILE
    bridge_y = (JUNCTION_ROWS[0] + 2) * TILE - bh // 2 + 8               # 다리 판이 샛길 높이(9~10행)에 오게
    bridge = {'type': 'prop', 'id': 'sakura_bridge', 'image': BRIDGE_FILE, 'x': bridge_x, 'y': bridge_y, 'w': bw, 'h': bh, 'ix': bridge_x, 'iy': bridge_y, 'solid': True, 'sortY': -1}
    # 다리 위 가면 쓴 최미스·가순이 셋(닿을 수 없는 곳 — 연출 전용 배우라 hidden, 연출이 카메라를 옮기기 전에 보이게 하고 가면 자세를 건다. 샛길 끝(24열)에서는 화면 밖(33열~)이라 그 전엔 안 보인다)
    deck_y = bridge_y + bh // 2 - 4
    choimis = {'type': 'npc', 'id': 'choimis', 'sprite': 'choimis', 'x': (BRIDGE_COL + 8) * TILE + 4, 'y': deck_y, 'w': 24, 'h': 16, 'solid': False, 'facing': 'left', 'wander': 0, 'hidden': True}
    girls = [{'type': 'npc', 'id': f'gasuni{i + 1}', 'sprite': f'gasuni{i + 1}', 'x': (BRIDGE_COL + 3 + i * 2) * TILE - 12 * (i % 2), 'y': deck_y - 10 + (i % 2) * 22, 'w': 24, 'h': 16,
              'solid': False, 'facing': 'right', 'wander': 0, 'hidden': True} for i in range(3)]
    trigger = {'type': 'trigger', 'id': 'sakura2_bridge_trigger', 'x': TRIGGER_COLS[0] * TILE, 'y': JUNCTION_ROWS[0] * TILE, 'w': (TRIGGER_COLS[1] - TRIGGER_COLS[0] + 1) * TILE, 'h': (JUNCTION_ROWS[1] - JUNCTION_ROWS[0] + 1) * TILE,
               'once': True, 'flag': 'sakura2_bridge_started', 'unless': BRIDGE_FLAG, 'script': 'jjajang_sakura2_bridge'}
    door_west = {'type': 'door', 'id': 'sakura2_west_door', 'x': 0, 'y': ENTRY_ROWS[0] * TILE, 'w': 10, 'h': (ENTRY_ROWS[1] - ENTRY_ROWS[0] + 1) * TILE, 'to': 'jjajang_sakura', 'spawn': 'from_east', 'sfx': False}
    door_north = {'type': 'door', 'id': 'sakura2_north_door', 'x': COL_A[0] * TILE, 'y': 0, 'w': (COL_A[1] - COL_A[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura3', 'spawn': 'from_south', 'sfx': False}
    assert rows[JUNCTION_ROWS[0]][SIDE_END_COL + 1] == '@' and rows[JUNCTION_ROWS[1]][BRIDGE_COL - 1] == '@', '샛길은 끊겨 있고 다리까지는 검은 숲'
    mid_a = (COL_A[0] + COL_A[1] + 1) * TILE // 2 - 12
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 2', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0,
        'rows': [''.join(row) for row in rows],
        'preload': [BRIDGE_FILE],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': (ENTRY_ROWS[0] + 1) * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': (ENTRY_ROWS[0] + 1) * TILE + 6, 'facing': 'right'},
            'junction': {'x': mid_a, 'y': (JUNCTION_ROWS[1] + 3) * TILE + 6, 'facing': 'up'},
            'from_north': {'x': mid_a, 'y': 1 * TILE + 16, 'facing': 'down'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ENTRY_ROWS[0] + 1], [COL_A[0] + 1, ENTRY_ROWS[0] + 1], [COL_A[0] + 1, LOOP_BOTTOM[0] + 1], [COL_B[0] + 1, LOOP_BOTTOM[0] + 1], [COL_B[0] + 1, LOOP_TOP[0] + 1], [COL_A[0] + 1, LOOP_TOP[0] + 1], [COL_A[0] + 1, JUNCTION_ROWS[0] + 1], [COL_A[0] + 1, 1]],
            'role': '벚꽃 숲 오른쪽 문 다음(BUILD264): 왼쪽에서 오른쪽 → 위 → 빙글빙글 감아 오르는 길 → 갈림목. 오른쪽 샛길 끝(끊긴 길)에서 벚꽃다리 위 최미스·가순이 연출(브금 유지), 위로 가면 벚꽃 숲 3',
            'petals': PETALS,
            'sakura2': {'entryRows': list(ENTRY_ROWS), 'colA': list(COL_A), 'colB': list(COL_B), 'loopBottom': list(LOOP_BOTTOM), 'loopTop': list(LOOP_TOP), 'junction': list(JUNCTION_ROWS), 'sideEnd': SIDE_END_COL, 'bridgeCol': BRIDGE_COL},
        },
        'entities': [*trees, bridge, choimis, *girls, trigger, door_west, door_north],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura2_tree')]))


if __name__ == '__main__':
    main()
