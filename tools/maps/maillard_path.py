#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/maillard_path.py [--check]
# ──────────────────
import json
from pathlib import Path
import sys
from typing import Final

WIDTH: Final = 75
HEIGHT: Final = 25
TILE: Final = 32
MAP_ID: Final = 'maillard_path'
ROUTE: Final = ((72, 18), (19, 18))
ROUTE_PIXELS: Final = [[column * TILE, row * TILE + TILE // 2] for column, row in ROUTE]
RAILS: Final = [
    [2304, 544, 608, 544], [2304, 640, 608, 640],
]
CASTERS: Final = [[2048, 544], [1536, 544], [1024, 544], [672, 544]]
WALKOUT: Final = ((64, 14), (38, 14), (38, 6), (5, 6), (5, 2))
WALKOUT_PIXELS: Final = [[column * TILE, row * TILE + TILE // 2] for column, row in WALKOUT]

grid = [[' '] * WIDTH for _ in range(HEIGHT)]
for (column, row), (next_column, next_row) in zip(ROUTE, ROUTE[1:]):
    if column == next_column:
        for path_row in range(min(row, next_row), max(row, next_row) + 1):
            for path_column in range(column - 1, column + 2):
                grid[path_row][path_column] = 'M'
    else:
        for path_column in range(min(column, next_column), max(column, next_column) + 1):
            for path_row in range(row - 1, row + 2):
                grid[path_row][path_column] = 'M'

for path_row in range(17, 20):
    for path_column in range(73, WIDTH - 1):
        grid[path_row][path_column] = 'M'
for (column, row), (next_column, next_row) in zip(WALKOUT, WALKOUT[1:]):
    if column == next_column:
        for path_row in range(min(row, next_row), max(row, next_row) + 1):
            for path_column in range(column - 1, column + 2):
                grid[path_row][path_column] = 'M'
    else:
        for path_column in range(min(column, next_column), max(column, next_column) + 1):
            for path_row in range(row - 1, row + 2):
                grid[path_row][path_column] = 'M'
for pocket_row in range(11, 16):
    for pocket_column in range(47, 56):
        grid[pocket_row][pocket_column] = 'M'
for pocket_row in range(5, 10):
    for pocket_column in range(36, 42):
        grid[pocket_row][pocket_column] = 'M'
for pocket_row in range(4, 9):
    for pocket_column in range(15, 21):
        grid[pocket_row][pocket_column] = 'M'
for pocket_row in range(1, 5):
    for pocket_column in range(2, 11):
        grid[pocket_row][pocket_column] = 'M'

rows = [''.join(row) for row in grid]
entities = [
    {'type': 'door', 'id': 'path_to_hold', 'x': 2336, 'y': 544, 'w': 24, 'h': 96,
     'to': 'maillard_deck', 'spawn': 'from_path', 'sfx': False},
    {'type': 'trigger', 'id': 'cart_board', 'x': 560, 'y': 544, 'w': 72, 'h': 96,
     'script': 'maillard_cart_board', 'unless': 'maillard_cart_done'},
    {'type': 'npc', 'id': 'sunrise_junhee', 'sprite': 'junhee', 'x': 1636, 'y': 392,
     'facing': 'left', 'wander': 0, 'solid': False},
    {'type': 'npc', 'id': 'sunrise_yongjun', 'sprite': 'yongjun', 'x': 1252, 'y': 200,
     'facing': 'left', 'wander': 0, 'solid': False},
    {'type': 'npc', 'id': 'sunrise_cs_red', 'sprite': 'cs_red', 'x': 580, 'y': 200,
     'facing': 'left', 'wander': 0, 'solid': False},
    {'type': 'npc', 'id': 'sunrise_cs_blue', 'sprite': 'cs_blue', 'x': 196, 'y': 72,
     'facing': 'down', 'wander': 0, 'solid': False},
]
map_data = {
    'id': MAP_ID, 'name': '마이야르호 일출 갑판', 'stage': 'void_fallen', 'bgm': 'wind',
    'dim': 0, 'backdrop': 'maillard_sunrise', 'sunrise': {'animated': True}, 'rows': rows,
    'preload': ['assets/tiles/maillard_deck.png', 'assets/backdrops/maillard_sunset.png',
                'assets/props/maillard_sun.png', 'assets/props/maillard-cart.png',
                'assets/backdrops/maillard_sea.png'],
    'spawns': {
        'start': {'x': 2308, 'y': 584, 'facing': 'left'},
        'from_hold': {'x': 2308, 'y': 584, 'facing': 'left'},
        'cart_landing': {'x': 1920, 'y': 456, 'facing': 'left'},
    },
    'meta': {
        'connected': False,
        'sunriseRoute': ROUTE_PIXELS,
        'sunriseWalkout': WALKOUT_PIXELS,
        'sunriseRails': {'lines': RAILS},
        'sunriseCasters': CASTERS,
        'sunriseCart': {'duration': 20, 'order': ['player', 'ppaman', 'gyeongsub'],
                        'departure': [608, 592], 'landing': [1920, 456]},
    },
    'entities': entities,
}

output = Path(f'assets/maps/{MAP_ID}.json')
index_path = Path('assets/maps/index.json')
index = json.loads(index_path.read_text(encoding='utf-8'))
if '--check' in sys.argv:
    same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
    registered = MAP_ID in index['maps']
    print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
    sys.exit(0 if same and registered else 1)
output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
if MAP_ID not in index['maps']:
    index['maps'].append(MAP_ID)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)
