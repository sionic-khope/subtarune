#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_forest.py [--check]
# ──────────────────
"""짜장숲(jjajang_forest, BUILD225 사용자 “초록숲0 맵 브금을 쓰며 짜장맵 타일이 가운데로 이어져서 세로로 살짝 긴 맵 하나”):
해안(jjajang_shore) 위 숲 입구에서 이어지는 세로 통로. 짜장섬 타일 그대로(검은 숲 '@', 검은 길 '%', 나무 소품 3종 ×2 배율), 브금은 옵젝영역0(초록숲0)의 'wind'.
아래 가장자리 = 해안으로 돌아가는 문, 위 가장자리 = 다음 맵 자리(통로만 열어 두고 문·소품·대사는 두지 않는다 — 브리핑 대기). 내용은 다음 브리핑에서 채운다."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_forest'
WIDTH: Final = 20
HEIGHT: Final = 44
TILE: Final = 32
PATH_LEFT: Final = 9
PATH_RIGHT: Final = 10


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
    for row in range(HEIGHT):
        for col in range(PATH_LEFT, PATH_RIGHT + 1):
            rows[row][col] = '%'
    for col in range(PATH_LEFT, PATH_RIGHT + 1):
        rows[0][col] = '&'
        rows[HEIGHT - 1][col] = '&'
    # 나무: 길(9~10열) 양옆으로 해안과 같은 밀도, 3행 간격으로 엇갈리게 — 나무 그림은 64px 폭이라 7열/12열까지만
    tree_cells: list[tuple[int, int]] = []
    for row in range(1, HEIGHT - 1, 3):
        offset = (row // 3) % 2
        for col in (0 + offset, 2 + offset, 4 + offset, 6 + (1 - offset), 12 + offset, 14 + (1 - offset), 16 + offset, 18 - offset):
            if 0 <= col < WIDTH and col not in (8, 9, 10, 11):
                tree_cells.append((col, row))
    trees = [tree(f'jjajang_tree_{index + 1}', col, row, index % 3 + 1) for index, (col, row) in enumerate(tree_cells)]
    door_back = {
        'type': 'door', 'id': 'forest_shore_door', 'x': PATH_LEFT * TILE, 'y': HEIGHT * TILE - 10, 'w': 2 * TILE, 'h': 10,
        'to': 'jjajang_shore', 'spawn': 'forest_top', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '짜장숲',
        'stage': 'ship_sinking_done',
        'bgm': 'wind',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_shore': {'x': 10 * TILE - 8, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'start': {'x': 10 * TILE - 8, 'y': (HEIGHT - 3) * TILE + 12, 'facing': 'up'},
            'from_north': {'x': 10 * TILE - 8, 'y': 1 * TILE + 16, 'facing': 'down'},
        },
        'meta': {
            'connected': True,
            'route': [[10, HEIGHT - 3], [10, 1]],
            'role': '짜장숲 세로 통로(초록숲0 브금 wind); 위쪽 다음 맵은 브리핑 대기 — 통로만 열림',
        },
        'entities': [*trees, door_back],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_forest.py [--check]')
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
