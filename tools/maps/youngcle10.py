#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle10.py [--check]
# ──────────────────
"""편집노조 무대(youngcle7) 위 통로 꼭대기에서 올라오는 윗길(2026-09-15 사용자: “스테이지 위로 갔을 때 마나샘 있는 윗길 맵”).
아래 가운데 입구에서 올라와 가로로 긴 철제 통로를 만나고, 통로 위쪽 주머니에 마나샘이 하나 있다. 양 끝은 아직 어디로도 이어지지 않는다(다음 브리핑)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle10'
WIDTH: Final = 24
HEIGHT: Final = 17


def main() -> None:
    """Write the upper corridor or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 가로 통로 rows 5~8, 아래 가운데에서 올라오는 세로 통로 cols 10~13 rows 9~15(row 15 에 무대로 내려가는 문, 맨 아랫줄 16 은 벽)
    for row in range(5, 9):
        for col in range(1, WIDTH - 1):
            cells[row][col] = 'I'
    for row in range(9, HEIGHT - 1):
        for col in range(10, 14):
            cells[row][col] = 'I'
    # 마나샘 주머니: 통로 위쪽으로 두 칸 들어간 작은 공간(오른쪽)
    for row in range(3, 5):
        for col in range(15, 19):
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
        'id': MAP_ID, 'name': '엄청 대박인 배 무대 위 윗길', 'stage': 'void_fallen',
        'bgm': None, 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.08,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png',
                    'assets/props/blue_buff.png'],
        'spawns': {
            'start': {'x': 368, 'y': 440, 'facing': 'up'},
            # 무대 위 통로 꼭대기 문에서 올라올 때(세로 통로 아래쪽)
            'from_stage': {'x': 368, 'y': 440, 'facing': 'up'},
        },
        'meta': {'connected': True, 'route': [[11, 14], [11, 6], [2, 6], [22, 6]]},
        'entities': [
            # 세로 통로 맨 아래 → 무대 위 통로 꼭대기(from_upper). 열린 통로라 C 없이 방향키로 통과
            {'type': 'door', 'id': 'youngcle10_down', 'x': 320, 'y': 496, 'w': 128, 'h': 16,
             'to': 'youngcle7', 'spawn': 'from_upper', 'sfx': False, 'interact': False},
            *[{'type': 'factory_rail', 'id': f'youngcle10_rail_{index}',
               'x': x, 'y': y, 'w': width, 'h': 12}
              for index, (x, y, width) in enumerate((
                  (32, 288, 704), (32, 148, 416), (608, 148, 128), (480, 84, 128),
              ))],
            # 마나샘(연결로 youngcle8 과 같은 파란 샘): C 로 파티 HP 가득
            {'type': 'prop', 'id': 'youngcle10_spring', 'image': 'assets/props/blue_buff.png',
             'anim': {'cols': 3, 'fps': 4}, 'x': 528, 'y': 148, 'w': 32, 'h': 12,
             'ix': 524, 'iy': 116, 'solid': True, 'script': 'maillard_spring'},
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
