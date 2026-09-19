#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_chin2.py [--check]
# ──────────────────
"""찢칠라 길 2(jjajang_chin2, BUILD242 사용자 브리핑 2026-09-19): 찢칠라 길 1 다음. 파란 토리이 둘(14열·96열, 각각 달리기) → 중후반 186열 찢칠라(표준 조우) → 오른쪽 끝은 다음 맵 브리핑 대기(통로만 열어 둠)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_chin2'
WIDTH: Final = 240
HEIGHT: Final = 24                # BUILD244: 아래 샛길(20~21행)까지
TILE: Final = 32
ROAD_ROWS: Final = (8, 9)
RUN_SPEED: Final = 420
CAM_LEFT: Final = 0.22
SCREEN_W: Final = 480
ENEMY_COL: Final = 216            # 문코리타 자리(중후반, 샛길 뒤)
BRANCH_COLS: Final = (176, 177)   # 아래로 내려가는 샛길(BUILD244 사용자 “오른쪽으로만 있으니까 노잼, 아래로 가는 길·오른쪽으로 가는 길 + 마나샘”)
LOWER_ROWS: Final = (20, 21)      # 샛길 아래에서 오른쪽으로 이어지는 길
SPRING_COL: Final = 199           # 아래 길 끝의 마나샘(전체 회복, 소품 blue_buff 재사용)
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
    for row in ROAD_ROWS:
        for col in range(WIDTH):
            rows[row][col] = '*'
        rows[row][0] = '+'
        rows[row][WIDTH - 1] = '+'
    for row in range(ROAD_ROWS[1] + 1, LOWER_ROWS[1] + 1):
        for col in BRANCH_COLS:
            rows[row][col] = '*'
    for row in LOWER_ROWS:
        for col in range(BRANCH_COLS[0], SPRING_COL + 1):
            rows[row][col] = '*'
    cells: list[tuple[int, int]] = []
    for col in range(7, WIDTH - 6, 9):
        for row in (4, 12, 18):
            c, r = col + (row // 8) % 2 * 3, row + (col // 9) % 2
            if rows[r][c] != '@' or c <= 2:
                continue
            cells.append((c, r))
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(cells)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    gates: list[dict[str, object]] = []
    gates += torii('a', 14, ROAD_ROWS)
    gates += torii('b', 96, ROAD_ROWS)
    px_w = WIDTH * TILE
    def end_at(col: int) -> int:
        # 제동 목표: 카메라가 캐릭터를 화면 22% 에 둘 수 있는 자리(밑길 없이 곧은 길이라 오른쪽 클램프만)
        return min(col * TILE, px_w - SCREEN_W + int(SCREEN_W * CAM_LEFT) - 12)
    runs = {
        'a': {'dir': 1, 'endX': end_at(78), 'speed': RUN_SPEED, 'obstacles': True, 'seed': 61},
        'b': {'dir': 1, 'endX': end_at(160), 'speed': RUN_SPEED, 'obstacles': True, 'seed': 67},
    }
    triggers = [
        {'type': 'trigger', 'id': 'chin_torii_a', 'x': (14 + 2) * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_chin_start_a'},
        {'type': 'trigger', 'id': 'chin_torii_b', 'x': (96 + 2) * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_chin_start_b'},
    ]
    assert triggers[0]['x'] + triggers[0]['w'] < runs['a']['endX'] - RUN_SPEED, 'a 구간'
    assert runs['a']['endX'] + 400 < 96 * TILE, 'a 끝과 다음 토리이 사이 걷는 구간'
    assert triggers[1]['x'] + triggers[1]['w'] < runs['b']['endX'] - RUN_SPEED, 'b 구간'
    assert runs['b']['endX'] + 500 < ENEMY_COL * TILE, '달리기가 찢칠라 앞에서 끝난다'
    # 찢칠라(사용자 “몬스터를 중후반에”): 길 위에 서서(wander 0) 가까이 오면 다가와 닿으면 표준 조우. 이기면 플래그로 영구 제거
    # 마나샘: 아래 길 끝(199열)에 서 있고(막힘) C 로 전체 회복(jjajang_spring = maillard_spring 과 같은 동작)
    # 히트박스는 길 두 행(20~21행)을 세로로 덮어 어느 행에서 다가와도 C 가 닿는다(그림은 밑변 기준)
    spring_cx, spring_top, spring_base = SPRING_COL * TILE + 16, LOWER_ROWS[0] * TILE + 6, LOWER_ROWS[1] * TILE + 14
    spring = {'type': 'prop', 'id': 'chin2_spring', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4},
              'x': spring_cx - 16, 'y': spring_top, 'w': 32, 'h': spring_base - spring_top, 'ix': spring_cx - 20, 'iy': spring_base - 44, 'solid': True, 'script': 'jjajang_spring'}
    assert rows[(spring['y'] + 6) // TILE][(spring['x'] + 12) // TILE] == '*', '마나샘은 아래 길 위'
    # BUILD248 사용자 “두번째 찢칠라를 문코리타로”
    enemy = {'type': 'enemy', 'id': 'mun', 'sprite': 'munkorita', 'x': ENEMY_COL * TILE, 'y': ROAD_ROWS[0] * TILE + 4, 'facing': 'left', 'wander': 0, 'enemies': ['munkorita'], 'unless': f'{MAP_ID}_mun_defeated'}
    door_east = {'type': 'door', 'id': 'jjajang_chin2_east_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE, 'to': 'jjajang_think', 'spawn': 'from_west', 'sfx': False}   # BUILD245: 생각 길
    door_west = {'type': 'door', 'id': 'jjajang_chin2_west_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE, 'to': 'jjajang_chin1', 'spawn': 'from_east', 'sfx': False}
    return {
        'id': MAP_ID,
        'name': '찢칠라 길 2',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'preload': ['assets/sprites/hyungsub-runner-prep.png', 'assets/sprites/hyungsub-runner-run.png', 'assets/sprites/hyungsub-runner-jump.png', 'assets/sprites/hyungsub-runner-slash.png', 'assets/sprites/hyungsub-runner-upslash.png', 'assets/sprites/hyungsub-runner-airslash.png',
                    'assets/props/run_leaf_1.png', 'assets/props/run_leaf_2.png', 'assets/props/run_branch.png', 'assets/props/run_needles.png'],
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 2 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 2 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_torii_a': {'x': 10 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_torii_b': {'x': 92 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_chin': {'x': 208 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_branch': {'x': 170 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_spring': {'x': 190 * TILE + 8, 'y': LOWER_ROWS[0] * TILE + 6, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE - 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[2, ROAD_ROWS[0]], [BRANCH_COLS[0], ROAD_ROWS[0]], [BRANCH_COLS[0], LOWER_ROWS[0]], [SPRING_COL - 1, LOWER_ROWS[0]], [BRANCH_COLS[0], ROAD_ROWS[0]], [WIDTH - 2, ROAD_ROWS[0]]],
            'branch': {'cols': list(BRANCH_COLS), 'lowerRows': list(LOWER_ROWS), 'springCol': SPRING_COL},
            'role': '찢칠라 길 1 다음: 파란 토리이 둘 → 달리기 두 번(장애물) → 176열 샛길(아래 → 오른쪽, 끝에 마나샘 전체 회복) → 중후반 문코리타(표준 조우) → 오른쪽 문 → 생각 길(jjajang_think)',
            'runRoadRows': list(ROAD_ROWS),
            'runs': runs,
        },
        'entities': [*pines, *gates, *triggers, enemy, spring, door_west, door_east],
    }


def main() -> None:
    if '--help' in sys.argv:
        print(f'Usage: /usr/bin/python3 tools/maps/{MAP_ID}.py [--check]')
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, map_data['meta'].get('runs', ''))


if __name__ == '__main__':
    main()
