#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/ship_night_deck.py [--check]
# ──────────────────
"""Build the quiet pre-invasion lookout on the existing iron warship deck."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'ship_night_deck'
WIDTH: Final = 32
HEIGHT: Final = 18


def main() -> None:
    """Emit deterministic staging data without adding an unrequested exit."""
    if '--help' in sys.argv:
        print(f'Usage: uv run tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    for row in range(9, 17):
        cells[row] = ['G'] + ['F'] * 19 + ['!'] * 12
    cells[17] = ['G'] * 20 + ['!'] * 12
    stage = {
        'deck_lookout': [600, 376],
        'deck_ppaman_entry': [160, 344], 'deck_gyeongsub_entry': [96, 408],
        'deck_ppaman_near': [536, 344], 'deck_gyeongsub_near': [536, 408],
    }
    anchors = [
        {'type': 'prop', 'id': name, 'image': 'assets/props/ship_floor_logo.png',
         'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True}
        for name, (x, y) in stage.items()
    ]
    rails: list[dict[str, str | int | float | bool]] = [
        {'type': 'prop', 'id': f'deck_rail_{col}',
         'image': 'assets/props/iron_fence_short.png',
         'x': col * 32, 'y': 282, 'w': 32, 'h': 6,
         'ix': col * 32, 'iy': 266, 'solid': True, 'sortY': 282}
        for col in range(1, 20)
    ]
    rails.append({
        'type': 'prop', 'id': 'deck_rail_right', 'image': 'assets/props/ship_rail_r.png',
        'x': 632, 'y': 288, 'w': 8, 'h': 288, 'ix': 632, 'iy': 288,
        'scale': 0.375, 'solid': True, 'sortY': 576,
    })
    map_data = {
        'id': MAP_ID, 'name': '엄청대박인배 밤 갑판', 'stage': 'ship_invasion_started',
        'bgm': 'wind', 'backdrop': 'jjajang_night_sea', 'followScreenY': 280,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron_blue.png',
                    'assets/tiles/youngcle_iron_blue_wall.png',
                    'assets/backdrops/jjajang_night_sea.png',
                    'assets/props/iron_fence_short.png', 'assets/props/ship_rail_r.png'],
        'spawns': {'alone': {'x': 600, 'y': 376, 'facing': 'right'},
                   'start': {'x': 600, 'y': 376, 'facing': 'right'}},
        'meta': {'connected': True, 'stage': stage},
        'entities': [*rails, *anchors],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in json.loads(index_path.read_text(encoding='utf-8'))['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    _ = output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
