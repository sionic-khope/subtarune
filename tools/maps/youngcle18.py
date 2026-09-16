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
철창·TV·쥰희·용준은 맵 엔티티로 두고(숨김) 연출이 위치를 잡아 내린다. 패널(C) → 색깔 기억 게임 씬(src/scenes/colorgame.js, BUILD198)."""
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
CAGE_X, CAGE_Y = 552, 7 * T + 20 - 360                # 철창 그림(밧줄 200 + 철창 160, 136 폭) 최종 위치: 웅덩이 오른쪽 끝(일행 앞 TV 와 안 겹침, BUILD199), 철창 밑이 용암 위 y244
TV_X, TV_Y = 704, 110                                 # 영클 TV 대기 자리(오른쪽 끝, 사용자 “살짝 오른쪽에서 팔짱 끼고 대기”) — 인사·규칙은 연출이 일행 앞(250,100)으로 옮겨 내린다
TV_SCALE = 0.82                                       # 모니터 살짝 작게(youngcle-tv.js YOUNGCLE_TV_ARENA.scale 과 같은 값)
ARM_DX, ARM_DY = 112, -298                            # 모니터암: TV 가운데 위, 프레임 안으로 22px 겹쳐 끊겨 보이지 않게
DOOR_C0 = 14                                          # 아래 가운데 입구 cols 14~16(x448~544)
DOOR_X = (DOOR_C0 + 1) * T + 4                        # 스폰 x(484): 24px 발판이 입구 가운데(496)에 오게
BRIDGE_C0 = DOOR_C0                                   # 용암 다리 cols 14~16(문 기둥 줄 그대로 위로), rows 7→2 한 줄에 판 하나(iron_bridge_plank 96×32)
BRIDGE_DROP = 40                                      # 연출 전 판은 40px 위에 숨어 있다가 철컥 내려앉는다(furnace_arena.js BRIDGE_DROP 과 같은 값)


def main() -> None:
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 광장 바닥 rows 8~14 · cols 1~28, 아래 가운데 입구 rows 15~17 · cols 14~16(맨 아랫줄은 가장자리 출입구 H)
    #   일행이 서는 자리는 울타리 3번 칸(왼쪽)이라 도착 연출은 문에서 앞으로 → 옆으로 → 앞으로 걸어간다(BUILD199c 사용자 “여기 기준이면 앞으로 갔다가 옆으로 갔다가 앞으로 가야지”)
    for row in range(8, 15):
        for col in range(1, WIDTH - 1):
            cells[row][col] = 'F'
    for row in range(15, HEIGHT):
        for col in range(DOOR_C0, DOOR_C0 + 3):
            cells[row][col] = 'F'
    for col in range(DOOR_C0, DOOR_C0 + 3): cells[HEIGHT - 1][col] = 'H'
    # 위 출구(BUILD199c 사용자 “길을 만들어주마”): 색 게임 뒤 연출이 웅덩이 가운데(cols 14~16)에 다리를 놓는다(연출이 L → F 로 바꿈). 그 위 rows 0~1 은 열어 둔 통로(row 0 은 가장자리 H) — 다음 맵은 다음 브리핑
    for col in range(BRIDGE_C0, BRIDGE_C0 + 3):
        cells[1][col] = 'F'; cells[0][col] = 'H'
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
                    'assets/props/youngcle_tv_frame.png', 'assets/props/tv_arm.png', 'assets/props/iron_bridge_plank.png',
                    *[f'assets/illustrations/youngcle-tv-{pose}.png' for pose in ('smirk', 'laugh', 'greet', 'oh', 'taunt', 'shrug', 'yes', 'question', 'glare')]],
        'spawns': {
            'bottom': {'x': DOOR_X, 'y': 15 * T + 8, 'facing': 'up'},
            'front': {'x': DOOR_X, 'y': 9 * T + 8, 'facing': 'up'},
            'right': {'x': 24 * T, 'y': 10 * T, 'facing': 'up'},
        },
        'meta': {'connected': True, 'route': [[DOOR_C0 + 1, 16], [DOOR_C0 + 1, 9]], 'pool': [POOL_C0, POOL_R0, POOL_C1, POOL_R1], 'cage': [CAGE_X, CAGE_Y], 'tv': [TV_X, TV_Y], 'tvScale': TV_SCALE},
        'enter': {'script': 'furnace_arena_intro'},
        'entities': [
            {'type': 'door', 'id': 'youngcle18_bottom', 'x': DOOR_C0 * T, 'y': HEIGHT * T - 10, 'w': 96, 'h': 10,
             'to': 'youngcle17', 'spawn': 'top', 'sfx': False, 'interact': False},
            # 조작 패널: 울타리 살짝 왼쪽 옆·앞(캐릭터보다 두 칸 넓음). C → 색깔 기억 게임(1인칭 씬 colorgame, BUILD198 사용자 브리핑) — 페이드 뒤 바로 시작
            {'type': 'prop', 'id': 'lava_panel', 'image': 'assets/props/control_panel.png',
             'x': 6 * T, 'y': 8 * T + 14, 'w': 64, 'h': 22, 'ix': 6 * T, 'iy': 8 * T - 4, 'solid': True, 'script': 'furnace_panel'},
            *fences,
            # 용암 다리 판 6장(앞 row 7 → 멀리 row 2): 연출 전엔 숨김, 40px 위에서 철컥 내려앉는다. 바닥 그림이라 캐릭터 아래(sortY 아주 작게)
            *[{'type': 'prop', 'id': f'lava_bridge_{i}', 'image': 'assets/props/iron_bridge_plank.png', 'x': BRIDGE_C0 * T, 'y': row * T - BRIDGE_DROP, 'w': 96, 'h': 32,
               'ix': BRIDGE_C0 * T, 'iy': row * T - BRIDGE_DROP, 'solid': False, 'hidden': True, 'sortY': -100000000}
              for i, row in enumerate(range(POOL_R1, POOL_R0 - 1, -1))],
            # 밧줄 철창(쥰희·용준): 연출 전엔 숨김. 최종 위치에 두고 연출이 위로 올렸다 내린다
            {'type': 'prop', 'id': 'lava_cage', 'image': 'assets/props/lava_cage.png', 'x': CAGE_X, 'y': CAGE_Y, 'w': 136, 'h': 360,
             'ix': CAGE_X, 'iy': CAGE_Y, 'solid': False, 'hidden': True, 'sortY': CAGE_Y + 362, 'carry': ['arena_junhee', 'arena_yongjun']},
            {'type': 'npc', 'id': 'arena_junhee', 'sprite': 'junhee', 'x': CAGE_X + 18, 'y': CAGE_Y + 330, 'facing': 'down', 'wander': 0, 'solid': False, 'hidden': True},
            {'type': 'npc', 'id': 'arena_yongjun', 'sprite': 'yongjun', 'x': CAGE_X + 80, 'y': CAGE_Y + 330, 'facing': 'down', 'wander': 0, 'solid': False, 'hidden': True},
            # 영클 TV(방송 앵커 id 는 youngcle-tv.js 의 'youngcle_tv') + 모니터암: 천장 위(화면 밖)에서 대기. 그리기 순서는 아랫변 기준(sortY 없음) — 연출 뒤 대기 중인 TV 앞을 지나가도 캐릭터가 가려지지 않는다(사용자)
            {'type': 'prop', 'id': 'youngcle_tv_arm', 'image': 'assets/props/tv_arm.png', 'x': TV_X + ARM_DX, 'y': TV_Y - 360 + ARM_DY, 'w': 12, 'h': 320,
             'ix': TV_X + ARM_DX, 'iy': TV_Y - 360 + ARM_DY, 'solid': False},
            {'type': 'prop', 'id': 'youngcle_tv', 'image': 'assets/props/youngcle_tv_frame.png', 'x': TV_X, 'y': TV_Y - 360, 'w': 236, 'h': 144, 'scale': TV_SCALE, 'foldX': 0.06,
             'ix': TV_X, 'iy': TV_Y - 360, 'solid': False},
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
