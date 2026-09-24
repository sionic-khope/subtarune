#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/gajaeman_dark_path.py [--check]
# ──────────────────
"""Generate the black footstep-revealed corridor from its collision tiles."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final, TypedDict

PATH_ID: Final = 'gajaeman_castle_dark_path'
ARRIVAL_ID: Final = 'gajaeman_castle_dark_arrival'
REFUGE_ID: Final = 'gajaeman_castle_dark_refuge'


class MapIndex(TypedDict):
    maps: list[str]


def main() -> None:
    """Emit the connected castle darkness route from its collision tiles."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/gajaeman_dark_path.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * 110 for _ in range(112)]
    floor = {(col, row) for col in range(7, 10) for row in range(58, 112)}
    floor.update((col, row) for col in range(7, 104) for row in range(58, 61))
    floor.update((col, row) for col in range(101, 104) for row in range(0, 61))
    for col, row in floor:
        cells[row][col] = '♤'
    route = [[260, 3448], [260, 1896], [3268, 1896], [3268, 40]]
    path = {
        'id': PATH_ID, 'name': '가재맨성 검은 길', 'stage': 'castle_gate_reunion_done',
        'bgm': None, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_dark_path_intro'},
        'spawns': {'start': {'x': 260, 'y': 3448, 'facing': 'up'},
                   'from_next': {'x': 3268, 'y': 136, 'facing': 'down'},
                   'turn1': {'x': 260, 'y': 1896, 'facing': 'right'},
                   'turn2': {'x': 3268, 'y': 1896, 'facing': 'up'},
                   'end': {'x': 3268, 'y': 40, 'facing': 'up'}},
        'meta': {'connected': True, 'darkPath': True, 'corridorWidth': 96,
                 'route': route, 'walkSeconds': round(6416 / 218.4, 2)},
        'entities': [
            {'type': 'door', 'id': 'castle_dark_return', 'x': 224, 'y': 3574, 'w': 96, 'h': 10,
             'to': 'gajaeman_castle_lobby', 'spawn': 'from_dark', 'interact': False, 'sfx': False},
            {'type': 'door', 'id': 'castle_dark_exit', 'x': 3232, 'y': 0, 'w': 96, 'h': 10,
             'to': ARRIVAL_ID, 'spawn': 'start', 'interact': False, 'sfx': False},
        ],
    }
    chase_route = [[228, 240], [228, 104], [1188, 104], [1188, 1480],
                   [2276, 1480], [2276, 680], [3268, 680], [3268, 104],
                   [4164, 104], [4164, 1448], [5060, 1448], [5060, 40]]
    arrival_cells = [[' '] * 162 for _ in range(50)]
    chase_floor = {(col, row) for col in range(6, 9) for row in range(2, 20)}
    for (x0, y0), (x1, y1) in zip(chase_route, chase_route[1:]):
        for col in range((min(x0, x1) + 12) // 32 - 1, (max(x0, x1) + 12) // 32 + 2):
            for row in range(max(0, (min(y0, y1) + 8) // 32 - 1), (max(y0, y1) + 8) // 32 + 2):
                chase_floor.add((col, row))
    chase_floor.update((col, 1) for col in range(101, 104))
    for col, row in chase_floor:
        arrival_cells[row][col] = '♤'
    arrival = {
        'id': ARRIVAL_ID, 'name': '가재맨성 어둠의 추격로', 'stage': 'castle_gate_reunion_done', 'bgm': None,
        'rows': [''.join(row) for row in arrival_cells],
        'enter': {'script': 'castle_dark_chase_intro'},
        'preload': ['assets/enemies/castle-dark-pursuer.png'],
        'spawns': {'start': {'x': 228, 'y': 240, 'facing': 'up'},
                   'from_refuge': {'x': 5060, 'y': 136, 'facing': 'down'},
                   'end': {'x': 5060, 'y': 40, 'facing': 'up'}},
        'meta': {'connected': True, 'darkPath': True, 'corridorWidth': 96,
                 'darkChase': {'entry': [228, 240], 'monsterSpawn': [228, 540], 'route': chase_route}},
        'entities': [{'type': 'door', 'id': 'castle_dark_chase_exit',
                      'x': 5024, 'y': 0, 'w': 96, 'h': 10,
                      'to': REFUGE_ID, 'spawn': 'start', 'interact': False, 'sfx': False}],
    }
    refuge_cells = [[' '] * 24 for _ in range(22)]
    refuge_floor = {(col, row) for col in range(4, 20) for row in range(10, 20)}
    # BUILD326: 탈출 뒤 잠긴 남쪽 통로는 열린 길처럼 보이지 않게 벽으로 닫는다(되돌아가기 = 나레이션만)
    for col, row in refuge_floor:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            x, y = col + dx, row + dy
            if 0 <= x < 24 and 0 <= y < 22 and (x, y) not in refuge_floor:
                refuge_cells[y][x] = '▥'
        variation = (col * 7 + row * 11) % 17
        refuge_cells[row][col] = '♠' if variation < 3 else '♣' if variation < 5 else '♦' if variation == 5 else '♜'
    for row in range(9):
        for col in range(3, 21):
            refuge_cells[row][col] = '▥'
    # BUILD323: 아래 입구 통로 양옆도 벽으로 닫는다 — 도착 구도에서 원경이 뚫린 구멍처럼 비치지 않게
    for row in (20, 21):
        for col in range(3, 21):
            if (col, row) not in refuge_floor:
                refuge_cells[row][col] = '▥'
    refuge = {
        'id': REFUGE_ID, 'name': '가재맨성 마지막 문 앞', 'stage': 'castle_gate_reunion_done',
        'bgm': None, 'bgmVolume': 0.2, 'backdrop': 'castle-regret-depth', 'dim': 0.18, 'followScreenY': 250,
        'rows': [''.join(row) for row in refuge_cells],
        'enter': {'script': 'castle_dark_chase_finish'},
        'preload': ['assets/backdrops/castle-regret-depth.png', 'assets/props/castle306_gate.png',
                    'assets/props/blue_buff.png'],
        'spawns': {'start': {'x': 372, 'y': 560, 'facing': 'up'},
                   'spring': {'x': 548, 'y': 516, 'facing': 'up'},
                   'final_door': {'x': 372, 'y': 336, 'facing': 'up'},
                   'from_cathedral': {'x': 372, 'y': 360, 'facing': 'down'}},
        'meta': {'connected': True},
        'entities': [
            {'type': 'prop', 'id': 'castle_dark_refuge_spring',
             'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4},
             'x': 544, 'y': 480, 'w': 32, 'h': 12, 'ix': 540, 'iy': 448,
             'solid': True, 'script': 'maillard_spring'},
            {'type': 'prop', 'id': 'castle_final_gate',
             'image': 'assets/props/castle306_gate.png', 'scale': 0.6875,
             'x': 296, 'y': 304, 'w': 176, 'h': 16, 'ix': 296, 'iy': 100,
             'solid': True, 'sortY': 0},
            {'type': 'trigger', 'id': 'castle_dark_refuge_return',
             'x': 288, 'y': 626, 'w': 192, 'h': 10, 'script': 'castle_dark_refuge_locked'},
            {'type': 'door', 'id': 'castle_cathedral_entry',
             'x': 296, 'y': 312, 'w': 176, 'h': 16,
             'to': 'gajaeman_castle_cathedral', 'spawn': 'entry', 'interact': True, 'sfx': False},
        ],
    }
    index_path = Path('assets/maps/index.json')
    index: MapIndex = json.loads(index_path.read_text(encoding='utf-8'))
    synchronized = True
    for map_id, data in ((PATH_ID, path), (ARRIVAL_ID, arrival), (REFUGE_ID, refuge)):
        output = Path(f'assets/maps/{map_id}.json')
        if '--check' in sys.argv:
            same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == data
            same = same and map_id in index['maps']
            synchronized = synchronized and same
            print(map_id, 'same' if same else 'DIFFERENT')
        else:
            _ = output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
            if map_id not in index['maps']:
                index['maps'].append(map_id)
            print('wrote', map_id)
    if '--check' in sys.argv:
        raise SystemExit(0 if synchronized else 1)
    _ = index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
