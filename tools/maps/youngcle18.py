#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle18.py [--check]
# ──────────────────
"""용광로 광장(BUILD196, 사용자 브리핑): 가운데 아래에서 올라오면 가로로 넓은 방. 가운데 위엔 용암 용광로 웅덩이, 그 앞을 짧은 철 울타리가 ------- 막고,
울타리 살짝 왼쪽 옆·앞에 캐릭터보다 두 칸 넓은 조작 패널. 도착 연출 `furnace_arena_intro`(브금 꺼짐 → 천천히 들어옴 → 느낌표 → 용암 앞 → 영클 TV 가 모니터암을 타고 내려옴 → 밧줄 철창(쥰희·용준) 덜렁 → 규칙 설명).
철창·TV·쥰희·용준은 맵 엔티티로 두고(숨김) 연출이 위치를 잡아 내린다. 노란 패널 이벤트는 다음 브리핑."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'youngcle18'
WIDTH: Final = 30
HEIGHT: Final = 18
T: Final = 32
POOL_C0, POOL_C1, POOL_R0, POOL_R1 = 8, 21, 2, 7      # 용암 웅덩이 cols 8~21 · rows 2~7
CAGE_X, CAGE_Y = 15 * T - 48, 7 * T + 20 - 360        # 철창 그림(밧줄 200 + 철창 160) 최종 위치: 철창 밑이 용암 위 y244
TV_X, TV_Y = 15 * T - 144, 3 * T + 4                  # 영클 TV 최종 위치(일행 앞, 화면 위쪽) — 연출이 여기서 360 위에 두고 내린다


def main() -> None:
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 광장 바닥 rows 8~14 · cols 1~28, 아래 가운데 입구 rows 15~17 · cols 14~16(맨 아랫줄은 가장자리 출입구 H)
    for row in range(8, 15):
        for col in range(1, WIDTH - 1):
            cells[row][col] = 'F'
    for row in range(15, HEIGHT):
        for col in range(14, 17):
            cells[row][col] = 'F'
    for col in range(14, 17): cells[HEIGHT - 1][col] = 'H'
    for row in range(POOL_R0, POOL_R1 + 1):
        for col in range(POOL_C0, POOL_C1 + 1):
            cells[row][col] = 'L'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] not in ('F', 'H', 'L'):
                continue
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    r, c = row + dr, col + dc
                    if 0 <= r < HEIGHT and 0 <= c < WIDTH and cells[r][c] == '!':
                        cells[r][c] = 'G'
    fences = [{'type': 'prop', 'id': f'lava_fence_{i}', 'image': 'assets/props/iron_fence_short.png',
               'x': col * T, 'y': (POOL_R1 + 1) * T - 6, 'w': 32, 'h': 14, 'ix': col * T, 'iy': (POOL_R1 + 1) * T - 14, 'solid': True}
              for i, col in enumerate(range(POOL_C0, POOL_C1 + 1))]
    map_data = {
        'id': MAP_ID, 'name': '용광로 광장', 'stage': 'void_fallen',
        'bgm': None, 'backdrop': 'youngcle_furnace',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(r) for r in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/tiles/youngcle_iron_blue_solid.png', 'assets/tiles/lava.png',
                    'assets/backdrops/youngcle_furnace.png', 'assets/props/iron_fence_short.png', 'assets/props/control_panel.png', 'assets/props/lava_cage.png',
                    'assets/props/youngcle_tv_frame.png', 'assets/props/tv_arm.png',
                    *[f'assets/illustrations/youngcle-tv-{pose}.png' for pose in ('smirk', 'laugh', 'greet', 'oh', 'taunt', 'shrug', 'yes', 'question')]],
        'spawns': {
            'bottom': {'x': 15 * T - 12, 'y': 15 * T + 8, 'facing': 'up'},
            'front': {'x': 15 * T - 12, 'y': 9 * T + 8, 'facing': 'up'},
        },
        'meta': {'connected': True, 'route': [[15, 16], [15, 9]], 'pool': [POOL_C0, POOL_R0, POOL_C1, POOL_R1], 'cage': [CAGE_X, CAGE_Y], 'tv': [TV_X, TV_Y]},
        'enter': {'script': 'furnace_arena_intro'},
        'entities': [
            {'type': 'door', 'id': 'youngcle18_bottom', 'x': 14 * T, 'y': HEIGHT * T - 10, 'w': 96, 'h': 10,
             'to': 'youngcle17', 'spawn': 'top', 'sfx': False, 'interact': False},
            # 조작 패널: 울타리 살짝 왼쪽 옆·앞(캐릭터보다 두 칸 넓음). 노란 패널 이벤트는 다음 브리핑 — 지금은 대사 없음
            {'type': 'prop', 'id': 'lava_panel', 'image': 'assets/props/control_panel.png',
             'x': 6 * T, 'y': 8 * T + 14, 'w': 64, 'h': 22, 'ix': 6 * T, 'iy': 8 * T - 4, 'solid': True},
            *fences,
            # 밧줄 철창(쥰희·용준): 연출 전엔 숨김. 최종 위치에 두고 연출이 위로 올렸다 내린다
            {'type': 'prop', 'id': 'lava_cage', 'image': 'assets/props/lava_cage.png', 'x': CAGE_X, 'y': CAGE_Y, 'w': 96, 'h': 360,
             'ix': CAGE_X, 'iy': CAGE_Y, 'solid': False, 'hidden': True, 'sortY': CAGE_Y + 362},
            {'type': 'npc', 'id': 'arena_junhee', 'sprite': 'junhee', 'x': CAGE_X + 14, 'y': CAGE_Y + 330, 'facing': 'down', 'wander': 0, 'solid': False, 'hidden': True},
            {'type': 'npc', 'id': 'arena_yongjun', 'sprite': 'yongjun', 'x': CAGE_X + 56, 'y': CAGE_Y + 330, 'facing': 'down', 'wander': 0, 'solid': False, 'hidden': True},
            # 영클 TV(방송 앵커 id 는 youngcle-tv.js 의 'youngcle_tv') + 모니터암: 천장 위(화면 밖)에서 대기
            {'type': 'prop', 'id': 'youngcle_tv_arm', 'image': 'assets/props/tv_arm.png', 'x': TV_X + 138, 'y': TV_Y - 360 - 320, 'w': 12, 'h': 320,
             'ix': TV_X + 138, 'iy': TV_Y - 360 - 320, 'solid': False, 'sortY': 9999},
            {'type': 'prop', 'id': 'youngcle_tv', 'image': 'assets/props/youngcle_tv_frame.png', 'x': TV_X, 'y': TV_Y - 360, 'w': 288, 'h': 176,
             'ix': TV_X, 'iy': TV_Y - 360, 'solid': False, 'sortY': 10000},
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
