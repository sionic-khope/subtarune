#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/gajaeman_memory.py [--check]
# ──────────────────
"""Generate two connected castle memory corridors with separate field encounters."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

TILE: Final = 32
WALK_SPEED: Final = 218.4


def main() -> None:
    """Build deterministic routes while preserving the existing castle material set."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/gajaeman_memory.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    synchronized = True
    for number in (1, 2):
        map_id = f'gajaeman_memory{number}'
        first = number == 1
        width, height = (42, 48) if first else (50, 58)
        route = ([(8, 44), (8, 26), (35, 26), (35, 7), (0, 7)] if first
                 else [(47, 49), (8, 49), (8, 26), (40, 26), (40, 5)])
        floor: set[tuple[int, int]] = set()
        for (x0, y0), (x1, y1) in zip(route, route[1:]):
            for col in range(min(x0, x1) - 1, max(x0, x1) + 3):
                for row in range(min(y0, y1) - 1, max(y0, y1) + 3):
                    if 0 <= col < width and 0 <= row < height and (first or row >= 5):
                        floor.add((col, row))
        if first:
            floor.update((col, row) for col in range(7, 11) for row in range(44, height))
        else:
            floor.update((col, row) for col in range(47, width) for row in range(48, 52))
        cells = [[' '] * width for _ in range(height)]
        for col, row in floor:
            for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
                x, y = col + dx, row + dy
                if 0 <= x < width and 0 <= y < height and (x, y) not in floor:
                    cells[y][x] = '♨' if (x + y) % 3 else '♩'
        for col, row in floor:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                x, y = col + dx, row + dy
                if 0 <= x < width and 0 <= y < height and (x, y) not in floor:
                    cells[y][x] = '▦'
        for col, row in floor:
            cells[row][col] = '♧' if (col * 3 + row * 7) % 19 < 2 else '♤'
        for row in (0, height - 1):
            for col in range(width):
                if (col, row) not in floor and cells[row][col] != ' ':
                    cells[row][col] = '▦'
        for col in (0, width - 1):
            for row in range(height):
                if (col, row) not in floor and cells[row][col] != ' ':
                    cells[row][col] = '▦'
        enemy_cells = [('seobruto', 24, 26)] if first else [('jiroesub', 24, 49), ('udyrsub', 29, 26)]
        enemies = [
            {'type': 'enemy', 'id': enemy_id, 'sprite': enemy_id,
             'x': col * TILE + 4, 'y': row * TILE + 8,
             'facing': 'left' if first else 'right', 'wander': 16,
             'chase': 170, 'speed': 42, 'enemies': [enemy_id],
             'bgm': 'castle_battle', 'unless': f'{map_id}_{enemy_id}_defeated'}
            for enemy_id, col, row in enemy_cells
        ]
        if first:
            spawns = {'start': {'x': 260, 'y': 1416, 'facing': 'up'},
                      'from_next': {'x': 68, 'y': 232, 'facing': 'right'},
                      'before_seobruto': {'x': 580, 'y': 840, 'facing': 'right'},
                      'end': {'x': 68, 'y': 232, 'facing': 'left'}}
            doors = [
                {'type': 'door', 'id': 'memory1_return', 'x': 224, 'y': height * TILE - 10,
                 'w': 128, 'h': 10, 'to': 'gajaeman_castle_right1', 'spawn': 'from_memory',
                 'interact': False, 'sfx': False},
                {'type': 'door', 'id': 'memory1_next', 'x': 0, 'y': 192, 'w': 10, 'h': 128,
                 'to': 'gajaeman_memory2', 'spawn': 'start', 'interact': False, 'sfx': False},
            ]
        else:
            spawns = {'start': {'x': 1508, 'y': 1576, 'facing': 'left'},
                      'before_jiroesub': {'x': 964, 'y': 1576, 'facing': 'left'},
                      'before_udyrsub': {'x': 740, 'y': 840, 'facing': 'right'},
                      'end': {'x': 1284, 'y': 200, 'facing': 'up'}}
            doors = [
                {'type': 'door', 'id': 'memory2_return', 'x': width * TILE - 10, 'y': 1536,
                 'w': 10, 'h': 128, 'to': 'gajaeman_memory1', 'spawn': 'from_next',
                 'interact': False, 'sfx': False},
            ]
        distance = sum(abs(x1 - x0) + abs(y1 - y0) for (x0, y0), (x1, y1) in zip(route, route[1:])) * TILE
        map_data = {
            'id': map_id, 'name': f'기억의 방 {number}', 'stage': 'castle_lobby_seen',
            'bgm': 'castle_right', 'battleBg': 'castle_memory',
            'backdrop': 'castle307_right', 'followScreenY': 250,
            'rows': [''.join(row) for row in cells],
            'preload': ['assets/backdrops/castle307_right.png', 'assets/tiles/castle308_wall.png',
                        *[f'assets/tiles/castle307_{suffix}.png'
                          for suffix in ('floor', 'moss', 'lava', 'lava_dark')]],
            'spawns': spawns,
            'meta': {'connected': True, 'route': [list(point) for point in route],
                     'walkSeconds': round(distance / WALK_SPEED, 2)},
            'entities': [*enemies, *doors],
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
