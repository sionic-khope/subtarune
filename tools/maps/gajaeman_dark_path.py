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


class MapIndex(TypedDict):
    maps: list[str]


def main() -> None:
    """Emit an up-right-up path and a single-screen arrival room."""
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
    arrival_cells = [[' '] * 15 for _ in range(12)]
    for row in range(2, 12):
        for col in range(3, 12):
            arrival_cells[row][col] = '♤'
    arrival = {
        'id': ARRIVAL_ID, 'name': '검은 길 끝', 'stage': 'castle_gate_reunion_done', 'bgm': None,
        'rows': [''.join(row) for row in arrival_cells],
        'spawns': {'start': {'x': 228, 'y': 240, 'facing': 'up'}},
        'meta': {'connected': True, 'darkPath': True},
        'entities': [{'type': 'door', 'id': 'castle_dark_arrival_return',
                      'x': 96, 'y': 374, 'w': 288, 'h': 10,
                      'to': PATH_ID, 'spawn': 'from_next', 'interact': False, 'sfx': False}],
    }
    index_path = Path('assets/maps/index.json')
    index: MapIndex = json.loads(index_path.read_text(encoding='utf-8'))
    synchronized = True
    for map_id, data in ((PATH_ID, path), (ARRIVAL_ID, arrival)):
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
