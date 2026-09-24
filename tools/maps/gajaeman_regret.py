#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/gajaeman_regret.py [--check]
# ──────────────────
"""Build the western recovery bridge and two winding regret corridors."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

TILE: Final = 32
WALK_SPEED: Final = 218.4
BACKDROP: Final = 'castle-regret-depth'


def main() -> None:
    """Generate the connected route using the existing purple castle stonework."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/gajaeman_regret.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    synchronized = True
    for number in (0, 1, 2):
        bridge, first = number == 0, number == 1
        map_id = 'gajaeman_castle_left1' if bridge else f'gajaeman_regret{number}'
        width, height = (24, 40) if bridge else (42, 48) if first else (50, 54)
        route = ([(11, 35), (11, 5)] if bridge else
                 [(8, 44), (8, 30), (32, 30), (32, 10), (0, 10)] if first else
                 [(47, 45), (10, 45), (10, 25), (39, 25), (39, 6)])
        floor: set[tuple[int, int]] = set()
        if bridge:
            floor.update((col, row) for col in range(9, 15) for row in range(4, height))
            floor.update((col, row) for col in range(15, 18) for row in range(28, 32))
        else:
            for (x0, y0), (x1, y1) in zip(route, route[1:]):
                floor.update((col, row)
                             for col in range(max(0, min(x0, x1) - 1), min(width, max(x0, x1) + 3))
                             for row in range(max(0, min(y0, y1) - 1), min(height, max(y0, y1) + 3)))
            if first:
                floor.update((col, row) for col in range(7, 11) for row in range(44, height))
            else:
                floor.update((col, row) for col in range(47, width) for row in range(44, 48))
        cells = [[' '] * width for _ in range(height)]
        for col, row in floor:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                x, y = col + dx, row + dy
                if 0 <= x < width and 0 <= y < height and (x, y) not in floor:
                    cells[y][x] = '▥'
        for col, row in floor:
            variation = (col * 7 + row * 11) % 17
            cells[row][col] = '♠' if variation < 3 else '♣' if variation < 5 else '♦' if variation == 5 else '♜'
        if bridge:
            for row in range(4):
                for col in range(9, 15):
                    cells[row][col] = '▥'
            spawns = {'start': {'x': 372, 'y': 1120, 'facing': 'up'},
                      'from_regret': {'x': 372, 'y': 256, 'facing': 'down'},
                      'regret_door': {'x': 372, 'y': 160, 'facing': 'up'},
                      'spring': {'x': 532, 'y': 948, 'facing': 'up'}}
            entities = [
                {'type': 'door', 'id': 'castle_left_return',
                 'x': 288, 'y': height * TILE - 10, 'w': 192, 'h': 10,
                 'to': 'gajaeman_castle_lobby', 'spawn': 'from_left',
                 'interact': False, 'sfx': False},
                {'type': 'prop', 'id': 'castle_regret_door',
                 'image': 'assets/props/castle-memory-door.png',
                 'x': 336, 'y': 112, 'w': 96, 'h': 16, 'ix': 336, 'iy': 0,
                 'solid': True, 'sortY': 0, 'script': 'castle_regret_enter'},
                {'type': 'prop', 'id': 'castle_regret_sign',
                 'image': 'assets/props/signpost.png',
                 'x': 444, 'y': 128, 'w': 26, 'h': 12, 'ix': 444, 'iy': 110,
                 'solid': True, 'script': 'castle_regret_sign'},
                {'type': 'prop', 'id': 'castle_regret_spring',
                 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4},
                 'x': 528, 'y': 916, 'w': 32, 'h': 12, 'ix': 524, 'iy': 884,
                 'solid': True, 'script': 'maillard_spring'},
            ]
        else:
            encounters = [('yisub', 22, 30, ['yisub'])] if first else [
                ('syndrasub', 26, 45, ['syndrasub']),
                ('taliyahsub', 24, 25, ['taliyahsub', 'aurelionsub'])]
            entities = [
                {'type': 'enemy', 'id': enemy_id, 'sprite': enemy_id,
                 'x': col * TILE + 4, 'y': row * TILE + 8,
                 'facing': 'left' if first else 'right', 'wander': 16,
                 'chase': 170, 'speed': 42, 'enemies': enemies,
                 'bgm': 'castle_battle', 'unless': f'{map_id}_{enemy_id}_defeated'}
                for enemy_id, col, row, enemies in encounters
            ]
            if first:
                spawns = {'start': {'x': 260, 'y': 1416, 'facing': 'up'},
                          'from_next': {'x': 164, 'y': 328, 'facing': 'right'},
                          'before_yisub': {'x': 516, 'y': 968, 'facing': 'right'},
                          'end': {'x': 68, 'y': 328, 'facing': 'left'}}
                entities.extend([
                    {'type': 'door', 'id': 'regret1_return',
                     'x': 224, 'y': height * TILE - 10, 'w': 128, 'h': 10,
                     'to': 'gajaeman_castle_left1', 'spawn': 'from_regret',
                     'interact': False, 'sfx': False},
                    {'type': 'door', 'id': 'regret1_next',
                     'x': 0, 'y': 288, 'w': 10, 'h': 128,
                     'to': 'gajaeman_regret2', 'spawn': 'start',
                     'interact': False, 'sfx': False},
                ])
            else:
                spawns = {'start': {'x': 1412, 'y': 1448, 'facing': 'left'},
                          'before_syndrasub': {'x': 1028, 'y': 1448, 'facing': 'left'},
                          'before_taliyahsub': {'x': 580, 'y': 808, 'facing': 'right'},
                          'end': {'x': 1252, 'y': 200, 'facing': 'up'}}
                entities.append({'type': 'door', 'id': 'regret2_return',
                                 'x': width * TILE - 10, 'y': 1408, 'w': 10, 'h': 128,
                                 'to': 'gajaeman_regret1', 'spawn': 'from_next',
                                 'interact': False, 'sfx': False})
        distance = sum(abs(x1 - x0) + abs(y1 - y0) for (x0, y0), (x1, y1) in zip(route, route[1:])) * TILE
        map_data = {
            'id': map_id, 'name': '가재맨성 서쪽 회랑' if bridge else f'후회의 방 {number}',
            'stage': 'castle_lobby_seen', 'bgm': 'castle_regret', 'battleBg': 'castle_memory',
            'backdrop': BACKDROP, 'followScreenY': 250,
            'rows': [''.join(row) for row in cells],
            'preload': [f'assets/backdrops/{BACKDROP}.png', 'assets/tiles/gajaeman_castle_wall.png',
                        *(['assets/props/castle-memory-door.png', 'assets/props/signpost.png',
                           'assets/props/blue_buff.png'] if bridge else []),
                        *[f'assets/tiles/castle306_{suffix}.png'
                          for suffix in ('floor', 'moss', 'cracked', 'moss_dense')]],
            'spawns': spawns,
            'meta': {'connected': True, 'route': [list(point) for point in route],
                     'walkSeconds': round(distance / WALK_SPEED, 2)},
            'entities': entities,
        }
        output = Path(f'assets/maps/{map_id}.json')
        if '--check' in sys.argv:
            same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
            same = same and map_id in index['maps']
            synchronized = synchronized and same
            print(map_id, 'same' if same else 'DIFFERENT')
        else:
            _ = output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
            if map_id not in index['maps']:
                index['maps'].append(map_id)
            print('wrote', map_id, width, 'x', height)
    if '--check' in sys.argv:
        raise SystemExit(0 if synchronized else 1)
    _ = index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
