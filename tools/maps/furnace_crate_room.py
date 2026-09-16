"""용광로 화물 검사실 공용 생성기(BUILD193, youngcle15·16): 영클 공장 상자 밀기 메커니즘(youngcle3~5, factory_* 엔티티)을 용광로 구역(youngcle_furnace 배경·차콜/파랑 철 바닥 F·벽 G·Pandora Palace)에서 3상자로 더 어렵게.
방 구조는 youngcle5 와 같다: 바닥 rows 5~11 · cols 1~16, 운반 구역 cols 4~12 × rows 5~11(288×224, 베이지), 안내판 (3,6)·초기화 콘솔 (3,10), 차단문 col 14, 착지 cols 15~16.
출입구는 벽으로 막지 않는다: 가장자리 칸(col 0 / col 17, rows 7~9)은 걷는 출입구 타일 H, 문 트리거는 그 칸의 맵 끝 쪽 10px(끝까지 걸어가야 넘어간다, BUILD194).
배치는 9×7 ASCII(운반 구역): ',' 바닥 · '#' 격벽 · 'X' 발판 · 'C' 상자. 최소 밀기·해법은 tools/maps/crate_solver.py 로 잰 값을 넣는다(단위 테스트가 같은 규칙으로 다시 센다)."""
from __future__ import annotations

from typing import Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

WIDTH, HEIGHT = 18, 18
AREA_COL, AREA_ROW = 4, 5           # 운반 구역 왼쪽 위 칸
DIRS = {'R': (1, 0), 'L': (-1, 0), 'D': (0, 1), 'U': (0, -1)}


def parse(layout: list[str]):
    assert len(layout) == 7 and all(len(r) == 9 for r in layout), '운반 구역은 9×7'
    walls, plates, crates = [], [], []
    for ly, row in enumerate(layout):
        for lx, ch in enumerate(row):
            c = (AREA_COL + lx, AREA_ROW + ly)
            if ch == '#': walls.append(c)
            elif ch == 'X': plates.append(c)
            elif ch == 'C': crates.append(c)
    return walls, plates, crates


def simulate(crates: list[tuple[int, int]], solution: list[str]) -> list[tuple[int, int]]:
    """해법(['AR', 'BU', …])을 그대로 적용한 상자별 최종 칸 — solvedX/Y 에 쓴다"""
    pos = list(crates)
    for mv in solution:
        i = 'ABCDEFGH'.index(mv[0]); dx, dy = DIRS[mv[1]]
        pos[i] = (pos[i][0] + dx, pos[i][1] + dy)
    return pos


def bulkhead_rects(walls: list[tuple[int, int]]) -> list[tuple[int, int, int, int]]:
    """같은 열에서 이어진 격벽 칸을 하나의 사각형(32×h)으로 — youngcle5 처럼 두꺼운 벽 한 덩어리로 보이게"""
    rects, used = [], set()
    for c in sorted(walls, key=lambda c: (c[0], c[1])):
        if c in used: continue
        x, y = c; h = 1
        while (x, y + h) in walls: used.add((x, y + h)); h += 1
        used.add(c); rects.append((x * 32, y * 32, 32, h * 32))
    return rects


