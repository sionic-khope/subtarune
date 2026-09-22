#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/jjajang_night_cliff.py [--check]
# ──────────────────
"""Moonlit rocky shelf beyond Sakura 8; generated art supplies the visible terrain."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final, TypedDict

MAP_ID: Final = 'jjajang_night_cliff'
WIDTH: Final = 35
HEIGHT: Final = 14
CLIFF: Final = 'assets/props/jjajang_night_cliff.png'
SEA: Final = 'assets/backdrops/jjajang_night_sea.png'


class Entity(TypedDict, total=False):
    """Existing map entity fields used by this scene."""
    type: str
    id: str
    x: int
    y: int
    w: int
    h: int
    ix: int
    iy: int
    solid: bool
    hidden: bool
    image: str
    sortY: int
    sprite: str
    facing: str
    wander: int
    unless: str
    to: str
    spawn: str
    sfx: bool


class Spawn(TypedDict):
    x: int
    y: int
    facing: str


class Entry(TypedDict):
    script: str
    flag: str
    early: bool


class MapData(TypedDict):
    id: str
    name: str
    stage: str
    bgm: None
    backdrop: str
    rows: list[str]
    preload: list[str]
    spawns: dict[str, Spawn]
    enter: Entry
    entities: list[Entity]


def build_map() -> MapData:
    """Keep the ledge collision separate from both generated image silhouettes."""
    rows = [['!'] * WIDTH for _ in range(HEIGHT)]
    for row in (6,):
        for col in range(21):
            rows[row][col] = ')' if col < 3 else 'r'
    anchors: list[Entity] = [
        {'type': 'prop', 'id': name, 'image': CLIFF, 'x': x, 'y': y,
         'w': 24, 'h': 16, 'solid': False, 'hidden': True}
        for name, x, y in (
            ('night_approach', 560, 199), ('night_edge', 644, 199),
            ('night_vista', 800, 220), ('night_exit', 736, 370),
        )
    ]
    actors: list[Entity] = [
        {'type': 'npc', 'id': name, 'sprite': name, 'x': x, 'y': 199,
         'solid': False, 'facing': 'right', 'wander': 0,
         'unless': 'night_cliff_scene_done'}
        for name, x in (('gyeongsub', 200), ('choimis', 644))
    ]
    return {
        'id': MAP_ID, 'name': '달빛 절벽', 'stage': 'ship_sinking_done',
        'bgm': None, 'backdrop': 'jjajang_night_sea',
        'rows': [''.join(row) for row in rows], 'preload': [CLIFF, SEA],
        'spawns': {
            'start': {'x': 36, 'y': 199, 'facing': 'right'},
            'from_west': {'x': 36, 'y': 199, 'facing': 'right'},
            'scene': {'x': 200, 'y': 199, 'facing': 'right'},
        },
        'enter': {'script': 'jjajang_night_cliff_scene',
                  'flag': 'night_cliff_scene_started', 'early': True},
        'entities': [
            {'type': 'prop', 'id': 'night_cliff_floor', 'image': CLIFF,
             'x': 0, 'y': 160, 'w': 704, 'h': 224, 'ix': 0, 'iy': 160,
             'solid': False, 'sortY': -100},
            *anchors, *actors,
            {'type': 'door', 'id': 'night_west_door', 'x': 0, 'y': 192,
             'w': 10, 'h': 32, 'to': 'jjajang_night_coast3',
             'spawn': 'from_east', 'sfx': False},
        ],
    }


def main() -> None:
    """Generate or compare the map and its existing registry entry."""
    if '--help' in sys.argv:
        print(f'Usage: uv run tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index: dict[str, list[str]] = json.loads(index_path.read_text(encoding='utf-8'))
    map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    _ = output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        _ = index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
