#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_walk.py [--check]
# ──────────────────
"""짜장 곧은 길(jjajang_walk, BUILD227 사용자 브리핑 2026-09-18): "마지막 이전 맵에 하나 더 추가할 건데 오른쪽으로 쭉 걸어가는 맵인데 중간 정도 갔을 때 [연출] 청소부: 어이 잠깐 …"
- 굽이 길(jjajang_bend) 위 가장자리에서 왼쪽 가장자리(5~6행)로 들어와 오른쪽 끝까지 곧게 → 검은 소나무 숲(jjajang_pines) 왼쪽 입구.
- 디자인은 검은 소나무 숲과 같다(검은 숲·에코 길 '$'·검은 소나무 드문드문, dim 0.08). 브금 my_castle_town 이어짐.
- 중간(25~26열) 트리거 → `jjajang_walk_pause` 컷신(천천히 걷기 안내). 한 번만."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_walk'
WIDTH: Final = 52
HEIGHT: Final = 12
TILE: Final = 32
ROAD_ROWS: Final = (5, 6)
PAUSE_COLS: Final = (25, 26)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
)
PINE_CELLS: Final = ((6, 3), (14, 2), (23, 3), (33, 2), (42, 3), (49, 2), (3, 10), (11, 11), (19, 10), (29, 11), (38, 10), (47, 11))


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
    for row in ROAD_ROWS:
        for col in range(WIDTH):
            rows[row][col] = '$'
        rows[row][0] = '&'
        rows[row][WIDTH - 1] = '&'
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(PINE_CELLS)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    pause = {
        'type': 'trigger', 'id': 'walk_pause_trigger', 'x': PAUSE_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE,
        'once': True, 'flag': 'jjajang_walk_started', 'unless': 'jjajang_walk_done', 'script': 'jjajang_walk_pause',
    }
    door_west = {
        'type': 'door', 'id': 'walk_bend_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_bend', 'spawn': 'from_north', 'sfx': False,
    }
    door_east = {
        'type': 'door', 'id': 'walk_pines_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_pines', 'spawn': 'from_west', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '짜장 곧은 길',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 3) * TILE, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'left'},
            'before_pause': {'x': 21 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0]], [WIDTH - 2, ROAD_ROWS[0]]],
            'role': '굽이 길 → 오른쪽으로 쭉 → 검은 소나무 숲. 중간(25~26열)에서 청소부 “천천히 걷기” 연출(jjajang_walk_pause). 브금 my_castle_town 이어짐',
            'pause': list(PAUSE_COLS),
        },
        'entities': [*pines, pause, door_west, door_east],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_walk.py [--check]')
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
