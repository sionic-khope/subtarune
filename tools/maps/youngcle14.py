#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle14.py [--check]
# ──────────────────
"""용암 수로(BUILD192): 입구에서 오른쪽으로 걸으면 용암 위 뗏목. 수로는 한 줄(3칸 96px). 구간 ① 오른쪽 → 착지 → 구간 ② 좁은 세로 수로로 위로 → 위 착지 → 구간 ③ 다시 오른쪽(사용자 2026-09-16: “위로 가는 용암 퍼즐 후에 오른쪽으로 가는 용암길도”) → 오른쪽 끝 통로로 용광로 화물 검사실 1(youngcle15, BUILD193).
입구·출구는 벽으로 막지 않는다: 통로가 맵 가장자리까지 이어져 열려 보이고(가장자리 칸은 바닥 그림의 막힌 출입구 타일 'H' — 맵 규칙 ‘사방 막힘’ 유지) 문 트리거는 그 안쪽 칸에 있다(사용자: “출구 포탈이나 입구 포탈이 벽 블럭으로 막혀 있으면 어떡하냐”).
형섭이 뗏목을 타고 경섭·빠맨은 뗏목 아래 용암에서 헤엄친다(swimAt below). 함정 디자인 규칙(사용자: 2단 점프인지 그림으로 알아야): 한 덩어리/한 층 = C 한 번, 같은 것을 두 개 쌓은 것(달아오른 위 덩어리·2층 빔 게이트) = 공중에서 C 한 번 더.
뗏목 옆에서 C → 컷신 lava_raft_intro(형섭이 걸어서 올라탐 → 대사 → 빠맨·경섭이 걸어가 용암에 → 출발). 2단 점프 플래그는 컷신이 준다."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle14'
WIDTH: Final = 108
HEIGHT: Final = 26
T: Final = 32

# 구간 ① 한 줄 수로 rows 20~22 · cols 12~52, 뗏목은 rows 20~21, 헤엄치는 동료는 row 22
RAFT_X0, RAFT_Y = 12 * T + 8, 20 * T + 6             # 392, 646
RAFT_X1 = 52 * T - 56 - 8                              # 1600
LANE_TOP = 20 * T                                      # 640
# 구간 ② 세로 한 줄 수로 cols 54~56 · rows 5~19(96px 폭), 뗏목은 착지 바닥 바로 위(y600)에서 위로 y168 까지(위 착지 rows 2~4 바로 아래)
RAFT_B_X, RAFT_B_Y0, RAFT_B_Y1 = 54 * T + 20, 20 * T - 40, 5 * T + 8   # 1748, 600, 168
LANE_B_LEFT = 54 * T                                   # 1728
# 구간 ③ 위 착지에서 다시 오른쪽 한 줄 수로 rows 2~4 · cols 59~98(2층 빔 게이트의 위층 64px 가 맵 안에 들어오게 row 2 부터), 끝 착지 cols 99~107(가장자리까지 열림)
LANE_C_TOP = 2 * T                                     # 64
RAFT_C_X0, RAFT_C_Y = 59 * T + 8, 2 * T + 6            # 1896, 70
RAFT_C_X1 = 99 * T - 56 - 8                            # 3104


def beam(id_: str, x: int, high: bool, pulse: dict | None = None, oscillate: dict | None = None, top: int = LANE_TOP) -> dict:
    """플라즈마 빔: 낮은 것(하늘색, clear 40 = C 한 번) / 높은 것(붉은 자홍, clear 80 = 2단). 닿으면 체크포인트로 쓸려간다"""
    # 높은 빔은 2층 게이트(그림 160 = 위층 64 + 아래층 96): 아래층이 수로, 위층이 그 위로 쌓인다. 히트박스는 수로 안 40×96
    e = {'type': 'prop', 'id': id_, 'image': f"assets/props/{'plasma_beam_high' if high else 'plasma_beam_v'}.png", 'x': x, 'y': top, 'w': 40, 'h': 96,
         'ix': x, 'iy': top - (64 if high else 0), 'sortY': top, 'solid': True, 'obstacle': True, 'clear': 80 if high else 40, 'sweep': True, 'anim': {'cols': 3, 'fps': 10}}
    if pulse: e['pulse'] = pulse
    if oscillate: e['oscillate'] = oscillate
    return e


def wall_high(id_: str, x: int, y: int = RAFT_Y - 8) -> dict:
    """높은 굳은 용암 벽: 2단 점프로만(clear 72), 닿으면 쓸려간다"""
    # 그림은 덩어리 둘을 쌓은 76 높이(아래 덩어리가 히트박스 자리, 위 덩어리가 그 위로 솟음), 히트박스는 뗏목 높이 40×64
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/lava_wall.png', 'x': x, 'y': y, 'w': 40, 'h': 64,
            'ix': x, 'iy': y - 24, 'sortY': y + 40, 'solid': True, 'obstacle': True, 'clear': 72, 'sweep': True}


def wall_low(id_: str, x: int, y: int = RAFT_Y + 2) -> dict:
    """낮은 돌: C 한 번. 닿으면 쿵 하고 멈춤(C 로 다시)"""
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/lava_wall_low.png', 'x': x, 'y': y, 'w': 40, 'h': 36,
            'ix': x, 'iy': y - 12, 'sortY': y + 30, 'solid': True, 'obstacle': True}


def beam_h(id_: str, y: int, high: bool, pulse: dict | None = None, oscillate: dict | None = None) -> dict:
    """세로 수로를 가로지르는 빔(그림은 세로 빔 시트를 못 쓰므로 가로 시트): 낮은 96×40 / 높은 160×40(수로 밖으로 32px 씩)"""
    x = LANE_B_LEFT
    e = {'type': 'prop', 'id': id_, 'image': f"assets/props/{'plasma_beam_high_h' if high else 'plasma_beam_v_h'}.png", 'x': x, 'y': y, 'w': 96, 'h': 40,
         'ix': x - (64 if high else 0), 'iy': y, 'sortY': y, 'solid': True, 'obstacle': True, 'clear': 80 if high else 40, 'sweep': True, 'anim': {'cols': 3, 'fps': 10}}
    if pulse: e['pulse'] = pulse
    if oscillate: e['oscillate'] = oscillate
    return e


def main() -> None:
    """Write the single-lane lava raft room or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 입구 바닥 rows 20~22 · cols 0~11(왼쪽 가장자리까지 열린 통로) / 구간 ① 용암 한 줄 rows 20~22 · cols 12~51 / 착지 바닥 rows 20~22 · cols 52~58
    for row in range(20, 23):
        for col in range(0, 12):
            cells[row][col] = 'F'
        cells[row][0] = 'H'
        for col in range(12, 52):
            cells[row][col] = 'L'
        for col in range(52, 59):
            cells[row][col] = 'F'
    # 구간 ② 세로 한 줄 용암 cols 54~56 · rows 5~19 / 위 착지 바닥 rows 2~4 · cols 52~58
    for row in range(5, 20):
        for col in range(54, 57):
            cells[row][col] = 'L'
    # 구간 ③ rows 2~4: 위 착지 cols 52~58 / 용암 한 줄 cols 59~98 / 끝 착지 cols 99~107(오른쪽 가장자리까지 열린 통로 — 다음 맵은 다음 브리핑)
    for row in range(2, 5):
        for col in range(52, 59):
            cells[row][col] = 'F'
        for col in range(59, 99):
            cells[row][col] = 'L'
        for col in range(99, WIDTH):
            cells[row][col] = 'F'
        cells[row][WIDTH - 1] = 'H'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] not in ('F', 'L', 'H'):
                continue
            for delta_row in (-1, 0, 1):
                for delta_col in (-1, 0, 1):
                    edge_row, edge_col = row + delta_row, col + delta_col
                    if (0 <= edge_row < HEIGHT and 0 <= edge_col < WIDTH
                            and cells[edge_row][edge_col] == '!'):
                        cells[edge_row][edge_col] = 'G'
    # 함정 간격은 점프 한 번(171px)·2단(222px)이 착지한 뒤 다음 것이 보이게 ≥ 230px
    checkpoints = [{'x': RAFT_X0, 'y': RAFT_Y}, {'x': 760, 'y': RAFT_Y}, {'x': 1000, 'y': RAFT_Y}, {'x': 1240, 'y': RAFT_Y}, {'x': 1420, 'y': RAFT_Y}]
    checkpoints_b = [{'x': RAFT_B_X, 'y': RAFT_B_Y0}, {'x': RAFT_B_X, 'y': 440}]
    # 구간 ③: 두 단 돌(+248) → 2층 빔 좌우로 흔들림(+528) → 낮은 돌(+808) → 낮은 빔 펄스(+1068). 체크포인트는 함정 사이 — 흔들리는 2층 빔 앞은 멀리(+330: 재출발 뒤 빔까지 ≥ 170px, 타이밍 볼 여유)
    checkpoints_c = [{'x': RAFT_C_X0, 'y': RAFT_C_Y}, {'x': RAFT_C_X0 + 330, 'y': RAFT_C_Y}, {'x': RAFT_C_X0 + 664, 'y': RAFT_C_Y}, {'x': RAFT_C_X0 + 934, 'y': RAFT_C_Y}]
    map_data = {
        'id': MAP_ID, 'name': '용암 수로', 'stage': 'void_fallen',
        'bgm': 'pandora_palace', 'backdrop': 'youngcle_furnace',
        'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/youngcle_iron_blue_solid.png', 'assets/tiles/lava.png', 'assets/backdrops/youngcle_furnace.png',
                    'assets/props/raft.png', 'assets/props/plasma_beam_v.png', 'assets/props/plasma_beam_high.png', 'assets/props/lava_wall.png', 'assets/props/lava_wall_low.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/props/plasma_beam_v_h.png', 'assets/props/plasma_beam_high_h.png'],
        'spawns': {
            'left': {'x': 56, 'y': 680, 'facing': 'right'},
            'landing': {'x': 1700, 'y': 680, 'facing': 'right'},
            'top': {'x': 1700, 'y': 112, 'facing': 'right'},
            'top_end': {'x': 3300, 'y': 112, 'facing': 'right'},
        },
        'meta': {'connected': True, 'route': [[2, 21], [10, 21]], 'raft': [RAFT_X0, RAFT_Y, RAFT_X1], 'raftB': [RAFT_B_X, RAFT_B_Y0, RAFT_B_Y1], 'raftC': [RAFT_C_X0, RAFT_C_Y, RAFT_C_X1], 'checkpoints': checkpoints, 'checkpointsB': checkpoints_b, 'checkpointsC': checkpoints_c},
        'entities': [
            # 입구(왼쪽) → 용광로 복도(from_right)
            {'type': 'door', 'id': 'youngcle14_left', 'x': 32, 'y': 640, 'w': 16, 'h': 96,
             'to': 'youngcle13', 'spawn': 'from_right', 'sfx': False, 'interact': False},
            # 뗏목(오른쪽으로 한 줄): 옆에서 C → walkOn 컷신이 걸어서 태우고 출발시킨다. 용암: 물방울 주황, 탑승 소리 치이익
            {'type': 'raft', 'id': 'raft14a', 'image': 'assets/props/raft.png', 'x': RAFT_X0, 'y': RAFT_Y, 'route': [[RAFT_X1, RAFT_Y]], 'speed': 171,
             'jump': True, 'jumpH2': 96, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'lava': True, 'boardSfx': False, 'arriveSfx': 'thud',
             'onBoard': 'lava_raft_intro', 'walkOn': True, 'checkpoints': checkpoints, 'disembarkPartyGap': 40},
            beam('beam_low1', 640, False, pulse={'on': 1.8, 'off': 1.0}),
            wall_high('wall_high1', 880),
            beam('beam_high1', 1120, True, pulse={'on': 1.3, 'off': 1.3, 'phase': 0.6}),
            wall_low('wall_low1', 1330),
            beam('beam_low2', 1500, False, oscillate={'dx': 24, 'period': 2.0}),
            # 구간 ② 뗏목(위로, 좁은 세로 수로): 착지 바닥에서 뗏목 아래에 서서 C → 걸어서 타고(walkOn 즉석 스크립트) 동료도 걸어가 뛰어든다. 함정 조합이 다르다: 낮은 돌 → 붉은 높은 빔
            {'type': 'raft', 'id': 'raft14b', 'image': 'assets/props/raft.png', 'x': RAFT_B_X, 'y': RAFT_B_Y0, 'route': [[RAFT_B_X, RAFT_B_Y1]], 'speed': 171,
             'jump': True, 'jumpH2': 96, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'lava': True, 'boardSfx': False, 'arriveSfx': 'thud',
             'walkOn': True, 'checkpoints': checkpoints_b, 'disembarkPartyGap': 40},
            wall_low('wall_b_low1', RAFT_B_X + 14, 500),
            beam_h('beam_b_high1', 300, True, pulse={'on': 1.4, 'off': 1.2, 'phase': 0.4}),
            # 구간 ③ 뗏목(위 착지에서 다시 오른쪽): 뗏목 옆에서 C → 걸어서 타고 동료도 걸어가 뛰어든다. 조합이 또 다르다: 두 단 돌 → 흔들리는 2층 빔 → 낮은 돌 → 낮은 빔(펄스)
            {'type': 'raft', 'id': 'raft14c', 'image': 'assets/props/raft.png', 'x': RAFT_C_X0, 'y': RAFT_C_Y, 'route': [[RAFT_C_X1, RAFT_C_Y]], 'speed': 171,
             'jump': True, 'jumpH2': 96, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'lava': True, 'boardSfx': False, 'arriveSfx': 'thud',
             'walkOn': True, 'checkpoints': checkpoints_c, 'disembarkPartyGap': 40},
            # 끝 착지 오른쪽 → 용광로 화물 검사실 1(youngcle15, BUILD193). 가장자리 칸(col 107)은 H, 트리거는 안쪽 칸
            {'type': 'door', 'id': 'youngcle14_right', 'x': 106 * T, 'y': 2 * T, 'w': 16, 'h': 96,
             'to': 'youngcle15', 'spawn': 'left', 'sfx': False, 'interact': False},
            wall_high('wall_c_high1', RAFT_C_X0 + 248, RAFT_C_Y - 8),
            beam('beam_c_high1', RAFT_C_X0 + 528, True, oscillate={'dx': 24, 'period': 2.2}, top=LANE_C_TOP),
            wall_low('wall_c_low1', RAFT_C_X0 + 808, RAFT_C_Y + 2),
            beam('beam_c_low1', RAFT_C_X0 + 1068, False, pulse={'on': 1.6, 'off': 1.1, 'phase': 0.3}, top=LANE_C_TOP),
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
