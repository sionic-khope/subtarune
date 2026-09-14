#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle9.py [--check]
# ──────────────────
"""따듯한비데의 게임 스크린 방 (2026-09-15 사용자 브리핑): 넓은 철판 방 한가운데 키오스크형 컨트롤러와 그 옆의 비데,
키오스크 옆 벽의 정사각형 거대 게임 스크린, 오른쪽의 마리오풍 토관. 입장 연출은 `bidet_arcade`."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle9'
WIDTH: Final = 36
HEIGHT: Final = 24
DONE: Final = 'bidet_arcade_done'


def main() -> None:
    """Write the arcade room or check its generator output and map registration."""
    cells = [['J'] * WIDTH for _ in range(HEIGHT)]
    # 바닥: 위 벽(스크린이 걸리는 벽) 아래로 넓은 직사각형, 왼쪽 문 통로는 rows 11~14
    for row in range(3, 21):
        for col in range(3, WIDTH - 3):
            cells[row][col] = 'I'
    for row in range(11, 15):
        for col in range(1, 3):
            cells[row][col] = 'I'
    map_data = {
        'id': MAP_ID, 'name': '엄청 대박인 배 게임 스크린 방', 'stage': 'void_fallen',
        'bgm': 'youngcle_factory', 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.08,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png',
                    'assets/props/bidet_screen.png', 'assets/props/bidet_kiosk.png',
                    'assets/props/mario_pipe.png', 'assets/props/editor-union-mushroom.png',
                    'assets/props/editor-union-mushroom-green.png'],
        'enter': {'script': 'bidet_arcade', 'early': True},
        'spawns': {
            'start': {'x': 48, 'y': 400, 'facing': 'right'},
            'left': {'x': 48, 'y': 400, 'facing': 'right'},
            # 연출 뒤 재입장·QA: 방 안쪽
            'inside': {'x': 320, 'y': 424, 'facing': 'right'},
        },
        'meta': {'connected': True, 'screen': [448, 96, 256, 256], 'kiosk': [400, 352, 64, 96],
                 'pipe': [736, 352, 64, 64], 'bidet': [488, 300]},
        'entities': [
            {'type': 'door', 'id': 'youngcle9_left', 'x': 32, 'y': 352, 'w': 16, 'h': 128,
             'to': 'youngcle8', 'spawn': 'right', 'sfx': False, 'interact': False},
            # 위 벽에 걸린 거대 게임 스크린(256×256). 그림은 벽 위(sortY 뒤), 조사는 아래 띠에서
            {'type': 'prop', 'id': 'bidet_screen', 'image': 'assets/props/bidet_screen.png',
             'x': 448, 'y': 340, 'w': 256, 'h': 12, 'ix': 448, 'iy': 96, 'solid': True, 'sortY': -900,
             'script': 'bidet_screen_look'},
            # 키오스크 컨트롤러(64×96)와 그 오른쪽의 비데
            {'type': 'prop', 'id': 'bidet_kiosk', 'image': 'assets/props/bidet_kiosk.png',
             'x': 404, 'y': 432, 'w': 56, 'h': 16, 'ix': 400, 'iy': 352, 'solid': True,
             'script': 'bidet_kiosk_look'},
            {'type': 'npc', 'id': 'warm_bidet', 'sprite': 'warm_bidet', 'x': 488, 'y': 420,
             'facing': 'down', 'wander': 0, 'solid': True, 'unless': DONE},
            # 마리오풍 토관(64×64): 비데가 들어가는 입구. 도트마리오는 토관 안에 숨어 있다가 연출에서 나온다
            {'type': 'prop', 'id': 'bidet_pipe', 'image': 'assets/props/mario_pipe.png',
             'x': 740, 'y': 400, 'w': 56, 'h': 16, 'ix': 736, 'iy': 352, 'solid': True,
             'script': 'bidet_pipe_enter'},
            # 토관 그림 위쪽(충돌 띠 y400 위)에 숨어 있다가 연출에서 튀어나온다 — 걸어서 닿는 자리여야 연결 검사를 통과한다
            {'type': 'npc', 'id': 'mini_mario', 'sprite': 'mini_mario', 'x': 756, 'y': 372,
             'facing': 'left', 'wander': 0, 'solid': False, 'hidden': True, 'unless': DONE},
            *[{'type': 'factory_rail', 'id': f'youngcle9_rail_{index}',
               'x': x, 'y': y, 'w': width, 'h': 12}
              for index, (x, y, width) in enumerate(((96, 84, 960), (96, 672, 960)))],
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
