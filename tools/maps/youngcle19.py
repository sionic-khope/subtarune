#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle19.py [--check]
# ──────────────────
"""엄청대박인배 다리길(BUILD201, 사용자 브리핑 “위로 가면 위로 쭉 가는 다리길 + 거대한 철문이 앞에 딱 붙어 있는 거 하나, C 누르면 ‘엄청대박인배 조종실 이라고 적혀있다, 들어갈까?’ 예/아니오”).
광장(youngcle18) 위 통로에서 올라오면 용암 위로 트러스 난간이 달린 철 다리(타일 N, 3칸 폭)가 화면 두 배 넘게 곧장 위로 이어지고,
끝에 선체 벽(강판·배관·경고 띠·명판)과 거대한 철문(ship_gate)이 다리에 딱 붙어 있다. 철문은 소품(script ship_gate) — C → 예 → 조종실(youngcle20).
그림: tools/art/ship_bridge_set.py. 아래 출입구는 가장자리 칸 H, 문 트리거는 맵 끝 10px. 브금 없음(사용자 “엄청대박인배 입구에선 브금도 꺼져야지”)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle19'
WIDTH: Final = 15
HEIGHT: Final = 30
T: Final = 32
DECK_C0: Final = 6                                    # 다리 cols 6~8(x192~288), 광장 위 통로(cols 14~16)와 같은 3칸 폭
DECK_R0: Final = 6                                    # 선체 벽 rows 0~5(192px) 아래부터 다리
GATE_W, GATE_H = 192, 160                             # 철문 그림(ship_gate.png)
GATE_X: Final = (DECK_C0 + 1) * T + T // 2 - GATE_W // 2   # 다리 가운데(240)에 맞춤 → 144
SPAWN_X: Final = (DECK_C0 + 1) * T + 4                # 24px 발판이 다리 가운데(240)에 오게 → 228


def main() -> None:
    cells = [['L'] * WIDTH for _ in range(HEIGHT)]
    for row in range(HEIGHT):
        cells[row][0] = 'G'; cells[row][WIDTH - 1] = 'G'
    for row in range(DECK_R0):
        for col in range(WIDTH):
            cells[row][col] = 'G'
    for col in range(WIDTH):
        cells[HEIGHT - 1][col] = 'G'
    for row in range(DECK_R0, HEIGHT - 1):
        for col in range(DECK_C0, DECK_C0 + 3):
            cells[row][col] = 'N'
    for col in range(DECK_C0, DECK_C0 + 3):
        cells[HEIGHT - 1][col] = 'H'
    deck_px = (HEIGHT - DECK_R0) * T                                    # 난간 길이(ship_bridge_set.DECK_ROWS × 32 = 768)
    map_data = {
        'id': MAP_ID, 'name': '엄청대박인배 다리길', 'stage': 'void_fallen',
        'bgm': None, 'backdrop': 'youngcle_furnace',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(r) for r in cells],
        'preload': ['assets/tiles/youngcle_bridge_deck.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/tiles/youngcle_iron_blue_solid.png', 'assets/tiles/lava.png',
                    'assets/backdrops/youngcle_furnace.png'],
        'spawns': {
            'bottom': {'x': SPAWN_X, 'y': (HEIGHT - 2) * T + 8, 'facing': 'up'},
            'gate': {'x': SPAWN_X, 'y': (DECK_R0 + 1) * T + 8, 'facing': 'down'},
        },
        'meta': {'connected': True, 'route': [[DECK_C0 + 1, HEIGHT - 2], [DECK_C0 + 1, DECK_R0]], 'gate': [GATE_X, DECK_R0 * T - GATE_H]},
        'entities': [
            {'type': 'door', 'id': 'youngcle19_bottom', 'x': DECK_C0 * T, 'y': HEIGHT * T - 10, 'w': 96, 'h': 10,
             'to': 'youngcle18', 'spawn': 'top', 'sfx': False, 'interact': False},
            # 다리 끝 선체 벽(항상 뒤) + 거대한 철문: 문 그림 밑변이 다리 첫 줄에 딱 붙고, 히트박스는 그 밑변 14px(벽 줄) — 다리 위에서 위를 보고 C
            {'type': 'prop', 'id': 'ship_hull', 'image': 'assets/props/ship_hull_wall.png', 'x': 0, 'y': 0, 'w': 480, 'h': DECK_R0 * T, 'solid': False, 'sortY': -1000},
            {'type': 'prop', 'id': 'ship_gate', 'image': 'assets/props/ship_gate.png', 'x': DECK_C0 * T, 'y': DECK_R0 * T - 14, 'w': 96, 'h': 14,
             'ix': GATE_X, 'iy': DECK_R0 * T - GATE_H, 'solid': True, 'script': 'ship_gate'},
            # 트러스 난간(다리 양옆 용암 위, 항상 뒤)
            {'type': 'prop', 'id': 'ship_rail_l', 'image': 'assets/props/ship_rail.png', 'x': DECK_C0 * T - 24, 'y': DECK_R0 * T, 'w': 24, 'h': deck_px, 'solid': False, 'sortY': -1000000000},
            {'type': 'prop', 'id': 'ship_rail_r', 'image': 'assets/props/ship_rail_r.png', 'x': (DECK_C0 + 3) * T, 'y': DECK_R0 * T, 'w': 24, 'h': deck_px, 'solid': False, 'sortY': -1000000000},
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
