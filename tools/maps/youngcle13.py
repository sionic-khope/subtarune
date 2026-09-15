#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle13.py [--check]
# ──────────────────
"""무대 홀(youngcle11) 무대 오른쪽에서 뚫려 이어지는 용광로 복도(BUILD189, 사용자 2026-09-15 경로: “오른쪽 갔다가 오른쪽 쭉 갔다 윗길 갔다 오른쪽 갔다 입구”).
배경은 엄청대박인배 파이프에 용광로·용암 기운(youngcle_furnace), 바닥·벽은 차콜 철 + 파란 기운(F/G). 브금 Pandora Palace(사용자 지정 q-5cXVcCOUs).
왼쪽 아래에서 들어와 오른쪽으로 쭉 → 세로 통로로 올라가 → 다시 오른쪽 → 오른쪽 끝 입구(youngcle14 용암 뗏목)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle13'
WIDTH: Final = 36
HEIGHT: Final = 16


def main() -> None:
    """Write the furnace corridor or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 아래 복도 rows 7~10 · cols 1~20 → 세로 통로 rows 2~10 · cols 17~20 → 위 복도 rows 2~5 · cols 17~34
    for row in range(7, 11):
        for col in range(1, 21):
            cells[row][col] = 'F'
    for row in range(2, 11):
        for col in range(17, 21):
            cells[row][col] = 'F'
    for row in range(2, 6):
        for col in range(17, WIDTH - 1):
            cells[row][col] = 'F'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] != 'F':
                continue
            for delta_row in (-1, 0, 1):
                for delta_col in (-1, 0, 1):
                    edge_row, edge_col = row + delta_row, col + delta_col
                    if (0 <= edge_row < HEIGHT and 0 <= edge_col < WIDTH
                            and cells[edge_row][edge_col] == '!'):
                        cells[edge_row][edge_col] = 'G'
    map_data = {
        'id': MAP_ID, 'name': '용광로 복도', 'stage': 'void_fallen',
        'bgm': 'pandora_palace', 'backdrop': 'youngcle_furnace',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/backdrops/youngcle_furnace.png'],
        'spawns': {
            'left': {'x': 56, 'y': 280, 'facing': 'right'},
            # 용암 뗏목 맵(youngcle14)에서 돌아올 때: 위 복도 오른쪽 끝
            'from_right': {'x': 1064, 'y': 120, 'facing': 'left'},
        },
        'meta': {'connected': True, 'route': [[2, 8], [18, 8], [18, 3], [33, 3]]},
        'entities': [
            # 왼쪽 끝 → 무대 홀(from_right). 열린 통로라 방향키로 통과
            {'type': 'door', 'id': 'youngcle13_left', 'x': 32, 'y': 224, 'w': 16, 'h': 128,
             'to': 'youngcle11', 'spawn': 'from_right', 'sfx': False, 'interact': False},
            # 위 복도 오른쪽 끝 → 용암 뗏목 방(입구)
            {'type': 'door', 'id': 'youngcle13_right', 'x': 1104, 'y': 64, 'w': 16, 'h': 128,
             'to': 'youngcle14', 'spawn': 'left', 'sfx': False, 'interact': False},
        ],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
