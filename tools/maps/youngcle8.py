#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle8.py [--check]
# ──────────────────
"""편집노조 무대 오른쪽 통로 → 비데 방 사이의 짧은 연결로. 오른쪽으로 곧게 이어지는 길 하나와 가운데 마나샘 하나(2026-09-15 사용자 브리핑)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle8'
WIDTH: Final = 26
HEIGHT: Final = 12


def main() -> None:
    """Write the corridor or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    for row in range(5, 8):
        for col in range(1, WIDTH - 1):
            cells[row][col] = 'I'
    # 마나샘 주머니: 길 위쪽으로 두 칸 들어간 작은 공간
    for row in range(3, 5):
        for col in range(11, 15):
            cells[row][col] = 'I'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] != 'I':
                continue
            for delta_row in (-1, 0, 1):
                for delta_col in (-1, 0, 1):
                    edge_row, edge_col = row + delta_row, col + delta_col
                    if (0 <= edge_row < HEIGHT and 0 <= edge_col < WIDTH
                            and cells[edge_row][edge_col] == '!'):
                        cells[edge_row][edge_col] = 'J'
    map_data = {
        'id': MAP_ID, 'name': '엄청 대박인 배 무대 뒤 연결로', 'stage': 'void_fallen',
        'bgm': 'youngcle_factory', 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.08,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png',
                    'assets/props/blue_buff.png'],
        'spawns': {
            'start': {'x': 80, 'y': 200, 'facing': 'right'},
            'left': {'x': 80, 'y': 200, 'facing': 'right'},
            'right': {'x': 752, 'y': 200, 'facing': 'left'},
        },
        'meta': {'connected': True, 'route': [[2, 6], [12, 6], [23, 6]]},
        'entities': [
            {'type': 'door', 'id': 'youngcle8_left', 'x': 32, 'y': 160, 'w': 16, 'h': 96,
             'to': 'youngcle7', 'spawn': 'from_corridor', 'sfx': False, 'interact': False},
            {'type': 'door', 'id': 'youngcle8_right', 'x': 784, 'y': 160, 'w': 16, 'h': 96,
             'to': 'youngcle9', 'spawn': 'left', 'sfx': False, 'interact': False},
            *[{'type': 'factory_rail', 'id': f'youngcle8_rail_{index}',
               'x': x, 'y': y, 'w': width, 'h': 12}
              for index, (x, y, width) in enumerate((
                  (32, 256, 768), (32, 148, 320), (480, 148, 320), (352, 84, 128),
              ))],
            {'type': 'prop', 'id': 'youngcle8_spring', 'image': 'assets/props/blue_buff.png',
             'anim': {'cols': 3, 'fps': 4}, 'x': 400, 'y': 148, 'w': 32, 'h': 12,
             'ix': 396, 'iy': 116, 'solid': True, 'script': 'maillard_spring'},
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
