#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/gajaeman_boulder.py [--check]
# ──────────────────
"""Build the cooperative boulder bridge and its left-seal chamber."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final, TypedDict

BRIDGE_ID: Final = 'gajaeman_castle_boulder'
ORB_ID: Final = 'gajaeman_castle_left_orb'
TILE: Final = 32


class MapIndex(TypedDict):
    maps: list[str]


class OrbEntity(TypedDict):
    id: str
    script: str


class OrbMap(TypedDict):
    id: str
    name: str
    stage: str
    entities: list[OrbEntity]


def main() -> None:
    """Generate the bridge from the regret region's existing floor and depth art."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/gajaeman_boulder.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    width, height = 112, 48
    floor = {(col, row) for col in range(7, 16) for row in range(14, height)}
    floor.update((col, row) for col in range(7, 107) for row in range(14, 25))
    floor.update((col, row) for col in range(90, 96) for row in range(12, 15))
    cells = [[' '] * width for _ in range(height)]
    for col, row in floor:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            x, y = col + dx, row + dy
            if 0 <= x < width and 0 <= y < height and (x, y) not in floor:
                cells[y][x] = '▥'
    for col, row in floor:
        variation = (col * 7 + row * 11) % 17
        cells[row][col] = '♠' if variation < 3 else '♣' if variation < 5 else '♦' if variation == 5 else '♜'
    for row in range(7, 32):
        for col in range(107, width):
            cells[row][col] = '▥'
    for row in (*range(7, 14), *range(25, 32)):
        for col in range(102, 107):
            cells[row][col] = '▥'
    for row in range(7, 14):
        for col in range(96, 102):
            cells[row][col] = '▥'
    anchors = {'start': [356, 1416], 'bend': [356, 648], 'approach': [804, 648],
               'push': [1540, 648], 'finish': [3044, 648], 'guard_return': [2960, 648],
               'nunu': [2140, 795], 'boulder': [1810, 628]}
    actor_positions = [
        ('boulder_bidet', 'warm_bidet', 340, 1240, 'up', False),
        ('boulder_mario', 'mini_mario', 404, 1176, 'up', False),
        ('boulder_youngcle', 'youngcle_hover', 1500, 550, 'right', False),
        ('boulder_junhee', 'junhee', 1600, 640, 'right', False),
        ('boulder_ttuulla', 'ttuulla', 692, 612, 'right', True),
        ('boulder_park', 'park_guardian_costume', 628, 688, 'right', True),
        ('boulder_gyeongsub', 'gyeongsub', 2896, 576, 'right', True),
        ('boulder_ppaman', 'ppaman', 2960, 704, 'right', True),
    ]
    entities = [
        {'type': 'npc', 'id': actor_id, 'sprite': sprite, 'x': x, 'y': y,
         'facing': facing, 'solid': True, 'wander': 0, 'hidden': hidden,
         **({'visualScale': 2.22} if actor_id == 'boulder_park' else {}),
         **({'visualScale': 1.79} if actor_id == 'boulder_ttuulla' else {})}
        for actor_id, sprite, x, y, facing, hidden in actor_positions
    ]
    entities.extend([
        {'type': 'door', 'id': 'castle_boulder_return',
         'x': 224, 'y': height * TILE - 10, 'w': 288, 'h': 10,
         'to': 'gajaeman_regret2', 'spawn': 'from_boulder', 'interact': False, 'sfx': False},
        {'type': 'prop', 'id': 'castle_boulder_orb_door',
         'image': 'assets/props/castle-memory-door.png',
         'x': 2912, 'y': 384, 'w': 96, 'h': 16, 'ix': 2912, 'iy': 272,
         'solid': True, 'sortY': 0, 'script': 'castle_boulder_orb_enter'},
        {'type': 'prop', 'id': 'castle_boulder_wall',
         'image': 'assets/props/castle-boulder-wall316.png',
         'x': 3144, 'y': 466, 'w': 280, 'h': 378, 'ix': 3088, 'iy': 364,
         'scale': 1.5, 'solid': True, 'requires': 'castle_boulder_done'},
        {'type': 'trigger', 'id': 'castle_boulder_back_guard',
         'x': 2816, 'y': 448, 'w': 32, 'h': 352,
         'script': 'castle_boulder_back'},
    ])
    bridge = {
        'id': BRIDGE_ID, 'name': '가재맨성 거석 회랑', 'stage': 'castle_pipe_returned',
        'bgm': None, 'backdrop': 'castle-regret-depth', 'followScreenY': 240,
        'enter': {'script': 'castle_boulder_intro'},
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/backdrops/castle-regret-depth.png',
                    'assets/tiles/gajaeman_castle_wall.png',
                    'assets/sprites/park_guardian_costume.png', 'assets/sprites/ttuulla.png',
                    'assets/props/castle-memory-door.png',
                    'assets/props/castle-boulder316.png', 'assets/props/castle-boulder-wall316.png',
                    'assets/enemies/nunusub316.png'],
        'spawns': {'start': {'x': 356, 'y': 1416, 'facing': 'up'},
                   'from_orb': {'x': 2948, 'y': 544, 'facing': 'down'},
                   'orb_door': {'x': 2948, 'y': 448, 'facing': 'up'},
                   **{f'boulder_{key}': {'x': value[0], 'y': value[1], 'facing': 'right'}
                      for key, value in anchors.items() if key not in ('nunu', 'boulder')}},
        'meta': {'connected': True,
                 'boulder': {'bridge': [224, 448, 3200, 352], 'anchors': anchors,
                             'wallX': 3424, 'guardX': 2848,
                             'orbDoor': [2912, 384, 96, 16]}},
        'entities': entities,
    }
    orb: OrbMap = json.loads(Path('assets/maps/gajaeman_castle_orb.json').read_text(encoding='utf-8'))
    orb.update({'id': ORB_ID, 'name': '왼쪽 봉인의 방', 'stage': 'castle_pipe_returned'})
    orb['entities'][0]['script'] = 'castle_left_orb_touch'
    orb['entities'][1].update({'id': 'castle_left_orb_exit', 'script': 'castle_left_orb_return'})
    index_path = Path('assets/maps/index.json')
    index: MapIndex = json.loads(index_path.read_text(encoding='utf-8'))
    synchronized = True
    for map_id, data in ((BRIDGE_ID, bridge), (ORB_ID, orb)):
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