def build_room(*, map_id: str, name: str, layout: list[str], pushes: int, solution: list[str], difficulty: str,
               prev_map: str, prev_spawn: str, next_map: str | None, next_spawn: str | None, sign_label: str = '3개') -> dict[str, JsonValue]:
    flag, puzzle = f'{map_id}_crate_solved', f'{map_id}_crates'
    walls, plates, crates = parse(layout)
    final = simulate(crates, solution)
    assert sorted(final) == sorted(plates), f'해법 끝에 상자가 발판 위에 있어야 한다 {final} vs {plates}'
    rows = [['!'] * WIDTH for _ in range(HEIGHT)]
    for row in range(5, 12):
        for col in range(1, 17): rows[row][col] = 'F'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if rows[row][col] != 'F': continue
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    r, c = row + dr, col + dc
                    if 0 <= r < HEIGHT and 0 <= c < WIDTH and rows[r][c] == '!': rows[r][c] = 'G'
    # 출입구(rows 7~9): 왼쪽은 언제나, 오른쪽은 다음 맵이 없어도 열린 통로(다음 브리핑)
    for row in (7, 8, 9): rows[row][0] = 'H'; rows[row][WIDTH - 1] = 'H'
    entities: list[dict] = [
        {'type': 'door', 'id': f'{map_id}_left', 'x': 0, 'y': 224, 'w': 10, 'h': 96,
         'to': prev_map, 'spawn': prev_spawn, 'sfx': False, 'interact': False},
        {'type': 'factory_rail', 'id': f'{map_id}_rail_top', 'x': 32, 'y': 160, 'w': 512, 'h': 12},
        {'type': 'factory_rail', 'id': f'{map_id}_rail_bottom', 'x': 32, 'y': 384, 'w': 512, 'h': 12},
    ]
    if next_map:
        entities.append({'type': 'door', 'id': f'{map_id}_right', 'x': WIDTH * 32 - 10, 'y': 224, 'w': 10, 'h': 96,
                         'to': next_map, 'spawn': next_spawn, 'sfx': False, 'interact': False})
    entities += [
        {'type': 'factory_move_area', 'id': f'{map_id}_move_area', 'puzzle': puzzle, 'x': 128, 'y': 160, 'w': 288, 'h': 224},
        {'type': 'factory_sign', 'id': f'{map_id}_sign', 'x': 96, 'y': 208, 'label': sign_label, 'icon': '!', 'script': f'{map_id}_crate_sign'},
        {'type': 'factory_console', 'id': f'{map_id}_console', 'puzzle': puzzle, 'flag': flag, 'x': 96, 'y': 328,
         'resetCrates': True, 'script': 'youngcle_crate_reset', 'solvedScript': 'youngcle_crate_done'},
    ]
    for i, (x, y, w, h) in enumerate(bulkhead_rects(walls)):
        entities.append({'type': 'factory_bulkhead', 'id': f'{map_id}_bulkhead_{i + 1}', 'x': x, 'y': y, 'w': w, 'h': h})
    # 발판 → 차단문 배선(해결되면 켜짐): 발판 오른쪽에서 꺾어 문으로
    gate_ys = [176, 272, 368]
    for i, (px, py) in enumerate(sorted(plates, key=lambda c: c[1])):
        cx, cy = px * 32 + 16, py * 32 + 16; gy = gate_ys[min(i, len(gate_ys) - 1)]
        entities.append({'type': 'factory_wire', 'id': f'{map_id}_wire_{i + 1}', 'puzzle': puzzle, 'flag': flag,
                         'points': [[cx, cy], [cx + 24, cy], [cx + 24, gy], [448, gy]]})
    for i, (px, py) in enumerate(sorted(plates, key=lambda c: c[1])):
        entities.append({'type': 'factory_plate', 'id': f'{map_id}_plate_{i + 1}', 'puzzle': puzzle, 'flag': flag, 'x': px * 32, 'y': py * 32})
    for i, ((cx, cy), (fx, fy)) in enumerate(zip(crates, final)):
        entities.append({'type': 'factory_crate', 'id': f'{map_id}_crate_{"abc"[i]}', 'puzzle': puzzle, 'flag': flag,
                         'x': cx * 32 + 2, 'y': cy * 32 + 2, 'solvedX': fx * 32 + 2, 'solvedY': fy * 32 + 2})
    entities.append({'type': 'factory_gate', 'id': f'{map_id}_gate', 'flag': flag, 'x': 448, 'y': 160, 'w': 24, 'h': 224})
    return {
        'id': map_id, 'name': name, 'stage': 'void_fallen',
        'bgm': 'pandora_palace', 'backdrop': 'youngcle_furnace', 'battleBg': 'youngcle_factory', 'dim': 0.3,
        'rows': [''.join(r) for r in rows],
        'preload': ['assets/tiles/youngcle_iron_blue.png', 'assets/tiles/youngcle_iron_blue_wall.png', 'assets/tiles/youngcle_iron_blue_solid.png',
                    'assets/backdrops/youngcle_furnace.png', 'assets/props/factory_crate145.png'],
        'spawns': {
            'start': {'x': 64, 'y': 256, 'facing': 'right'},
            'left': {'x': 64, 'y': 256, 'facing': 'right'},
            'landing': {'x': 496, 'y': 256, 'facing': 'left'},
        },
        'meta': {
            'connected': True, 'puzzle': 'crate', 'difficulty': difficulty, 'pushes': pushes, 'solution': solution,
            'layout': layout, 'crateStarts': [[c[0] * 32 + 2, c[1] * 32 + 2] for c in crates],
            'plates': [[p[0] * 32, p[1] * 32] for p in sorted(plates, key=lambda c: c[1])], 'gate': [448, 160, 24, 224],
            'landing': [480, 160, 48, 224], 'moveArea': [4, 5, 9, 7],
        },
        'entities': entities,
    }
