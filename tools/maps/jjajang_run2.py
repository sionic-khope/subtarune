#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_run2.py [--check]
# ──────────────────
"""토리이 굽이 길(jjajang_run2, BUILD236 사용자 브리핑 2026-09-19):
"다음 맵 토리이 활용한 오른쪽 그리고 밑길, 다시 왼쪽 토리이 밑길 다시 오른쪽 토리이 … 중간중간 달리면서 나뭇잎 같은 게 떨어지거나 날아오거나 나뭇가지가 따라오는데
공격으로 하면 효과음과 함께 쳐낼 수 있고 만약 못 쳐내면 피가 10 깎이는 거 … 그 맵에 들어서면 다시 청소부가 ‘껄껄 이번에도 한번 잘 해보게 그럼 이따보게’ 하고 사라지고 맵 끝으로 다시 가는 것도"
- 파란 토리이 길 오른쪽 끝에서 왼쪽 가장자리(A 길 8~9행)로 들어온다. A: 오른쪽으로(토리이 → 러너 dir +1) → 오른쪽 끝에서 밑길(112~113열) → B: 왼쪽으로(토리이 → 러너 dir −1) → 왼쪽 끝에서 밑길(6~7열) → C: 오른쪽으로(토리이 → 러너 dir +1) → 오른쪽 끝(다음 맵 대기).
- 세 달리기 모두 장애물(나뭇잎 낙하·솔잎 날아옴·나뭇가지): meta.runs.<id>.obstacles. BUILD240: 길 170열·속도 420, A 의 첫 나뭇잎은 튜토리얼(meta.runs.a.tutorial: 맞기 직전 정지 → C). 바닥은 검은 물 '*', 지역 자산은 파란 토리이 길과 같다.
- 입구 트리거(3~4열, 스폰 칸 밖) → jjajang_run2_enter(청소부 한마디 → 휘리릭 사라짐, 한 번). C 달리기 끝 → outro(청소부가 오른쪽에서 걸어와 다시 합류, 대사 없음). A·B 끝은 동료를 숨긴 채 둔다(keepFollowersHidden)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_run2'
WIDTH: Final = 170                # BUILD240 사용자 “길을 더 길게”: 120 → 170 (달리기 한 구간 ≈ 4600px / 420px/s ≈ 11초)
HEIGHT: Final = 28
TILE: Final = 32
ROWS_A: Final = (8, 9)            # 오른쪽으로
ROWS_B: Final = (16, 17)          # 왼쪽으로
ROWS_C: Final = (24, 25)          # 오른쪽으로
DOWN_RIGHT: Final = (162, 163)    # A 끝 → B 로 내려가는 밑길
DOWN_LEFT: Final = (6, 7)         # B 끝 → C 로 내려가는 밑길
TORII_A: Final = 10               # 가까운 기둥 밑동 칸(A, 오른쪽으로 지남)
TORII_B: Final = 154              # (B, 왼쪽으로 지남)
TORII_C: Final = 10               # (C, 오른쪽으로 지남)
RUN_SPEED: Final = 420            # BUILD240 “반응할 수 있는 속도”: 파란 토리이 길 520 보다 느리게(화면 앞 362px 를 0.86초에)
CAM_LEFT: Final = 0.22
SCREEN_W: Final = 480
NEAR_BASE: Final = (57.0, 285.3)
FAR_BASE: Final = (196.0, 216.6)
BACK_OFFSET: Final = (176, 121)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
)


def pine(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = PINES[index % len(PINES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {
        'type': 'prop', 'id': f'jjajang_pine_{index + 1}', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True,
    }


def torii(tag: str, col: int, road_rows: tuple[int, int]) -> list[dict[str, object]]:
    """가까운 기둥 밑동을 길 아래 칸 위쪽 2px 에, 먼 기둥은 계약대로 오른쪽 위(길 위 칸)."""
    near_x = col * TILE + 16
    near_y = (road_rows[1] + 1) * TILE + 2
    ix = round(near_x - NEAR_BASE[0])
    iy = round(near_y - NEAR_BASE[1])
    far_x = ix + FAR_BASE[0]
    far_y = iy + FAR_BASE[1]
    back = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_back', 'image': 'assets/props/jjajang_torii_blue_back.png',
        'x': round(far_x - 12), 'y': round(far_y - 22), 'w': 24, 'h': 22, 'ix': ix + BACK_OFFSET[0], 'iy': iy + BACK_OFFSET[1], 'solid': True,
    }
    front = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_front', 'image': 'assets/props/jjajang_torii_blue_front.png',
        'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24, 'ix': ix, 'iy': iy, 'solid': True,
    }
    assert (road_rows[0] - 1) * TILE <= back['y'] and back['y'] + back['h'] <= road_rows[0] * TILE, '먼 기둥 히트박스는 길 위 칸 안'
    assert (road_rows[1] + 1) * TILE <= front['y'] and front['y'] + front['h'] <= (road_rows[1] + 2) * TILE, '가까운 기둥 히트박스는 길 아래 칸 안'
    assert iy >= 0
    return [back, front]


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]

    def path(cols: range, row_range: range) -> None:
        for row in row_range:
            for col in cols:
                rows[row][col] = '*'
    path(range(0, DOWN_RIGHT[1] + 1), range(ROWS_A[0], ROWS_A[1] + 1))
    path(range(DOWN_RIGHT[0], DOWN_RIGHT[1] + 1), range(ROWS_A[0], ROWS_B[1] + 1))
    path(range(DOWN_LEFT[0], DOWN_RIGHT[1] + 1), range(ROWS_B[0], ROWS_B[1] + 1))
    path(range(DOWN_LEFT[0], DOWN_LEFT[1] + 1), range(ROWS_B[0], ROWS_C[1] + 1))
    path(range(DOWN_LEFT[0], WIDTH), range(ROWS_C[0], ROWS_C[1] + 1))
    for row in ROWS_A:
        rows[row][0] = '+'
    for row in ROWS_C:
        rows[row][WIDTH - 1] = '+'
    # 소나무: 길·밑길에서 떨어진 숲 칸에 드문드문
    cells: list[tuple[int, int]] = []
    for col in range(9, WIDTH - 6, 11):
        for row in (5, 13, 21):
            c, r = col + (row // 8) % 2 * 4, row + (col // 11) % 2
            near_down = any(d[0] - 3 <= c <= d[1] + 3 for d in (DOWN_RIGHT, DOWN_LEFT))
            if near_down or rows[r][c] != '@' or c <= 2:
                continue
            cells.append((c, r))
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(cells)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    gates = [*torii('a', TORII_A, ROWS_A), *torii('b', TORII_B, ROWS_B), *torii('c', TORII_C, ROWS_C)]
    px_w = WIDTH * TILE
    # 달리기 세 구간: 끝 자리는 카메라가 캐릭터를 화면 22%(오른쪽 달리기)/78%(왼쪽 달리기)에 둘 수 있는 곳
    end_a = (DOWN_RIGHT[1] + 1) * TILE - 12 - int(SCREEN_W * (1 - CAM_LEFT))   # 밑길 앞에서 멈춘다(카메라 최대 x = pxW-480 안)
    end_a = min(end_a, px_w - SCREEN_W + int(SCREEN_W * CAM_LEFT) - 12)
    end_b = int(SCREEN_W * (1 - CAM_LEFT)) - 12                                 # 카메라 최소 x = 0 에서 캐릭터 가운데가 78%
    end_c = px_w - SCREEN_W + int(SCREEN_W * CAM_LEFT) - 12
    runs = {
        'a': {'dir': 1, 'endX': end_a, 'speed': RUN_SPEED, 'obstacles': True, 'seed': 11, 'keepFollowersHidden': True, 'tutorial': True},   # 첫 나뭇잎 튜토리얼(BUILD240)은 A 에서만
        'b': {'dir': -1, 'endX': end_b, 'speed': RUN_SPEED, 'obstacles': True, 'seed': 23, 'keepFollowersHidden': True},
        'c': {'dir': 1, 'endX': end_c, 'speed': RUN_SPEED, 'obstacles': True, 'seed': 37, 'outro': 'jjajang_run2_outro', 'outroFlag': 'run2_outro_done'},
    }
    triggers = [
        {'type': 'trigger', 'id': 'run2_enter_trigger', 'x': 3 * TILE, 'y': ROWS_A[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE,
         'once': True, 'flag': 'run2_enter_started', 'unless': 'run2_enter_done', 'script': 'jjajang_run2_enter'},
        {'type': 'trigger', 'id': 'run2_torii_a', 'x': (TORII_A + 2) * TILE, 'y': ROWS_A[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_run2_start_a'},
        {'type': 'trigger', 'id': 'run2_torii_b', 'x': (TORII_B - 3) * TILE, 'y': ROWS_B[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_run2_start_b'},   # 가까운 기둥(154열) 왼쪽 = 왼쪽으로 지난 자리
        {'type': 'trigger', 'id': 'run2_torii_c', 'x': (TORII_C + 2) * TILE, 'y': ROWS_C[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_run2_start_c'},
    ]
    assert triggers[1]['x'] + triggers[1]['w'] < end_a - RUN_SPEED and end_a < DOWN_RIGHT[0] * TILE, 'A 구간'
    assert triggers[2]['x'] > end_b + RUN_SPEED and end_b > (DOWN_LEFT[1] + 1) * TILE, 'B 구간'
    assert triggers[3]['x'] + triggers[3]['w'] < end_c - RUN_SPEED, 'C 구간'
    door_west = {
        'type': 'door', 'id': 'run2_run_door', 'x': 0, 'y': ROWS_A[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_run', 'spawn': 'from_east', 'sfx': False,
    }
    # 오른쪽 끝 10px → 드럼통 길(jjajang_drum, BUILD242)
    door_east = {
        'type': 'door', 'id': 'run2_drum_door', 'x': WIDTH * TILE - 10, 'y': ROWS_C[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_drum', 'spawn': 'from_west', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '토리이 굽이 길',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'preload': ['assets/sprites/hyungsub-runner-prep.png', 'assets/sprites/hyungsub-runner-run.png', 'assets/sprites/hyungsub-runner-jump.png', 'assets/sprites/hyungsub-runner-slash.png', 'assets/sprites/hyungsub-runner-airslash.png',
                    'assets/props/run_leaf_1.png', 'assets/props/run_leaf_2.png', 'assets/props/run_branch.png', 'assets/props/run_needles.png'],
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ROWS_A[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ROWS_A[0] * TILE + 6, 'facing': 'right'},
            'before_b': {'x': (TORII_B + 4) * TILE + 8, 'y': ROWS_B[0] * TILE + 6, 'facing': 'left'},
            'before_c': {'x': 8 * TILE + 8, 'y': ROWS_C[0] * TILE + 6, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE - 8, 'y': ROWS_C[0] * TILE + 6, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROWS_A[0]], [DOWN_RIGHT[0], ROWS_A[0]], [DOWN_RIGHT[0], ROWS_B[0]], [DOWN_LEFT[0], ROWS_B[0]], [DOWN_LEFT[0], ROWS_C[0]], [WIDTH - 2, ROWS_C[0]]],
            'role': '파란 토리이 길 다음: A 오른쪽 달리기 → 밑길 → B 왼쪽 달리기 → 밑길 → C 오른쪽 달리기 → 오른쪽 끝(다음 맵 대기). 세 구간 모두 나뭇잎·솔잎·가지 장애물. 브금 my_castle_town 이어짐',
            'runRoadRows': [list(ROWS_A), list(ROWS_B), list(ROWS_C)],
            'runs': runs,
        },
        'entities': [*pines, *gates, *triggers, door_west, door_east],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_run2.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json')
    map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'runs', map_data['meta']['runs'])


if __name__ == '__main__':
    main()
