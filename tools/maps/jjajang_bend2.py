#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_bend2.py [--check]
# ──────────────────
"""굽은 물길(jjajang_bend2, BUILD245 사용자 “다음맵도 만들고” 2026-09-19 — 내용 브리핑 없음):
- 생각 길 오른쪽 문에서 왼쪽 가장자리(6~7행)로 들어와 오른쪽 → 40~41열에서 아래로 → 14~15행에서 오른쪽 끝까지(같은 지역 자산: 검은 물 '*', 소나무). 대사·소품·문은 지어내지 않고 오른쪽 끝은 통로만(다음 맵 브리핑 대기)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_bend2'
WIDTH: Final = 80
HEIGHT: Final = 22
TILE: Final = 32
ROAD_ROWS: Final = (6, 7)              # 윗길
LOWER_ROWS: Final = (14, 15)          # 아랫길
DOWN_COLS: Final = (40, 41)           # 윗길 → 아랫길
RUN_SPEED: Final = 420
CAM_LEFT: Final = 0.22
SCREEN_W: Final = 480
NEAR_BASE: Final = (57.0, 285.3)
FAR_BASE: Final = (196.0, 216.6)
BACK_OFFSET: Final = (176, 121)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
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


def torii(tag: str, col: int, road_rows: tuple[int, int]) -> list[dict[str, object]]:
    """가까운 기둥 밑동을 길 아래 칸 위쪽 2px 에, 먼 기둥은 계약대로 오른쪽 위(길 위 칸)."""
    near_x = col * TILE + 16
    near_y = (road_rows[1] + 1) * TILE + 2
    ix = round(near_x - NEAR_BASE[0])
    iy = round(near_y - NEAR_BASE[1])
    far_x = ix + FAR_BASE[0]
    far_y = iy + FAR_BASE[1]
    back = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_back', 'image': 'assets/props/jjajang_torii_blue_back.png',
        'x': round(far_x - 12), 'y': round(far_y - 22), 'w': 24, 'h': 22, 'ix': ix + BACK_OFFSET[0], 'iy': iy + BACK_OFFSET[1], 'solid': True,
    }
    front = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_front', 'image': 'assets/props/jjajang_torii_blue_front.png',
        'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24, 'ix': ix, 'iy': iy, 'solid': True,
    }
    assert (road_rows[0] - 1) * TILE <= back['y'] and back['y'] + back['h'] <= road_rows[0] * TILE, '먼 기둥 히트박스는 길 위 칸 안'
    assert (road_rows[1] + 1) * TILE <= front['y'] and front['y'] + front['h'] <= (road_rows[1] + 2) * TILE, '가까운 기둥 히트박스는 길 아래 칸 안'
    assert iy >= 0
    return [back, front]


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in ROAD_ROWS:
        for col in range(0, DOWN_COLS[1] + 1):
            rows[row][col] = '*'
        rows[row][0] = '+'
    for row in range(ROAD_ROWS[0], LOWER_ROWS[1] + 1):
        for col in DOWN_COLS:
            rows[row][col] = '*'
    for row in LOWER_ROWS:
        for col in range(DOWN_COLS[0], WIDTH):
            rows[row][col] = '*'
        rows[row][WIDTH - 1] = '+'
    cells: list[tuple[int, int]] = []
    for col in range(7, WIDTH - 6, 9):
        for row in (3, 10, 18):
            c, r = col + (row // 8) % 2 * 3, row + (col // 9) % 2
            if rows[r][c] != '@' or c <= 2:
                continue
            cells.append((c, r))
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(cells)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    door_west = {'type': 'door', 'id': 'bend2_think_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE, 'to': 'jjajang_think', 'spawn': 'from_east', 'sfx': False}
    return {
        'id': MAP_ID,
        'name': '굽은 물길',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE - 8, 'y': LOWER_ROWS[0] * TILE + 6, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0]], [DOWN_COLS[0], ROAD_ROWS[0]], [DOWN_COLS[0], LOWER_ROWS[0]], [WIDTH - 2, LOWER_ROWS[0]]],
            'role': '생각 길 다음: 오른쪽 → 아래 → 오른쪽 굽은 검은 물길, 사건 없음, 오른쪽 끝(다음 맵 브리핑 대기, 문 없음). 브금 my_castle_town 이어짐',
            'bend': {'downCols': list(DOWN_COLS), 'lowerRows': list(LOWER_ROWS)},
        },
        'entities': [*pines, door_west],
    }


def main() -> None:
    if '--help' in sys.argv:
        print(f'Usage: /usr/bin/python3 tools/maps/{MAP_ID}.py [--check]')
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, map_data['meta'].get('runs', ''))


if __name__ == '__main__':
    main()
