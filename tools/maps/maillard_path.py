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

WIDTH: Final = 188
HEIGHT: Final = 40
TILE: Final = 32
MAP_ID: Final = 'maillard_path'
APPROACH: Final = ((4, 31), (58, 31))
APPROACH_PIXELS: Final = [[column * TILE, row * TILE + TILE // 2] for column, row in APPROACH]
CART_START: Final = [1856, 986]
CART_END: Final = [4928, 986]
LANDING: Final = [5312, 1000]
WALKOUT: Final = ((158, 31), (184, 31), (184, 18), (168, 18), (168, 5), (184, 5))
WALKOUT_PIXELS: Final = [[column * TILE, row * TILE + TILE // 2] for column, row in WALKOUT]


def paint_path(grid: list[list[str]], points: tuple[tuple[int, int], ...]) -> None:
    for (column, row), (next_column, next_row) in zip(points, points[1:]):
        if column == next_column:
            for path_row in range(min(row, next_row), max(row, next_row) + 1):
                for path_column in range(column - 1, column + 2):
                    grid[path_row][path_column] = 'M'
        else:
            for path_column in range(min(column, next_column), max(column, next_column) + 1):
                for path_row in range(row - 1, row + 2):
                    grid[path_row][path_column] = 'M'


grid = [['!'] * WIDTH for _ in range(HEIGHT)]
paint_path(grid, APPROACH)
for path_column in range(1, 4):
    grid[31][path_column] = 'M'
for path_column in range(58, 160):
    grid[31][path_column] = 'M'
paint_path(grid, WALKOUT)
for pocket_row in range(28, 35):
    for pocket_column in range(176, 187):
        grid[pocket_row][pocket_column] = 'M'
for pocket_row in range(15, 22):
    for pocket_column in range(165, 173):
        grid[pocket_row][pocket_column] = 'M'
for pocket_row in range(2, 9):
    for pocket_column in range(176, 187):
        grid[pocket_row][pocket_column] = 'M'

rows = [''.join(row) for row in grid]
entities = [
    {'type': 'door', 'id': 'path_to_hold', 'x': 16, 'y': 960, 'w': 24, 'h': 96,
     'to': 'maillard_deck', 'spawn': 'from_path', 'sfx': False},
    {'type': 'raft', 'id': 'maillard_cart', 'image': 'assets/props/maillard-cart.png',
     'x': CART_START[0], 'y': CART_START[1], 'w': 238, 'h': 28,
     'route': [CART_END], 'speed': 128, 'flag': 'maillard_cart_done',
     'boardSfx': 'thud', 'arriveSfx': False, 'moveSfx': False,
     'cars': 3, 'carGap': 80, 'assetCrop': [61, 106, 134, 43], 'displaySize': [78, 25],
     'riderOffset': [80, 10], 'seatClipY': 3, 'disembarkPartyGap': 144,
     'passengerLookAfter': 8, 'passengerLookFacing': 'up',
     'passengerGap': 80, 'passengerOrder': ['ppaman', 'gyeongsub']},
    {'type': 'npc', 'id': 'sunrise_junhee', 'sprite': 'junhee', 'x': 5696, 'y': 936,
     'facing': 'right', 'wander': 0, 'solid': False},
    {'type': 'npc', 'id': 'sunrise_yongjun', 'sprite': 'yongjun', 'x': 5456, 'y': 552,
     'facing': 'right', 'wander': 0, 'solid': False},
    {'type': 'npc', 'id': 'sunrise_cs_red', 'sprite': 'cs_red', 'x': 5648, 'y': 104,
     'facing': 'right', 'wander': 0, 'solid': False},
    {'type': 'npc', 'id': 'sunrise_cs_blue', 'sprite': 'cs_blue', 'x': 5848, 'y': 104,
     'facing': 'left', 'wander': 0, 'solid': False},
]
map_data = {
    'id': MAP_ID, 'name': '마이야르호 일출 갑판', 'stage': 'void_fallen',
    'bgm': 'maillard_sunrise', 'dim': 0, 'backdrop': 'maillard_sunrise',
    'followScreenY': 292, 'rails': [[1856, 1007, 3310]],
    'sunrise': {'animated': True}, 'rows': rows,
    'preload': ['assets/tiles/maillard_deck.png', 'assets/backdrops/maillard_sunset.png',
                'assets/props/maillard_sun.png', 'assets/props/maillard-cart.png',
                'assets/backdrops/maillard_sea.png'],
    'spawns': {
        'start': {'x': 128, 'y': 1000, 'facing': 'right'},
        'from_hold': {'x': 128, 'y': 1000, 'facing': 'right'},
        'cart_landing': {'x': LANDING[0], 'y': LANDING[1], 'facing': 'right'},
    },
    'meta': {
        'connected': True,
        'sunriseRoute': APPROACH_PIXELS,
        'sunriseWalkout': WALKOUT_PIXELS,
        'sunriseCart': {
            'duration': 24,
            'order': ['player', 'ppaman', 'gyeongsub'],
            'departure': CART_START,
            'landing': LANDING,
        },
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
