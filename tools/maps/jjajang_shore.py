#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'jjajang_shore'
WIDTH: Final = 20
HEIGHT: Final = 35
TILE: Final = 32
PATH_LEFT: Final = 9
PATH_RIGHT: Final = 10
FOREST_EDGE_ROW: Final = 7
BEACH_TOP_ROW: Final = 25
SEA_TOP_ROW: Final = 30
COASTLINE_ROWS: Final = (30, 30, 29, 29, 30, 30, 31, 30, 30, 30, 30, 30, 30, 31, 30, 29, 29, 30, 30, 30)


def tree(tree_id: str, col: int, row: int, variant: int) -> dict[str, object]:
    return {
        'type': 'prop',
        'id': tree_id,
        'image': f'assets/props/jjajang_tree_{variant}.png',
        'scale': 2,
        'x': col * TILE + 23,
        'y': row * TILE + 118,
        'w': 18,
        'h': 10,
        'ix': col * TILE,
        'iy': row * TILE,
        'solid': True,
    }


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in range(FOREST_EDGE_ROW, BEACH_TOP_ROW):
        for col in range(PATH_LEFT, PATH_RIGHT + 1):
            rows[row][col] = '%'
    for col, coast_row in enumerate(COASTLINE_ROWS):
        if 0 < col < WIDTH - 1:
            for row in range(BEACH_TOP_ROW, coast_row):
                rows[row][col] = '?'
        for row in range(coast_row, HEIGHT):
            rows[row][col] = 'o' if (row + col) % 2 else 'O'

    tree_cells = [
        (1, 6), (3, 7), (5, 6), (7, 7), (12, 7), (14, 6), (16, 7), (18, 6),
        (2, 9), (5, 10), (7, 9), (12, 9), (14, 10), (17, 9),
        (3, 12), (6, 13), (13, 13), (16, 12),
        (2, 15), (7, 16), (12, 16), (17, 15),
        (4, 19), (7, 20), (12, 20), (15, 19),
        (2, 23), (6, 23), (13, 23), (17, 23),
        (0, 1), (2, 2), (4, 1), (6, 2), (8, 1), (10, 2), (12, 1), (14, 2), (16, 1), (18, 2),
        (0, 4), (2, 5), (4, 4), (6, 5), (8, 4), (10, 5), (12, 4), (14, 5), (16, 4), (18, 5),
    ]
    trees = [tree(f'jjajang_tree_{index + 1}', col, row, index % 3 + 1)
             for index, (col, row) in enumerate(tree_cells)]
    wave_cells = [(1, 0), (2, 0), (6, 1), (7, 1), (11, 0), (12, 0), (16, 1), (17, 1)]
    foam = [{
        'type': 'prop',
        'id': f'shore_foam_{index + 1}',
        'image': 'assets/props/subrio_water.png',
        'scale': 2,
        'x': col * TILE + 2,
        'y': (COASTLINE_ROWS[col] + row_offset) * TILE + 6,
        'w': 28,
        'h': 8,
        'ix': col * TILE + 2,
        'iy': (COASTLINE_ROWS[col] + row_offset) * TILE - 2,
        'solid': False,
        'oscillate': {'dx': 3, 'dy': 1, 'period': 1.8 + index % 3 * 0.25, 'phase': (index % 4) * 0.17},
    } for index, (col, row_offset) in enumerate(wave_cells)]
    return {
        'id': MAP_ID,
        'name': '짜장섬 해안',
        'stage': 'ship_sinking_done',
        'bgm': 'jjajang_shore',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'washed_up': {'x': 10 * TILE - 8, 'y': 28 * TILE + 12, 'facing': 'up'},
            'start': {'x': 10 * TILE - 8, 'y': 28 * TILE + 12, 'facing': 'up'},
        },
        'enter': {'script': 'jjajang_shore_arrival', 'early': True},
        'meta': {
            'connected': True,
            'route': [[10, 28], [10, 7]],
            'forestEntranceRow': FOREST_EDGE_ROW,
            'seaRows': [min(COASTLINE_ROWS), HEIGHT - 1],
            'coastlineRows': list(COASTLINE_ROWS),
            'role': '요플래 단독 해안 도착과 짜장숲 입구 예고; 다음 지역 이동 없음',
        },
        'entities': [*trees, *foam],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/jjajang_shore.py [--check]')
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
