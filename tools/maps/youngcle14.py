#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle14.py [--check]
# ──────────────────
"""용암 수로(BUILD190, 사용자 2026-09-16 정정: “한 줄만”, “바로 오른쪽”): 입구에서 오른쪽으로 걸으면 용암 위 뗏목. 수로는 한 줄(3칸 높이 96px)이고 오른쪽으로만 간다.
형섭이 뗏목을 타고 경섭·빠맨은 뗏목 아래 용암에서 헤엄친다(swimAt below). 함정은 색·크기로 구분: 하늘색 낮은 빔·낮은 돌 = C 한 번, 붉은 높은 빔·높은 돌 = 공중에서 C 한 번 더(2단).
뗏목 옆에서 C → 컷신 lava_raft_intro(형섭이 걸어서 올라탐 → 대사 → 빠맨·경섭이 걸어가 용암에 → 출발). 2단 점프 플래그는 컷신이 준다."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle14'
WIDTH: Final = 60
HEIGHT: Final = 12
T: Final = 32

# 한 줄 수로 rows 5~7 · cols 12~52, 뗏목은 rows 5~6, 헤엄치는 동료는 row 7
RAFT_X0, RAFT_Y = 12 * T + 8, 5 * T + 6              # 392, 166
RAFT_X1 = 52 * T - 56 - 8                              # 1600
LANE_TOP = 5 * T                                       # 160


def beam(id_: str, x: int, high: bool, pulse: dict | None = None, oscillate: dict | None = None) -> dict:
    """플라즈마 빔: 낮은 것(하늘색, clear 40 = C 한 번) / 높은 것(붉은 자홍, clear 80 = 2단). 닿으면 체크포인트로 쓸려간다"""
    e = {'type': 'prop', 'id': id_, 'image': f"assets/props/{'plasma_beam_high' if high else 'plasma_beam_v'}.png", 'x': x, 'y': LANE_TOP, 'w': 40, 'h': 96,
         'ix': x, 'iy': LANE_TOP, 'sortY': LANE_TOP, 'solid': True, 'obstacle': True, 'clear': 80 if high else 40, 'sweep': True, 'anim': {'cols': 3, 'fps': 10}}
    if pulse: e['pulse'] = pulse
    if oscillate: e['oscillate'] = oscillate
    return e


def wall_high(id_: str, x: int) -> dict:
    """높은 굳은 용암 벽: 2단 점프로만(clear 72), 닿으면 쓸려간다"""
    y = RAFT_Y - 8
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/lava_wall.png', 'x': x, 'y': y, 'w': 40, 'h': 64,
            'ix': x, 'iy': y - 4, 'sortY': y + 40, 'solid': True, 'obstacle': True, 'clear': 72, 'sweep': True}


def wall_low(id_: str, x: int) -> dict:
    """낮은 돌: C 한 번. 닿으면 쿵 하고 멈춤(C 로 다시)"""
    y = RAFT_Y + 2
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/lava_wall_low.png', 'x': x, 'y': y, 'w': 28, 'h': 36,
            'ix': x, 'iy': y - 16, 'sortY': y + 30, 'solid': True, 'obstacle': True}


def main() -> None:
    """Write the single-lane lava raft room or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 입구 바닥 rows 5~7 · cols 1~12 / 용암 한 줄 rows 5~7 · cols 12~52 / 착지 바닥 rows 5~7 · cols 52~58
    for row in range(5, 8):
        for col in range(1, 12):
            cells[row][col] = 'F'
        for col in range(12, 52):
            cells[row][col] = 'L'
        for col in range(52, 59):
            cells[row][col] = 'F'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] not in ('F', 'L'):
                continue
            for delta_row in (-1, 0, 1):
                for delta_col in (-1, 0, 1):
                    edge_row, edge_col = row + delta_row, col + delta_col
                    if (0 <= edge_row < HEIGHT and 0 <= edge_col < WIDTH
                            and cells[edge_row][edge_col] == '!'):
                        cells[edge_row][edge_col] = 'G'
    # 함정 간격은 점프 한 번(171px)·2단(222px)이 착지한 뒤 다음 것이 보이게 ≥ 230px
    checkpoints = [{'x': RAFT_X0, 'y': RAFT_Y}, {'x': 760, 'y': RAFT_Y}, {'x': 1000, 'y': RAFT_Y}, {'x': 1240, 'y': RAFT_Y}, {'x': 1420, 'y': RAFT_Y}]
    map_data = {
        'id': MAP_ID, 'name': '용암 수로', 'stage': 'void_fallen',
        'bgm': 'pandora_palace', 'backdrop': 'youngcle_furnace',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/lava.png', 'assets/backdrops/youngcle_furnace.png',
                    'assets/props/raft.png', 'assets/props/plasma_beam_v.png', 'assets/props/plasma_beam_high.png', 'assets/props/lava_wall.png', 'assets/props/lava_wall_low.png'],
        'spawns': {
            'left': {'x': 56, 'y': 200, 'facing': 'right'},
            'landing': {'x': 1700, 'y': 200, 'facing': 'right'},
        },
        'meta': {'connected': True, 'route': [[2, 6], [10, 6]], 'raft': [RAFT_X0, RAFT_Y, RAFT_X1], 'checkpoints': checkpoints},
        'entities': [
            # 입구(왼쪽) → 용광로 복도(from_right)
            {'type': 'door', 'id': 'youngcle14_left', 'x': 32, 'y': 160, 'w': 16, 'h': 96,
             'to': 'youngcle13', 'spawn': 'from_right', 'sfx': False, 'interact': False},
            # 부두 안내판(장애물 구분)
            {'type': 'sign', 'id': 'lava14_hint', 'x': 320, 'y': 152, 'w': 24, 'h': 16, 'solid': True,
             'text': '* 하늘색 빔·낮은 돌은 C 한 번.\n* 붉은 빔·높은 돌은 공중에서 C 한 번 더.'},
            # 뗏목(오른쪽으로 한 줄): 옆에서 C → walkOn 컷신이 걸어서 태우고 출발시킨다. 용암: 물방울 주황, 탑승 소리 치이익
            {'type': 'raft', 'id': 'raft14a', 'image': 'assets/props/raft.png', 'x': RAFT_X0, 'y': RAFT_Y, 'route': [[RAFT_X1, RAFT_Y]], 'speed': 171,
             'jump': True, 'jumpH2': 96, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'lava': True, 'boardSfx': False, 'arriveSfx': 'thud',
             'onBoard': 'lava_raft_intro', 'walkOn': True, 'checkpoints': checkpoints, 'disembarkPartyGap': 40},
            beam('beam_low1', 640, False, pulse={'on': 1.8, 'off': 1.0}),
            wall_high('wall_high1', 880),
            beam('beam_high1', 1120, True, pulse={'on': 1.3, 'off': 1.3, 'phase': 0.6}),
            wall_low('wall_low1', 1330),
            beam('beam_low2', 1500, False, oscillate={'dx': 24, 'period': 2.0}),
            # 착지 오른쪽 끝: 다음 지역은 다음 브리핑
            {'type': 'sign', 'id': 'lava14_end', 'x': 1856, 'y': 176, 'w': 16, 'h': 64, 'solid': True,
             'text': '* 잠긴 철문.\n* 뜨거운 바람이 틈으로 새어 나온다.'},
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
