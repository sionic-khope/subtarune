#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle13.py [--check]
# ──────────────────
"""무대 홀(youngcle11) 무대 오른쪽에서 뚫리는 복도(BUILD185, 사용자 2026-09-15: “자 저기 오른쪽 문이 있을겁니다 … 저기로 쭉 따라가시면 영클형을 만날 수 있을겁니다”).
왼쪽에서 들어와 오른쪽으로 쭉 가는 어두운 철제 복도. 오른쪽 끝은 다음 브리핑(영클형)까지 잠긴 문."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle13'
WIDTH: Final = 24
HEIGHT: Final = 12


def main() -> None:
    """Write the stage-right corridor or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 가로 복도 rows 4~7, cols 1~22
    for row in range(4, 8):
        for col in range(1, WIDTH - 1):
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
        'id': MAP_ID, 'name': '무대 오른쪽 복도', 'stage': 'void_fallen',
        'bgm': None, 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/props/editor-union-wall-panel.png'],
        'spawns': {
            'left': {'x': 56, 'y': 176, 'facing': 'right'},
        },
        'meta': {'connected': True, 'route': [[2, 5], [21, 5]]},
        'entities': [
            # 왼쪽 끝 → 무대 홀(from_right). 열린 통로라 방향키로 통과
            {'type': 'door', 'id': 'youngcle13_left', 'x': 32, 'y': 128, 'w': 16, 'h': 128,
             'to': 'youngcle11', 'spawn': 'from_right', 'sfx': False, 'interact': False},
            *[{'type': 'prop', 'id': f'corridor13_wall_{index}', 'image': 'assets/props/editor-union-wall-panel.png',
               'x': x, 'y': 52, 'w': 128, 'h': 76, 'solid': False, 'sortY': -980}
              for index, x in enumerate((64, 320, 576))],
            # 오른쪽 끝: 다음 지역(영클형)은 다음 브리핑
            {'type': 'sign', 'id': 'corridor13_end', 'x': 720, 'y': 144, 'w': 16, 'h': 96, 'solid': True,
             'text': '* 굳게 잠긴 철문.\n* 안쪽에서 낮은 기계음이 들린다.'},
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
