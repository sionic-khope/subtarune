#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_glade.py [--check]
# ──────────────────
"""빛 드는 공터(jjajang_glade, BUILD257 사용자 브리핑 2026-09-20):
"그 다음맵은 오른쪽 좀 올라가다가 가운데에 어느정도 공간있는 원형모양에 위에서 뭔가 빛이 살짝 들어오는느낌의 밝기도 넣어주고
가운데 살짝 옆에 풀숲같은게 오른쪽에 한 세개정도 배치해주고 … (여기에 나무가있음 나무뒤에 숨어서 바라보는느낌으로 이동. 나무배치도 하고)"
- 깊은숲 입구(jjajang_deep) 위 문에서 아래 가장자리(8~9열)로 들어와 위로 가다가 오른쪽으로 비스듬히 오르는 길('U') → 가운데 반지름 10칸 원형 공터.
- 위에서 드는 빛: spotlight(공터 가운데, rx 230 · ry 190 · alpha 0.22) + dim 0.2 — 공터 안은 은은히 밝고 밖은 어둡다. 바닥은 길과 같은 어두운 타일(밝은 풀숲 타일은 다른 지역처럼 보여 폐기).
- 풀숲 소품 3개(gpt-image `assets/props/jjajang_bush.png`, 52×50)는 가운데에서 오른쪽으로 6~7칸. 가운데 풀숲에 최미스(숨은 NPC)와 디스코드 가면 소품이 숨어 있다. 가순이 1·2·3 은 공터 위쪽(6~7행)에 숨어 있다가 최미스 왼쪽 빈터로 내려온다(2부).
- 숨는 나무: 공터 왼쪽(13열)에 어두운 소나무 — 일행이 그 왼쪽(11열)에 서면 잎에 가려 ‘나무 뒤’ 가 된다.
- 트리거: 공터 안 아래쪽(15~20열 × 18~19행)에 닿으면 한 번 `jjajang_glade_intro` — 이 자리에서 카메라(11.25행 높이)에 풀숲 셋(13~17행)이 다 보인다."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_glade'
WIDTH: Final = 36
HEIGHT: Final = 40
TILE: Final = 32
ENTRY_COLS: Final = (8, 9)            # 아래 가장자리 입구(깊은숲 입구 위 문과 이어짐)
STRAIGHT_TOP: Final = 30              # 8~9열 곧은 길의 위 끝 행
CENTER: Final = (18, 15)              # 공터 중심(칸)
RADIUS: Final = 10
PATH_CHAR: Final = 'U'
EDGE_CHAR: Final = '^'
GLADE_CHAR: Final = 'U'               # 공터 바닥도 어두운 길 타일 — 밝기는 spotlight 로만(풀숲 타일 '"' 은 밝은 초록 줄무늬라 다른 지역처럼 보였다)
BUSH: Final = ('assets/props/jjajang_bush.png', 52, 50)
BUSH_CELLS: Final = ((24, 12), (25, 14), (24, 16))   # 가운데에서 오른쪽으로 6~7칸에 세 개(가운데 것에 최미스)
HIDE_TREE_CELL: Final = (13, 15)      # 숨는 나무(공터 왼쪽)
TRIGGER: Final = (15, 18, 6, 2)       # 열, 행, 폭, 높이 — 공터 안 아래쪽(여기 서면 카메라에 풀숲 셋이 다 들어온다)
PINES: Final = (
    ('assets/props/jjajang_pine_dark_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_dark_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_dark_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_dark_4.png', 167, 146, 58),
)
PINE_CELLS: Final = (
    (3, 4), (9, 3), (16, 2), (24, 3), (30, 4), (33, 9), (2, 10), (5, 16), (33, 16), (2, 22), (32, 23),
    (5, 27), (14, 27), (26, 27), (32, 30), (3, 33), (14, 33), (22, 33), (29, 35), (4, 38), (18, 38), (26, 38),
)


def pine(index: int, col: int, row: int, prefix: str = 'jjajang_pine_dark') -> dict[str, object] | None:
    file, width, height, base_x = PINES[index % len(PINES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {
        'type': 'prop', 'id': f'{prefix}_{index + 1}', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True,
    }


def inside_glade(col: int, row: int) -> bool:
    dx, dy = col - CENTER[0], row - CENTER[1]
    return dx * dx + dy * dy <= RADIUS * RADIUS


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in range(STRAIGHT_TOP, HEIGHT):                       # 아래에서 위로 곧게
        for col in range(ENTRY_COLS[0], ENTRY_COLS[1] + 1):
            rows[row][col] = PATH_CHAR
    diag_end = CENTER[1] + RADIUS - 1                             # 공터 아래 가장자리 행(22)
    for step, row in enumerate(range(STRAIGHT_TOP - 1, diag_end, -1)):   # 오른쪽으로 비스듬히 오르며 공터 밑까지
        left = ENTRY_COLS[0] + step
        for col in range(left, left + 3):
            rows[row][col] = PATH_CHAR
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if inside_glade(col, row):
                rows[row][col] = GLADE_CHAR
    for col in range(ENTRY_COLS[0], ENTRY_COLS[1] + 1):
        rows[HEIGHT - 1][col] = EDGE_CHAR
    # 비스듬한 길 끝이 공터에 닿는지
    assert any(rows[diag_end + 1][c] == PATH_CHAR and inside_glade(c, diag_end) for c in range(WIDTH)), '길이 공터에 닿는다'
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(PINE_CELLS)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길·공터 위: {col},{row}'
    hide_tree = pine(0, *HIDE_TREE_CELL, prefix='glade_hide_tree')
    assert hide_tree is not None
    hide_tree['id'] = 'glade_hide_tree'
    bush_file, bush_w, bush_h = BUSH
    bushes = []
    for i, (col, row) in enumerate(BUSH_CELLS):
        cx, base_y = col * TILE + 16, row * TILE + 28
        bushes.append({'type': 'prop', 'id': f'glade_bush_{i + 1}', 'image': bush_file,
                       'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': cx - bush_w // 2, 'iy': base_y - bush_h, 'solid': True})
        assert inside_glade(col, row), '풀숲은 공터 안'
    assert inside_glade(*HIDE_TREE_CELL), '숨는 나무는 공터 안'
    # 최미스: 가운데 풀숲(2번) 뒤에 숨어 있다(연출이 꺼낸다). 디스코드 가면 소품도 같은 자리에 숨김
    b2 = bushes[1]
    choimis = {'type': 'npc', 'id': 'choimis', 'sprite': 'choimis', 'x': b2['x'], 'y': b2['y'] - 8, 'w': 24, 'h': 16,
               'hidden': True, 'solid': False, 'facing': 'down', 'wander': 0}
    mask = {'type': 'prop', 'id': 'discord_mask', 'image': 'assets/props/discord_mask.png', 'x': b2['x'], 'y': b2['y'],
            'w': 0, 'h': 0, 'ix': b2['x'] - 11, 'iy': b2['y'] - 40, 'solid': False, 'hidden': True}
    # 가순이 1·2·3(2부): 공터 위쪽(8행)에 숨어 있다가 연출이 내려보낸다. 연출 뒤엔 없음(glade_done)
    girls = [{'type': 'npc', 'id': f'gasuni{i + 1}', 'sprite': f'gasuni{i + 1}', 'x': col * TILE + 4, 'y': (6 + i % 2) * TILE + 6, 'w': 24, 'h': 16,
              'hidden': True, 'solid': False, 'facing': 'down', 'wander': 0, 'unless': 'glade_done'} for i, col in enumerate((18, 20, 22))]
    for g in girls:
        assert inside_glade((g['x'] + 12) // TILE, (g['y'] + 8) // TILE), '가순이는 공터 안 위쪽'
    tc, tr, tw, th = TRIGGER
    trigger = {'type': 'trigger', 'id': 'glade_intro_trigger', 'x': tc * TILE, 'y': tr * TILE, 'w': tw * TILE, 'h': th * TILE,
               'once': True, 'flag': 'glade_started', 'unless': 'glade_done', 'script': 'jjajang_glade_intro'}
    assert all(inside_glade(c, r) for r in range(tr, tr + th) for c in range(tc, tc + tw)), '트리거는 공터 안'
    assert inside_glade(CENTER[0], tr + 3), '연출 직전 스폰은 공터 안'
    door_south = {'type': 'door', 'id': 'glade_deep_door', 'x': ENTRY_COLS[0] * TILE, 'y': HEIGHT * TILE - 10, 'w': 2 * TILE, 'h': 10,
                  'to': 'jjajang_deep', 'spawn': 'from_north', 'sfx': False}
    cx, cy = CENTER[0] * TILE + 16, CENTER[1] * TILE + 16
    return {
        'id': MAP_ID,
        'name': '빛 드는 공터',
        'stage': 'ship_sinking_done',
        'bgm': 'wind',
        'dim': 0.2,
        'spotlight': {'x': cx, 'y': cy - 24, 'rx': 230, 'ry': 190, 'alpha': 0.22},
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_south': {'x': ENTRY_COLS[1] * TILE - 8, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'start': {'x': ENTRY_COLS[1] * TILE - 8, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'before_bush': {'x': CENTER[0] * TILE + 8, 'y': (tr + 3) * TILE + 6, 'facing': 'up'},
            'center': {'x': CENTER[0] * TILE + 8, 'y': (CENTER[1] + 2) * TILE + 6, 'facing': 'up'},
        },
        'meta': {
            'connected': True,
            'route': [[ENTRY_COLS[1], HEIGHT - 3], [ENTRY_COLS[1], STRAIGHT_TOP], [CENTER[0], CENTER[1]]],
            'role': '깊은숲 입구 위 문 다음(BUILD257): 오른쪽으로 비스듬히 오르면 위에서 빛이 드는 원형 공터. 오른쪽 풀숲 셋(가운데 것에 최미스), 왼쪽 숨는 나무. 브금 wind',
            'glade': {'center': list(CENTER), 'radius': RADIUS, 'bushes': [list(c) for c in BUSH_CELLS], 'hideTree': list(HIDE_TREE_CELL), 'trigger': list(TRIGGER)},
        },
        'entities': [*pines, hide_tree, *bushes, mask, choimis, *girls, trigger, door_south],
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
