#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_bend.py [--check]
# ──────────────────
"""짜장 굽이 길(jjajang_bend, BUILD227 사용자 브리핑 2026-09-18):
"지금 청소부 만난 맵 다음 맵 가지기 전에 하나 더 넣을 거야. 꾸불꾸불 길이야 같은 디자인으로 위로 갔다가 오른쪽으로 갔다가 밑으로 갔다가 오른쪽으로 갔다가 위로 갔다가,
중간에 가다가 돌 하나 있고 돌 상호작용하면 청소부: 허허 볼품없는 돌이라네 / 청소부: 누군가는 이걸 품어줘야지 / 청소부가 돌로 다가가 주움 / 돌을 얻었다. 체력회복 -5 아이템 / 그러고 끝"
- 토리이 길 오른쪽 문 → 왼쪽 가장자리(20~21행)로 들어와 위(2~3열) → 오른쪽(6~7행) → 아래(12~13열) → 오른쪽(16~17행) → 위(24~25열)로 위 가장자리까지 → 검은 소나무 숲(jjajang_pines, 아래 입구).
- 디자인은 검은 소나무 숲과 같다: 검은 숲 '@', 에코 발소리 길 '$', 검은 소나무 소품(assets/source/jjajang-pines-v1), dim 0.08, 시야 오버레이 없음. 브금 my_castle_town(“다음 맵부터” = 이 맵부터).
- 돌: 두 번째 가로 다리(16~17행)의 윗줄 18열에 놓인 소품(gpt-image, assets/source/jjajang-rock-v1). 조사하면 `jjajang_rock` 컷신, 주운 뒤엔 `unless jjajang_rock_taken` 으로 사라진다. 아랫줄로는 지나갈 수 있다."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_bend'
WIDTH: Final = 30
HEIGHT: Final = 24
TILE: Final = 32
ENTRY_ROWS: Final = (20, 21)
LEG1_COLS: Final = (2, 3)
LEG2_ROWS: Final = (6, 7)
LEG3_COLS: Final = (12, 13)
LEG4_ROWS: Final = (16, 17)
LEG5_COLS: Final = (24, 25)
ROCK_CELL: Final = (18, 16)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
)
PINE_CELLS: Final = ((7, 12), (8, 20), (17, 9), (18, 22), (22, 12), (27, 8), (16, 5), (6, 5), (27, 20), (9, 16))


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
    path(range(0, LEG1_COLS[1] + 1), range(ENTRY_ROWS[0], ENTRY_ROWS[1] + 1))           # 들어오는 자리
    path(range(LEG1_COLS[0], LEG1_COLS[1] + 1), range(LEG2_ROWS[0], ENTRY_ROWS[1] + 1))   # 위로
    path(range(LEG1_COLS[0], LEG3_COLS[1] + 1), range(LEG2_ROWS[0], LEG2_ROWS[1] + 1))    # 오른쪽으로
    path(range(LEG3_COLS[0], LEG3_COLS[1] + 1), range(LEG2_ROWS[0], LEG4_ROWS[1] + 1))    # 밑으로
    path(range(LEG3_COLS[0], LEG5_COLS[1] + 1), range(LEG4_ROWS[0], LEG4_ROWS[1] + 1))    # 오른쪽으로
    path(range(LEG5_COLS[0], LEG5_COLS[1] + 1), range(0, LEG4_ROWS[1] + 1))               # 위로
    for row in ENTRY_ROWS:
        rows[row][0] = '&'
    for col in LEG5_COLS:
        rows[0][col] = '&'
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(PINE_CELLS)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    rock_col, rock_row = ROCK_CELL
    base_y = rock_row * TILE + 28
    rock = {
        'type': 'prop', 'id': 'jjajang_rock', 'image': 'assets/props/jjajang_rock.png', 'scale': 2,
        'x': rock_col * TILE + 6, 'y': base_y - 12, 'w': 20, 'h': 12, 'ix': rock_col * TILE - 4, 'iy': base_y - 36,
        'solid': True, 'script': 'jjajang_rock', 'unless': 'jjajang_rock_taken',
    }
    door_west = {
        'type': 'door', 'id': 'bend_torii_door', 'x': 0, 'y': ENTRY_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_torii', 'spawn': 'from_east', 'sfx': False,
    }
    door_north = {
        'type': 'door', 'id': 'bend_pines_door', 'x': LEG5_COLS[0] * TILE, 'y': 0, 'w': 2 * TILE, 'h': 10,
        'to': 'jjajang_pines', 'spawn': 'from_south', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '짜장 굽이 길',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ENTRY_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ENTRY_ROWS[0] * TILE + 6, 'facing': 'right'},
            'from_north': {'x': LEG5_COLS[0] * TILE + 20, 'y': 1 * TILE + 16, 'facing': 'down'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ENTRY_ROWS[0]], [LEG1_COLS[0], LEG2_ROWS[0]], [LEG3_COLS[0], LEG4_ROWS[1]], [LEG5_COLS[0], 1]],
            'role': '토리이 길 → (위·오른쪽·밑·오른쪽·위) 굽이 길 → 검은 소나무 숲. 두 번째 가로 다리에 돌(청소부가 줍는다, 체력회복 -5). 브금 my_castle_town 시작',
            'rock': list(ROCK_CELL),
        },
        'entities': [*pines, rock, door_west, door_north],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_bend.py [--check]')
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
