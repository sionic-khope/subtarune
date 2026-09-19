#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_chin1.py [--check]
# ──────────────────
"""찢칠라 길 1(jjajang_chin1, BUILD242 사용자 브리핑 2026-09-19):
"다음맵이고 뒤로는 못감 뒤로 가려하면 채팅으로 지금은 그럴때가 아닌것같다. 가 뜨고 뒤로한발짝 가게하는 보호장치 달아줘, 거기에 이제 파란 토리이 한두개 있고 몬스터를 중후반에 만들건데 … 파란토리이, 찢칠라맵 적당히 두개정도"
- 드럼통 길 연출이 요플래를 여기 왼쪽 가장자리(from_west, 2열)로 보낸다. 왼쪽 문은 없고 0~16px 트리거(매번) → jjajang_no_return(나레이션 “지금은 그럴때가 아닌것같다.” + 오른쪽으로 한 칸).
- 파란 토리이 14열 → 16~17열 트리거 → 러너(meta.runs.a, 장애물) → 88열 앞에서 제동 → 걸어서 112열 찢칠라(필드 적, 표준 조우) → 오른쪽 문 → 찢칠라 길 2."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_chin1'
WIDTH: Final = 150
HEIGHT: Final = 14
TILE: Final = 32
ROAD_ROWS: Final = (8, 9)
RUN_SPEED: Final = 420
CAM_LEFT: Final = 0.22
SCREEN_W: Final = 480
ENEMY_COL: Final = 112            # 찢칠라 자리(중후반)
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
    cells: list[tuple[int, int]] = []
    for col in range(7, WIDTH - 6, 9):
        for row in (4, 12):
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
    px_w = WIDTH * TILE
    def end_at(col: int) -> int:
        # 제동 목표: 카메라가 캐릭터를 화면 22% 에 둘 수 있는 자리(밑길 없이 곧은 길이라 오른쪽 클램프만)
        return min(col * TILE, px_w - SCREEN_W + int(SCREEN_W * CAM_LEFT) - 12)
    runs = {
        'a': {'dir': 1, 'endX': end_at(88), 'speed': RUN_SPEED, 'obstacles': True, 'seed': 53},
    }
    triggers = [
        {'type': 'trigger', 'id': 'chin_torii_a', 'x': (14 + 2) * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_chin_start_a'},
    ]
    assert triggers[0]['x'] + triggers[0]['w'] < runs['a']['endX'] - RUN_SPEED, 'a 구간'
    assert runs['a']['endX'] + 500 < ENEMY_COL * TILE, '달리기가 찢칠라 앞에서 끝난다'
    # 찢칠라(사용자 “몬스터를 중후반에”): 길 위에 서서(wander 0) 가까이 오면 다가와 닿으면 표준 조우. 이기면 플래그로 영구 제거
    enemy = {'type': 'enemy', 'id': 'chin', 'sprite': 'chinchilla', 'x': ENEMY_COL * TILE, 'y': ROAD_ROWS[0] * TILE + 4, 'facing': 'left', 'wander': 0, 'enemies': ['chinchilla'], 'unless': f'{MAP_ID}_chin_defeated'}
    # 뒤로 못 감(사용자): 왼쪽 가장자리 16px 트리거(매번) → 나레이션 + 한 발짝 오른쪽으로
    guard = {'type': 'trigger', 'id': 'chin_no_return', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 16, 'h': 2 * TILE, 'script': 'jjajang_no_return'}
    door_east = {'type': 'door', 'id': 'jjajang_chin1_east_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE, 'to': 'jjajang_chin2', 'spawn': 'from_west', 'sfx': False}
    return {
        'id': MAP_ID,
        'name': '찢칠라 길 1',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'preload': ['assets/sprites/hyungsub-runner-prep.png', 'assets/sprites/hyungsub-runner-run.png', 'assets/sprites/hyungsub-runner-jump.png', 'assets/sprites/hyungsub-runner-slash.png', 'assets/sprites/hyungsub-runner-airslash.png',
                    'assets/props/run_leaf_1.png', 'assets/props/run_leaf_2.png', 'assets/props/run_branch.png', 'assets/props/run_needles.png'],
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 2 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 2 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_torii': {'x': 10 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_chin': {'x': 104 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE - 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[2, ROAD_ROWS[0]], [WIDTH - 2, ROAD_ROWS[0]]],
            'role': '드럼통 길 다음(요플래 혼자): 왼쪽 가장자리는 되돌아갈 수 없다(나레이션 + 한 발짝), 파란 토리이 하나 → 달리기(장애물) → 중후반 찢칠라(표준 조우) → 오른쪽 문 → 찢칠라 길 2',
            'runRoadRows': list(ROAD_ROWS),
            'runs': runs,
        },
        'entities': [*pines, *gates, *triggers, enemy, guard, door_east],
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
