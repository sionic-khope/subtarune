#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv if needed: curl -LsSf https://astral.sh/uv/install.sh | sh
# From repository root: uv run tools/maps/maillard_starboard.py [--check]
# ──────────────────
"""Generate the straight starboard deck after Junhee builds the side door."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'maillard_starboard'
WIDTH: Final = 48
HEIGHT: Final = 16


def main() -> None:
    """Write the deck map, or compare it with the generated artifact."""
    rows = ['!' * WIDTH for _ in range(HEIGHT)]
    for row in range(11, 14):
        rows[row] = '!' + 'M' * (WIDTH - 2) + '!'
    map_data = {
        'id': MAP_ID, 'name': '마이야르호 우현 갑판', 'stage': 'void_fallen',
        'bgm': 'youngcle_assault', 'dim': 0, 'backdrop': 'maillard_sunrise',
        'followScreenY': 285, 'sunrise': {'animated': False}, 'rows': rows,
        'preload': ['assets/tiles/maillard_deck.png', 'assets/backdrops/maillard_sunset.png',
                    'assets/props/maillard_sun.png', 'assets/backdrops/maillard_sea.png',
                    'assets/props/blue_buff.png'],
        'spawns': {
            'start': {'x': 164, 'y': 384, 'facing': 'right'},
            'from_saloon': {'x': 164, 'y': 384, 'facing': 'right'},
            'from_boarding': {'x': 1348, 'y': 384, 'facing': 'left'},
        },
        'meta': {'connected': True},
        'entities': [
            {'type': 'door', 'id': 'starboard_to_saloon', 'x': 16, 'y': 352,
             'w': 32, 'h': 96, 'to': 'maillard_saloon', 'spawn': 'from_starboard',
             'sfx': False, 'interact': False},
            {'type': 'prop', 'id': 'starboard_spring', 'image': 'assets/props/blue_buff.png',
             'anim': {'cols': 3, 'fps': 4}, 'x': 752, 'y': 356, 'w': 32, 'h': 12,
             'ix': 748, 'iy': 324, 'solid': True, 'script': 'maillard_spring'},
            {'type': 'door', 'id': 'starboard_to_boarding', 'x': 1472, 'y': 352,
             'w': 32, 'h': 96, 'to': 'maillard_boarding', 'spawn': 'from_starboard',
             'sfx': False, 'interact': False},
        ],
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


if __name__ == '__main__':
    main()
