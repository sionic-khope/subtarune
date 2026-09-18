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
# 숲 문 높이: 입구 그림자의 불투명 구간(0~223px) 안쪽. 숲에서 돌아오는 스폰은 이 아래(문과 겹치지 않게)
SHADE_DOOR_H: Final = 7 * 32 - 8
# 돌아오는 스폰은 그림자 그라데이션의 옅은 쪽(y 320): 검은 구간 바로 아래(232)는 그늘에 잠겨 안 보였다
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
    # 길은 숲 입구(7행)에서 위 가장자리(0행)까지 이어진다(BUILD225: 위쪽 짜장숲으로 이동) — 0~6행은 입구 그림자에 완전히 잠긴다
    for row in range(0, BEACH_TOP_ROW):
        for col in range(PATH_LEFT, PATH_RIGHT + 1):
            rows[row][col] = '%'
    for col in range(PATH_LEFT, PATH_RIGHT + 1):
        rows[0][col] = '&'   # 가장자리 출입구 칸(맵 스킬: 걷는 출입구 타일)
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
        # 길 위쪽(0~6행)이 열리면서 8·10열 나무는 7·12열로(히트박스가 길을 침범하지 않게, BUILD225)
        (0, 1), (2, 2), (4, 1), (6, 2), (7, 1), (12, 2), (12, 1), (14, 2), (16, 1), (18, 2),
        (0, 4), (2, 5), (4, 4), (6, 5), (7, 4), (12, 5), (12, 4), (14, 5), (16, 4), (18, 5),
    ]
    # 숲 입구 그림자(2026-09-18 사용자 “위에 뭔가 그림자 진 입구처럼”): 길 위쪽 7~11행 위에 위로 갈수록 검게 잠기는 그라데이션 아치. 걷는 칸을 막지 않고(solid False) 캐릭터 위에 그려져 요플래가 위로 갈수록 그늘에 잠긴다
    entrance_shade = {
        'type': 'prop', 'id': 'jjajang_forest_entrance_shade', 'image': 'assets/props/jjajang_entrance_shade.png',
        'x': PATH_LEFT * TILE - 16, 'y': 0, 'w': 0, 'h': 0,
        'ix': PATH_LEFT * TILE - 16, 'iy': 0, 'solid': False, 'sortY': 1000000000,
    }
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
    # 위 가장자리 10px 를 밟으면 짜장숲(jjajang_forest)으로(맵 스킬: 가장자리 칸의 맵 끝 쪽 10px)
    # 숲 문은 그림자의 완전히 검은 구간(0~223px) 전체를 덮는다(2026-09-18 사용자 “여기서 다음 짜장맵 가져야 되는 거 아니냐”):
    # 그늘에 발을 들이는 순간 짜장숲으로 넘어가고, 캄캄한 구간을 200px 더 걷지 않는다
    forest_door = {'type': 'door', 'id': 'shore_forest_door', 'x': PATH_LEFT * TILE, 'y': 0, 'w': 2 * TILE, 'h': SHADE_DOOR_H, 'to': 'jjajang_forest', 'spawn': 'from_shore', 'sfx': False}
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
            'forest_top': {'x': 10 * TILE - 8, 'y': SHADE_DOOR_H + 104, 'facing': 'down'},
        },
        'enter': {'script': 'jjajang_shore_arrival', 'early': True},
        'meta': {
            'connected': True,
            'route': [[10, 28], [10, 1]],
            'forestEntranceRow': FOREST_EDGE_ROW,
            'seaRows': [min(COASTLINE_ROWS), HEIGHT - 1],
            'coastlineRows': list(COASTLINE_ROWS),
            'role': '요플래 단독 해안 도착; 위쪽 그림자 입구 → 짜장숲(jjajang_forest)',
        },
        'entities': [*trees, *foam, entrance_shade, forest_door],
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
