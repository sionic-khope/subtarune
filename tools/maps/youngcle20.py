#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle20.py [--check]
# ──────────────────
"""엄청대박인배 조종실(BUILD201, 사용자 브리핑 “디지털하고 조종실 섹션, 인테리어, 적당히 넓으나 가운데에 조종실 느낌 기계·컴퓨터·조작 장치가 쫙 깔려 있는 과학 느낌, TV 도 있고 사이드에도”).
30×18 실내(영클 철판 바닥 F·벽 G). 앞 벽 가운데 대형 화면 + 그 아래 조타 콘솔, 양옆 서버 랙, 오른쪽 위 과학 TV. 화면 중앙 바닥에 영클 얼굴 강철 로고(연출 기준점),
왼쪽 위 홀로그램 탁자, 왼쪽 콘솔 2×2 + 오른쪽 아래 콘솔 둘, 바닥 유도등, 왼쪽 아래 반응로. 가운데·오른쪽은 입장 연출(BUILD202 ship_control_intro: 대포 → 쥰희·용준 날아감 → 영클 등장 → 철창·오방순·나람 → 전투 시작)을 위해 비운다.
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
LOGO_X, LOGO_Y = 416, 236                             # 바닥 강철 로고 128×128(가운데 480,300) — 연출 기준점
JUNHEE, YONGJUN = (486, 262), (436, 318)              # 입장 때 쥰희·용준이 서 있는 자리(로고 위, 앞을 봄). 대포 포탄 궤도는 왼쪽 콘솔 두 줄 사이(y228~340)를 지난다
CANNON = (-64, 246)                                   # 왼쪽 벽 속 대포(96×48) 대기 자리 → 연출이 +72 꺼낸다(포신 가운데 y270 = 쥰희 발 y262+8)
CAGE, CAGE_DROP = (600, 12), 412                      # 밧줄 철창 착지 자리(철창 밑 y372, 영클 오른쪽 뒤) · 천장 위에서 내려오는 거리
YC_ENTER, YC_STAND = (470, 236), (556, 300)          # 영클 첫 등장 자리(일행 앞) · 다시 내려와 서는 자리(로고 오른쪽, 왼쪽을 봄)


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
        # 서버 랙(앞 벽 양옆, LED 2프레임) + 오른쪽 위 과학 TV(색 띠 ↔ 지직 2프레임)
        *[prop(f'ship_rack_{i}', P + 'ship_server_rack.png', x, 64, 48, 24, 0, anim={'cols': 2, 'fps': 3}) for i, x in enumerate((64, 112, 160, 736, 784))],
        prop('ship_tv', P + 'ship_tv.png', 840, 138, 80, 24, 90, anim={'cols': 2, 'fps': 6}),
        # 화면 중앙 바닥: 영클 얼굴 양각 강철 로고(연출의 기준점, 걷는 장식) — 사용자 “화면 중앙엔 영클 얼굴로 박혀 있는 철 색깔 로고”
        {'type': 'prop', 'id': 'ship_logo', 'image': P + 'ship_floor_logo.png', 'x': LOGO_X, 'y': LOGO_Y, 'w': 128, 'h': 2, 'ix': LOGO_X, 'iy': LOGO_Y, 'solid': False},
        # 왼쪽 위 홀로그램 탁자(전함 실루엣 3프레임): 탁자 몸통만 막는다
        prop('ship_holo', P + 'ship_holo_table.png', 232, 144, 96, 28, 100, anim={'cols': 3, 'fps': 5}),
        # 왼쪽 콘솔 두 줄(2×2) + 오른쪽 아래 콘솔 둘 — 가운데·오른쪽은 연출(대포·철창 착지)을 위해 비워 둔다
        *[prop(f'ship_console_{i}', P + 'ship_console.png', x, y + 24, 128, 24, y)
          for i, (x, y) in enumerate([(64, 180), (192, 180), (64, 340), (192, 340), (672, 420), (800, 420)])],
        # 바닥 유도등(장식, 히트박스 윗변 2px)
        *[{'type': 'prop', 'id': f'ship_strip_{i}', 'image': P + 'ship_floor_strip_v.png', 'x': x, 'y': y, 'w': 8, 'h': 2, 'ix': x, 'iy': y, 'solid': False}
          for i, (x, y) in enumerate([(372, 130), (596, 130), (372, 400), (596, 400)])],
        # 왼쪽 아래 반응로(핵 맥동 2프레임)
        prop('ship_reactor', P + 'ship_reactor.png', 32, 496, 96, 24, 400, anim={'cols': 2, 'fps': 2}),
        # ── 입장 연출 배우(ship_control_intro 가 자리를 잡는다) ──
        # 쥰희·용준: 로고 위쪽에서 앞을 보고 서 있다(대포에 맞아 오른쪽 벽으로 날아간다)
        {'type': 'npc', 'id': 'ship_junhee', 'sprite': 'junhee', 'x': JUNHEE[0], 'y': JUNHEE[1], 'facing': 'up', 'wander': 0, 'solid': False},
        {'type': 'npc', 'id': 'ship_yongjun', 'sprite': 'yongjun', 'x': YONGJUN[0], 'y': YONGJUN[1], 'facing': 'up', 'wander': 0, 'solid': False},
        # 왼쪽 벽 속 대포(연출이 드르르륵 꺼내 쏜다) — 벽 안에 숨어 있다
        {'type': 'prop', 'id': 'ship_cannon', 'image': P + 'ship_cannon.png', 'x': CANNON[0], 'y': CANNON[1], 'w': 96, 'h': 48, 'ix': CANNON[0], 'iy': CANNON[1], 'solid': False, 'hidden': True, 'sortY': 1000000000},
        # 영클(비행 장치): 천장 위에서 대기, 연출이 내려온다
        {'type': 'npc', 'id': 'ship_youngcle', 'sprite': 'youngcle_hover', 'x': YC_ENTER[0], 'y': -80, 'facing': 'down', 'wander': 0, 'solid': False, 'hidden': True},
        # 밧줄 철창(닫힘 → 착지 뒤 문 열린 그림으로 교체) + 안의 오방순·나람(거대)
        {'type': 'prop', 'id': 'ship_cage', 'image': P + 'lava_cage.png', 'x': CAGE[0], 'y': CAGE[1] - CAGE_DROP, 'w': 136, 'h': 360, 'ix': CAGE[0], 'iy': CAGE[1] - CAGE_DROP, 'solid': False, 'hidden': True, 'sortY': CAGE[1] + 362},
        {'type': 'prop', 'id': 'ship_cage_open', 'image': P + 'lava_cage_open.png', 'x': CAGE[0], 'y': CAGE[1], 'w': 136, 'h': 360, 'ix': CAGE[0], 'iy': CAGE[1], 'solid': False, 'hidden': True, 'sortY': CAGE[1] + 362},
        {'type': 'npc', 'id': 'ship_obangsun', 'sprite': 'obangsun', 'x': CAGE[0] + 36, 'y': CAGE[1] + 320, 'facing': 'down', 'wander': 0, 'solid': False, 'hidden': True},
        {'type': 'npc', 'id': 'ship_naram', 'sprite': 'naram_giant', 'x': CAGE[0] + 82, 'y': CAGE[1] + 320, 'facing': 'down', 'wander': 0, 'solid': False, 'hidden': True},
    ]
    map_data = {
        'id': MAP_ID, 'name': '엄청대박인배 조종실', 'stage': 'void_fallen',
        'bgm': None, 'battleBg': 'youngcle_factory', 'dim': 0.12,
        'rows': [''.join(r) for r in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/tiles/youngcle_iron_blue_solid.png', 'assets/sprites/youngcle_hover.png',
                    'assets/props/ship_cannonball.png', 'assets/fx/cannon_smoke.png', 'assets/props/lava_cage.png', 'assets/props/lava_cage_open.png',
                    *[f'assets/illustrations/youngcle-tv-{pose}.png' for pose in ('smirk', 'laugh', 'taunt', 'glare', 'shrug', 'yes', 'question')]],
        'spawns': {
            'gate': {'x': SPAWN_X, 'y': 15 * T + 8, 'facing': 'up'},
        },
        'meta': {'connected': True, 'route': [[DOOR_C0 + 1, 15], [DOOR_C0 + 1, 4]], 'logo': [LOGO_X, LOGO_Y], 'cage': list(CAGE), 'junhee': list(JUNHEE), 'yongjun': list(YONGJUN), 'ycEnter': list(YC_ENTER), 'ycStand': list(YC_STAND)},
        'enter': {'script': 'ship_control_intro'},
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
