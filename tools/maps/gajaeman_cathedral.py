#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run tools/maps/gajaeman_cathedral.py [--check]
# ──────────────────
"""Generate the cathedral landing and its three-lane north aisle."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final, TypedDict

MAP_ID: Final = 'gajaeman_castle_cathedral'


class MapIndex(TypedDict):
    maps: list[str]


def main() -> None:
    """Write the walkable route and decorative floor independently."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/gajaeman_cathedral.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * 24 for _ in range(251)]
    for row in range(2, 240):
        cells[row][8] = '╞'
        cells[row][15] = '╡'
        for col in range(9, 15):
            cells[row][col] = '░' if row < 236 else '▱'
    for row in range(240, 249):
        cells[row][3] = '╞'
        cells[row][20] = '╡'
        for col in range(4, 20):
            cells[row][col] = '░'
    for row in range(249, 251):
        cells[row][10] = '╞'
        cells[row][13] = '╡'
        for col in (11, 12):
            cells[row][col] = '░'
    entities = []
    for y in range(64, 7552, 192):
        entities.append({'type': 'prop', 'id': f'cathedral_floor_{y}',
                         'image': 'assets/tiles/castle321_aisle.png',
                         'x': 288, 'y': y, 'w': 192, 'h': 2, 'solid': False, 'sortY': -1})
    for y in range(112, 7488, 160):
        for side, x in (('left', 204), ('right', 524)):
            entities.append({'type': 'prop', 'id': f'cathedral_sconce_{side}_{y}',
                             'image': 'assets/props/castle321_sconce.png',
                             'x': x, 'y': y, 'w': 40, 'h': 72, 'solid': False, 'sortY': 0})
    for side, window_x, column_x in (('left', 144, 216), ('right', 552, 472)):
        entities.extend([
            {'type': 'prop', 'id': f'cathedral_window_{side}',
             'image': 'assets/props/castle321_window.png', 'x': window_x, 'y': 7568,
             'w': 72, 'h': 176, 'solid': False, 'sortY': 0},
            {'type': 'prop', 'id': f'cathedral_column_{side}',
             'image': 'assets/props/castle321_column.png', 'x': column_x, 'y': 7728,
             'w': 80, 'h': 16, 'ix': column_x, 'iy': 7584, 'solid': True},
        ])
    # BUILD323 entrance: hidden stand anchors (64px talk spacing) and the gajaeman who descends between the columns
    for name, x, y in (('cath_stand_player', 360, 7708), ('cath_stand_gyeongsub', 296, 7752),
                       ('cath_stand_ppaman', 424, 7752)):
        entities.append({'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
                         'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True})
    entities.append({'type': 'npc', 'id': 'cathedral_gajaeman', 'sprite': 'gajaeman_shadow',
                     'x': 360, 'y': 7584, 'facing': 'down', 'solid': False, 'wander': 0,
                     'hidden': True, 'visualScale': 1.89})
    entities.append({'type': 'door', 'id': 'cathedral_return',
                     'x': 352, 'y': 8022, 'w': 64, 'h': 10,
                     'to': 'gajaeman_castle_dark_refuge', 'spawn': 'from_cathedral',
                     'interact': False, 'sfx': False})
    data = {
        'id': MAP_ID, 'name': '가재맨성 검은 대성당', 'stage': 'castle_dark_chase_done',
        'bgm': None, 'followScreenY': 176, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_cathedral_intro'},
        'preload': ['assets/props/cathedral323_sword.png'],
        'spawns': {'entry': {'x': 360, 'y': 7958, 'facing': 'up'},
                   'start': {'x': 372, 'y': 7726, 'facing': 'up'},
                   'climb': {'x': 360, 'y': 7400, 'facing': 'up'},
                   'stairs': {'x': 372, 'y': 7704, 'facing': 'up'},
                   'aisle': {'x': 372, 'y': 7464, 'facing': 'up'},
                   'middle': {'x': 372, 'y': 3816, 'facing': 'up'},
                   'end': {'x': 372, 'y': 104, 'facing': 'up'}},
        'meta': {'connected': True, 'corridorWidth': 192, 'laneWidth': 64,
                 'aisleLength': 7488, 'slowWalkSeconds': 60, 'cathedralClimb': True},
        'entities': entities,
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index: MapIndex = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == data
        same = same and MAP_ID in index['maps']
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    _ = output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
    _ = index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID)


if __name__ == '__main__':
    main()
