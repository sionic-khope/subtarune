#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle17.py [--check]
# ──────────────────
"""용광로 마나샘 갈림길(BUILD196, 사용자: “오른쪽으로 잠깐 갔다가 가운데 길로 올라가는 길 있는 맵 하나 + 마나샘”).
검사실 2(youngcle16) 오른쪽 통로에서 왼쪽 아래로 들어와 오른쪽으로 잠깐 → 가운데 세로 통로로 위로 → 위 출입구(youngcle18 광장). 세로 통로 오른쪽에 마나샘 주머니.
출입구는 가장자리 칸 H(걷는 바닥)까지 이어지고 문 트리거는 맵 끝 10px."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle17'
WIDTH: Final = 22
HEIGHT: Final = 18
T: Final = 32


def main() -> None:
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 아래 복도 rows 12~14 · cols 0~11(왼쪽 가장자리까지) → 가운데 세로 통로 cols 9~11 · rows 0~14(위 가장자리까지)
    for row in range(12, 15):
        for col in range(0, 12):
            cells[row][col] = 'F'
    for row in range(0, 15):
        for col in range(9, 12):
            cells[row][col] = 'F'
    # 마나샘 주머니: 세로 통로 오른쪽 rows 6~7 · cols 12~15
    for row in range(6, 8):
        for col in range(12, 16):
            cells[row][col] = 'F'
    for row in range(12, 15): cells[row][0] = 'H'
    for col in range(9, 12): cells[0][col] = 'H'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] not in ('F', 'H'):
                continue
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    r, c = row + dr, col + dc
                    if 0 <= r < HEIGHT and 0 <= c < WIDTH and cells[r][c] == '!':
                        cells[r][c] = 'G'
    map_data = {
        'id': MAP_ID, 'name': '용광로 마나샘 갈림길', 'stage': 'void_fallen',
        'bgm': 'pandora_palace', 'backdrop': 'youngcle_furnace',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(r) for r in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/tiles/youngcle_iron_blue_solid.png',
                    'assets/backdrops/youngcle_furnace.png', 'assets/props/blue_buff.png'],
        'spawns': {
            'left': {'x': 56, 'y': 416, 'facing': 'right'},
            'top': {'x': 324, 'y': 56, 'facing': 'down'},
        },
        'meta': {'connected': True, 'route': [[1, 13], [10, 13], [10, 1]]},
        'entities': [
            {'type': 'door', 'id': 'youngcle17_left', 'x': 0, 'y': 12 * T, 'w': 10, 'h': 96,
             'to': 'youngcle16', 'spawn': 'landing', 'sfx': False, 'interact': False},
            {'type': 'door', 'id': 'youngcle17_top', 'x': 9 * T, 'y': 0, 'w': 96, 'h': 10,
             'to': 'youngcle18', 'spawn': 'bottom', 'sfx': False, 'interact': False},
            # 마나샘(윗길 youngcle10 과 같은 파란 샘): C 로 파티 HP 가득
            {'type': 'prop', 'id': 'youngcle17_spring', 'image': 'assets/props/blue_buff.png',
             'anim': {'cols': 3, 'fps': 4}, 'x': 14 * T + 8, 'y': 6 * T + 20, 'w': 32, 'h': 12,
             'ix': 14 * T + 4, 'iy': 6 * T - 12, 'solid': True, 'script': 'maillard_spring'},
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
