#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle14.py [--check]
# ──────────────────
"""용암 뗏목 방(BUILD189, 사용자 2026-09-15): 입구에서 오른쪽으로 3초쯤 걸으면 용암 위 뗏목. 물 대신 용암(L).
형섭이 뗏목을 타고 경섭·빠맨은 용암에서 헤엄친다(swimAt below). 함정 = 플라즈마 빔(낮은 건 한 번 점프, 높은 건 2단 점프, 켜졌다 꺼짐)과 굳은 용암 벽(높은 건 2단 점프, 낮은 건 한 번).
구간 ① 오른쪽(사용자: 오른쪽 먼저): 낮은 빔 → 높은 벽 → 높은 빔(펄스) → 낮은 벽. 구간 ② 위(세로): 낮은 벽 → 좌우로 흔들리는 낮은 빔 → 높은 빔(펄스) — 조합이 다르다(세로 560px 에 셋).
뗏목 앞 트리거(입구에서 3초)가 컷신 lava_raft_intro 를 튼다(형섭 먼저 탑승 → 대사 → 빠맨·경섭 차례로 용암에 → 출발). 2단 점프 플래그는 컷신이 준다."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle14'
WIDTH: Final = 60
HEIGHT: Final = 30
T: Final = 32

# 구간 ① 가로 수로 rows 21~26 · cols 12~50, 뗏목은 rows 22~23 에서 출발
RAFT_A_X0, RAFT_A_Y = 12 * T + 8, 22 * T + 6          # 392, 710
RAFT_A_X1 = 50 * T - 56 - 8                            # 1536
# 구간 ② 세로 수로 cols 52~57 · rows 3~21(560px — 함정 셋이 점프 한 번(171px)·2단(222px) 간격으로 들어간다), 뗏목은 아래에서 위로
RAFT_B_X, RAFT_B_Y0 = 52 * T + 20, 22 * T - 40          # 1684, 664 — 아래 바닥(row 22)에 선 채 C 가 닿게 뗏목 밑변을 바닥 윗선에
RAFT_B_Y1 = 3 * T + 8                                  # 104


def beam_v(id_: str, x: int, top_row: int, clear: int, pulse: dict | None = None, oscillate: dict | None = None) -> dict:
    """세로 플라즈마 빔(수로를 위아래로 가로지름): clear 40 = 한 번 점프로 넘음, 80 = 2단 점프. 닿으면 체크포인트로 쓸려간다"""
    e = {'type': 'prop', 'id': id_, 'image': 'assets/props/plasma_beam_v.png', 'x': x, 'y': top_row * T, 'w': 40, 'h': 160,
         'ix': x, 'iy': top_row * T, 'sortY': top_row * T, 'solid': True, 'obstacle': True, 'clear': clear, 'sweep': True, 'anim': {'cols': 3, 'fps': 10}}
    if pulse: e['pulse'] = pulse
    if oscillate: e['oscillate'] = oscillate
    return e


def beam_h(id_: str, left_col: int, y: int, clear: int, pulse: dict | None = None, oscillate: dict | None = None) -> dict:
    """가로 플라즈마 빔(세로 수로를 좌우로 가로지름)"""
    x = left_col * T
    e = {'type': 'prop', 'id': id_, 'image': 'assets/props/plasma_beam_h.png', 'x': x, 'y': y, 'w': 160, 'h': 40,
         'ix': x, 'iy': y, 'sortY': y, 'solid': True, 'obstacle': True, 'clear': clear, 'sweep': True, 'anim': {'cols': 3, 'fps': 10}}
    if pulse: e['pulse'] = pulse
    if oscillate: e['oscillate'] = oscillate
    return e


def wall_high(id_: str, x: int, y: int) -> dict:
    """굳은 용암 벽(높음): 2단 점프로만(clear 72), 닿으면 쓸려간다"""
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/lava_wall.png', 'x': x, 'y': y, 'w': 40, 'h': 64,
            'ix': x, 'iy': y - 4, 'sortY': y + 40, 'solid': True, 'obstacle': True, 'clear': 72, 'sweep': True}


def wall_low(id_: str, x: int, y: int) -> dict:
    """낮은 벽: 한 번 점프. 닿으면 쿵 하고 멈춤(C 로 다시)"""
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/lava_wall_low.png', 'x': x, 'y': y, 'w': 28, 'h': 36,
            'ix': x, 'iy': y - 16, 'sortY': y + 30, 'solid': True, 'obstacle': True}


def main() -> None:
    """Write the lava raft room or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 입구 바닥 rows 22~25 · cols 1~12 / 구간 ① 용암 rows 21~26 · cols 12~50 / 착지 바닥 rows 22~25 · cols 50~58
    for row in range(22, 26):
        for col in range(1, 13):
            cells[row][col] = 'F'
    for row in range(21, 27):
        for col in range(12, 50):
            cells[row][col] = 'L'
    for row in range(22, 26):
        for col in range(50, 59):
            cells[row][col] = 'F'
    # 구간 ② 용암 cols 52~57 · rows 3~21 / 위 착지 바닥 rows 1~2 · cols 50~58
    for row in range(3, 22):
        for col in range(52, 58):
            cells[row][col] = 'L'
    for row in range(1, 3):
        for col in range(50, 59):
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
    checkpoints_a = [{'x': RAFT_A_X0, 'y': RAFT_A_Y}, {'x': 800, 'y': RAFT_A_Y}, {'x': 1060, 'y': RAFT_A_Y}, {'x': 1330, 'y': RAFT_A_Y}]
    checkpoints_b = [{'x': RAFT_B_X, 'y': RAFT_B_Y0}, {'x': RAFT_B_X, 'y': 500}, {'x': RAFT_B_X, 'y': 320}]
    map_data = {
        'id': MAP_ID, 'name': '용암 수로', 'stage': 'void_fallen',
        'bgm': 'pandora_palace', 'backdrop': 'youngcle_furnace',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/lava.png', 'assets/backdrops/youngcle_furnace.png',
                    'assets/props/raft.png', 'assets/props/plasma_beam_v.png', 'assets/props/plasma_beam_h.png', 'assets/props/lava_wall.png', 'assets/props/lava_wall_low.png'],
        'spawns': {
            'left': {'x': 56, 'y': 748, 'facing': 'right'},
            # QA: 구간 ① 착지 바닥(구간 ② 뗏목 앞)
            'landing': {'x': 1640, 'y': 748, 'facing': 'up'},
            'top': {'x': 1700, 'y': 56, 'facing': 'right'},
        },
        'meta': {'connected': True, 'route': [[2, 23], [11, 23]], 'raftA': [RAFT_A_X0, RAFT_A_Y, RAFT_A_X1], 'raftB': [RAFT_B_X, RAFT_B_Y0, RAFT_B_Y1],
                 'checkpointsA': checkpoints_a, 'checkpointsB': checkpoints_b},
        'entities': [
            # 입구(왼쪽) → 용광로 복도(from_right)
            {'type': 'door', 'id': 'youngcle14_left', 'x': 32, 'y': 704, 'w': 16, 'h': 128,
             'to': 'youngcle13', 'spawn': 'from_right', 'sfx': False, 'interact': False},
            # 뗏목 앞 트리거(입구에서 3초쯤): 뗏목 컷신 1회
            {'type': 'trigger', 'id': 'lava_raft_trigger', 'x': 300, 'y': 704, 'w': 16, 'h': 128, 'script': 'lava_raft_intro', 'once': True, 'flag': 'lava_raft_intro_done'},
            # 구간 ① 뗏목(오른쪽으로) — 출발은 컷신 { raft, go }. 용암: 물방울 주황, 탑승 소리 치이익
            {'type': 'raft', 'id': 'raft14a', 'image': 'assets/props/raft.png', 'x': RAFT_A_X0, 'y': RAFT_A_Y, 'route': [[RAFT_A_X1, RAFT_A_Y]], 'speed': 171,
             'jump': True, 'jumpH2': 96, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'lava': True, 'boardSfx': 'sizzle', 'arriveSfx': 'thud',
             'checkpoints': checkpoints_a, 'disembarkPartyGap': 40},
            beam_v('beam_a1', 700, 21, 40, pulse={'on': 1.8, 'off': 1.0}),
            wall_high('wall_a1', 950, RAFT_A_Y - 8),
            beam_v('beam_a2', 1200, 21, 80, pulse={'on': 1.3, 'off': 1.3, 'phase': 0.6}),
            wall_low('wall_a2', 1400, RAFT_A_Y + 2),
            # 구간 ② 뗏목(위로) — 착지 바닥에서 옆에 서서 C
            {'type': 'raft', 'id': 'raft14b', 'image': 'assets/props/raft.png', 'x': RAFT_B_X, 'y': RAFT_B_Y0, 'route': [[RAFT_B_X, RAFT_B_Y1]], 'speed': 171,
             'jump': True, 'jumpH2': 96, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'lava': True, 'boardSfx': 'sizzle', 'arriveSfx': 'thud',
             'checkpoints': checkpoints_b, 'disembarkPartyGap': 40},
            # 구간 ②(위): 낮은 벽 → 좌우로 흔들리는 낮은 빔 → 높은 빔(펄스). 간격은 점프 한 번(171px)·2단(222px)이 착지한 뒤 다음 것이 보이게(한 점프로 두 함정에 걸리지 않게)
            wall_low('wall_b1', RAFT_B_X + 14, 540),
            beam_h('beam_b1', 52, 360, 40, oscillate={'dx': 40, 'period': 2.2}),
            beam_h('beam_b2', 52, 180, 80, pulse={'on': 1.2, 'off': 1.4, 'phase': 0.3}),
            # 위 착지 오른쪽 끝: 다음 지역은 다음 브리핑
            {'type': 'sign', 'id': 'lava14_end', 'x': 1856, 'y': 32, 'w': 16, 'h': 64, 'solid': True,
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
