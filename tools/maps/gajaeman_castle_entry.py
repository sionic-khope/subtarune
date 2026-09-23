#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/gajaeman_castle_entry.py [--check]
# ──────────────────
"""Build the castle arrival court and continuous right-hand stone approach."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_entry'
WIDTH: Final = 48
HEIGHT: Final = 20


def main() -> None:
    """Keep the five landing spots and both departure lanes on real stone."""
    if '--help' in sys.argv:
        print(f'Usage: uv run tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * WIDTH for _ in range(HEIGHT)]
    floor = {(col, row) for col in range(2, 17) for row in range(10, 18)}
    floor.update((col, row) for col in range(12, 47) for row in range(10, 14))
    floor.update((col, row) for col in range(12, 17) for row in range(2, 14))
    for col, row in floor:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            if (col + dx, row + dy) not in floor:
                cells[row + dy][col + dx] = '▥'
    for col, row in floor:
        cells[row][col] = '⌁' if (col * 7 + row * 11) % 19 == 0 else '⌂'
    stage = {
        'castle_player': [228, 440], 'castle_ppaman': [164, 488],
        'castle_gyeongsub': [292, 488], 'castle_youngcle': [420, 408],
        'castle_junhee': [484, 456], 'castle_exit_turn': [452, 344],
        'castle_exit_up': [452, 72], 'castle_right_path': [1452, 360],
    }
    anchors = [
        {'type': 'prop', 'id': name, 'image': 'assets/tiles/gajaeman_castle_floor.png',
         'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True}
        for name, (x, y) in stage.items()
    ]
    actors = [
        {'type': 'npc', 'id': f'invasion_{name}', 'sprite': name,
         'x': x, 'y': y, 'facing': 'down', 'wander': 0, 'solid': False,
         'hidden': True, 'unless': 'ship_invasion_arrived', 'visualScale': scale}
        for name, x, y, scale in (('youngcle', 420, 408, 2), ('junhee', 484, 456, 1))
    ]
    map_data = {
        'id': MAP_ID, 'name': '가재맨성 입구', 'stage': 'ship_invasion_arrived',
        'bgm': None, 'rows': [''.join(row) for row in cells],
        'preload': [f'assets/tiles/gajaeman_castle_{suffix}.png'
                    for suffix in ('floor', 'cracked', 'wall')],
        'spawns': {'arrival': {'x': 228, 'y': 440, 'facing': 'right'},
                   'start': {'x': 228, 'y': 440, 'facing': 'right'}},
        'meta': {'connected': True, 'stage': stage},
        'entities': [*anchors, *actors],
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
