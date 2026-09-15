#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle9.py [--check]
# ──────────────────
"""따듯한비데의 게임 스크린 방 (2026-09-15 사용자 브리핑, BUILD167 재배치): 왼쪽에 키오스크형 컨트롤러와 그 오른쪽의 비데,
컨트롤러 아래에 왼쪽 입구가 열린 눕힌 토관, 토관이 오른쪽으로 이어지는 거대한 2D 스크린(576×480, 흰 테두리·검은 화면)이 방 오른쪽을 차지한다.
토관 입구 앞에서 C 를 누르면 '들어갈까?' 선택 뒤 섭리오로 간다. 입장 연출은 `bidet_arcade`. 브금은 연출 전엔 없고 연출부터 `editor_union_stage`."""
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
        'bgm': None, 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.08,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png',
                    'assets/props/bidet_screen_big.png', 'assets/props/bidet_kiosk.png',
                    'assets/props/mario_pipe_h.png', 'assets/props/editor-union-mushroom.png',
                    'assets/props/editor-union-mushroom-green.png'],
        'enter': {'script': 'bidet_arcade', 'early': True},
        'spawns': {
            'start': {'x': 48, 'y': 400, 'facing': 'right'},
            'left': {'x': 48, 'y': 400, 'facing': 'right'},
            # 연출 뒤 재입장·QA: 키오스크 왼쪽 앞
            'inside': {'x': 240, 'y': 500, 'facing': 'right'},
        },
        'meta': {'connected': True, 'screen': [528, 80, 576, 480], 'kiosk': [368, 408, 64, 96],
                 'pipe': [352, 520, 192, 64], 'pipe_mouth': [352, 528, 24, 56], 'bidet': [480, 500]},
        'entities': [
            {'type': 'door', 'id': 'youngcle9_left', 'x': 32, 'y': 352, 'w': 16, 'h': 128,
             'to': 'youngcle8', 'spawn': 'right', 'sfx': False, 'interact': False},
            # 방 오른쪽을 차지하는 거대 2D 스크린(576×480, 흰 테두리·검은 화면). 그림은 뒤(sortY), 몸은 통째로 막힘
            {'type': 'prop', 'id': 'bidet_screen', 'image': 'assets/props/bidet_screen_big.png',
             'x': 528, 'y': 96, 'w': 576, 'h': 464, 'ix': 528, 'iy': 80, 'solid': True, 'sortY': -900,
             'script': 'bidet_screen_look'},
            # 키오스크 컨트롤러(64×96)와 그 오른쪽의 비데
            {'type': 'prop', 'id': 'bidet_kiosk', 'image': 'assets/props/bidet_kiosk.png',
             'x': 372, 'y': 488, 'w': 56, 'h': 16, 'ix': 368, 'iy': 408, 'solid': True,
             'script': 'bidet_kiosk_look'},
            {'type': 'npc', 'id': 'warm_bidet', 'sprite': 'warm_bidet', 'x': 480, 'y': 500,
             'facing': 'down', 'wander': 0, 'solid': True, 'unless': DONE},
            # 컨트롤러 아래에 눕힌 토관(192×64): 왼쪽 입구가 열려 있고 오른쪽 끝이 스크린 안으로 들어간다. 그림은 스크린보다 앞
            # 몸(막힘·C 히트박스)은 입구 안쪽 x376 부터 — 입구 그림 x352~376 은 연출·진입에서 걸어 들어가는 자리.
            # 입구 앞에서 C → 연출 뒤엔 '들어갈까?' 선택 → 섭리오 / 그 전엔 토관 설명 (사용자 지시 2026-09-15: 상호작용해야 들어감)
            {'type': 'prop', 'id': 'bidet_pipe', 'image': 'assets/props/mario_pipe_h.png',
             'x': 376, 'y': 528, 'w': 168, 'h': 56, 'ix': 352, 'iy': 520, 'solid': True, 'sortY': 600,
             'script': 'bidet_pipe_enter'},
            # 토관 입구 안에 숨어 있다가 연출에서 튀어나온다 — 걸어서 닿는 자리(입구 앞)여야 연결 검사를 통과한다
            {'type': 'npc', 'id': 'mini_mario', 'sprite': 'mini_mario', 'x': 336, 'y': 580,
             'facing': 'left', 'wander': 0, 'solid': False, 'hidden': True, 'unless': DONE},
            *[{'type': 'factory_rail', 'id': f'youngcle9_rail_{index}',
               'x': x, 'y': y, 'w': width, 'h': 12}
              for index, (x, y, width) in enumerate(((96, 84, 400), (96, 672, 960)))],
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
