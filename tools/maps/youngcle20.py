#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle20.py [--check]
# ──────────────────
"""엄청대박인배 조종실(BUILD201, 사용자 브리핑 “디지털하고 조종실 섹션, 인테리어, 적당히 넓으나 가운데에 조종실 느낌 기계·컴퓨터·조작 장치가 쫙 깔려 있는 과학 느낌, TV 도 있고 사이드에도”).
30×18 실내(영클 철판 바닥 F·벽 G). 앞 벽 가운데 대형 화면 + 그 아래 조타 콘솔, 양옆 서버 랙 셋씩. 가운데 통로 한복판에 홀로그램 탁자,
좌우에 콘솔 두 줄(2×2), 바닥 유도등. 왼쪽 아래 반응로, 오른쪽 아래 과학 TV. 영클은 비행 장치(youngcle_hover)를 타고 통로를 순찰(patrol)한다 — 대사는 다음 브리핑.
아래 가운데 출입구(cols 13~16, 가장자리 H) → 다리길(youngcle19)의 철문 앞. 그림: tools/art/ship_control_set.py."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle20'
WIDTH: Final = 30
HEIGHT: Final = 18
T: Final = 32
DOOR_C0: Final = 13                                   # 아래 출입구 cols 13~16(x416~544, 가운데 480)
SPAWN_X: Final = WIDTH * T // 2 - 12                  # 24px 발판이 가운데(480)에 오게 → 468


def prop(id_: str, image: str, x: int, y: int, w: int, h: int, iy: int, **extra) -> dict:
    """그림 (x, iy) 에 두고 히트박스는 그림 아래쪽 (x, y, w, h)"""
    return {'type': 'prop', 'id': id_, 'image': image, 'x': x, 'y': y, 'w': w, 'h': h, 'ix': x, 'iy': iy, 'solid': True, **extra}


def main() -> None:
    cells = [['G'] * WIDTH for _ in range(HEIGHT)]
    for row in range(2, HEIGHT - 1):
        for col in range(1, WIDTH - 1):
            cells[row][col] = 'F'
    for col in range(DOOR_C0, DOOR_C0 + 4):
        cells[HEIGHT - 1][col] = 'H'
    P = 'assets/props/'
    entities = [
        {'type': 'door', 'id': 'youngcle20_bottom', 'x': DOOR_C0 * T, 'y': HEIGHT * T - 10, 'w': 128, 'h': 10,
         'to': 'youngcle19', 'spawn': 'gate', 'sfx': False, 'interact': False},
        # 앞 벽: 대형 화면(레이더, 3프레임) — 벽걸이 장식, 그 아래 조타 콘솔(히트박스 통째)
        {'type': 'prop', 'id': 'ship_main_screen', 'image': P + 'ship_main_screen.png', 'x': 352, 'y': 62, 'w': 256, 'h': 2, 'ix': 352, 'iy': 0, 'solid': False, 'sortY': -900, 'anim': {'cols': 3, 'fps': 4}},
        prop('ship_helm', P + 'ship_helm.png', 336, 66, 288, 56, 66),
        # 서버 랙 셋씩(앞 벽 양옆, LED 2프레임)
        *[prop(f'ship_rack_{i}', P + 'ship_server_rack.png', x, 64, 48, 24, 0, anim={'cols': 2, 'fps': 3}) for i, x in enumerate((64, 112, 160, 752, 800, 848))],
        # 가운데 홀로그램 탁자(전함 실루엣 3프레임): 탁자 몸통만 막는다
        prop('ship_holo', P + 'ship_holo_table.png', 432, 294, 96, 28, 250, anim={'cols': 3, 'fps': 5}),
        # 좌우 콘솔 두 줄(2×2)
        *[prop(f'ship_console_{i}', P + 'ship_console.png', x, y + 24, 128, 24, y)
          for i, (x, y) in enumerate([(96, 180), (224, 180), (608, 180), (736, 180), (96, 340), (224, 340), (608, 340), (736, 340)])],
        # 바닥 유도등(장식, 히트박스 윗변 2px)
        *[{'type': 'prop', 'id': f'ship_strip_{i}', 'image': P + 'ship_floor_strip_v.png', 'x': x, 'y': y, 'w': 8, 'h': 2, 'ix': x, 'iy': y, 'solid': False}
          for i, (x, y) in enumerate([(372, 130), (596, 130), (372, 400), (596, 400)])],
        # 사이드: 왼쪽 아래 반응로(핵 맥동 2프레임), 오른쪽 아래 과학 TV(색 띠 ↔ 지직 2프레임)
        prop('ship_reactor', P + 'ship_reactor.png', 32, 496, 96, 24, 400, anim={'cols': 2, 'fps': 2}),
        prop('ship_tv', P + 'ship_tv.png', 848, 488, 80, 24, 440, anim={'cols': 2, 'fps': 6}),
        # 영클: 비행 장치를 타고 통로·콘솔 사이를 돈다(충돌 없음, 대사 없음 — 다음 브리핑)
        {'type': 'npc', 'id': 'ship_youngcle', 'sprite': 'youngcle_hover', 'x': 372, 'y': 150, 'facing': 'right', 'wander': 0, 'solid': False, 'speed': 70,
         'patrol': [[372, 150], [572, 150], [700, 280], [572, 420], [372, 420], [240, 280]]},
    ]
    map_data = {
        'id': MAP_ID, 'name': '엄청대박인배 조종실', 'stage': 'void_fallen',
        'bgm': 'pandora_palace', 'battleBg': 'youngcle_factory', 'dim': 0.12,
        'rows': [''.join(r) for r in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/tiles/youngcle_iron_blue_solid.png', 'assets/sprites/youngcle_hover.png'],
        'spawns': {
            'gate': {'x': SPAWN_X, 'y': 15 * T + 8, 'facing': 'up'},
        },
        'meta': {'connected': True, 'route': [[DOOR_C0 + 1, 15], [DOOR_C0 + 1, 4]]},
        'entities': entities,
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
