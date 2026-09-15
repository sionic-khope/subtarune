#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle12.py [--check]
# ──────────────────
"""무대 뒷편 대기실(2026-09-15 사용자: “계단으로 올라가면 무대 뒷편 대기실 같은 가로로 적당히 짧은 맵, 오른쪽 끝에 뚜울라”).
무대 홀(youngcle11) 양쪽 계단 꼭대기 문에서 들어오고(왼쪽), 오른쪽 끝의 뚜울라에게 말을 걸면 리듬 게임 연출(`backstage_ttuulla`)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle12'
WIDTH: Final = 20
HEIGHT: Final = 12


def main() -> None:
    """Write the backstage room or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
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
        'id': MAP_ID, 'name': '엄청 대박인 배 무대 뒷편 대기실', 'stage': 'void_fallen',
        'bgm': None, 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.18,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png',
                    'assets/props/editor-union-control.png', 'assets/props/editor-union-speaker.png',
                    'assets/props/editor-union-wall-panel.png', 'assets/sprites/ttuulla.png'],
        'spawns': {
            'start': {'x': 72, 'y': 172, 'facing': 'right'},
            # 홀 계단 꼭대기 문에서 들어올 때(왼쪽 끝)
            'from_stairs': {'x': 72, 'y': 172, 'facing': 'right'},
        },
        'meta': {'connected': True, 'route': [[2, 5], [17, 5]]},
        'entities': [
            # 왼쪽 끝 → 무대 홀(왼쪽 계단 아래). 열린 통로라 C 없이 방향키로 통과
            {'type': 'door', 'id': 'youngcle12_left', 'x': 32, 'y': 128, 'w': 16, 'h': 128,
             'to': 'youngcle11', 'spawn': 'from_backstage', 'sfx': False, 'interact': False},
            # 벽 패널·믹서·스피커(대기실 느낌)
            *[{'type': 'prop', 'id': f'backstage_wall_{index}', 'image': 'assets/props/editor-union-wall-panel.png',
               'x': x, 'y': 32, 'w': 128, 'h': 76, 'solid': False, 'sortY': -980}
              for index, x in enumerate((96, 352))],
            {'type': 'prop', 'id': 'backstage_control', 'image': 'assets/props/editor-union-control.png',
             'x': 240, 'y': 116, 'w': 96, 'h': 52, 'solid': True, 'sortY': -900},
            {'type': 'prop', 'id': 'backstage_speaker', 'image': 'assets/props/editor-union-speaker.png',
             'x': 448, 'y': 72, 'w': 64, 'h': 88, 'solid': True, 'sortY': -900},
            # 오른쪽 끝의 뚜울라: 말을 걸면 리듬 게임 연출
            {'type': 'npc', 'id': 'ttuulla_back', 'sprite': 'ttuulla', 'x': 544, 'y': 172, 'facing': 'left', 'wander': 0,
             'visualScale': 1.79, 'solid': True, 'script': 'backstage_ttuulla'},
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
