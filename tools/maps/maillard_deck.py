#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/maillard_deck.py [--check]
# ──────────────────
"""Generate the simple sunlit Maillard wooden deck after the rescue reveal."""
import json
from pathlib import Path
import sys
from typing import Final

WIDTH: Final = 20
HEIGHT: Final = 14
MAP_ID: Final = 'maillard_deck'
rows = [' ' * WIDTH for _ in range(5)]
rows.extend(' ' + 'M' * (WIDTH - 2) + ' ' for _ in range(5, HEIGHT - 1))
rows.append(' ' * WIDTH)
map_data = {
    'id': MAP_ID, 'name': '마이야르호 갑판', 'stage': 'void_fallen',
    'bgm': None, 'dim': 0, 'backdrop': 'maillard_sea', 'rows': rows,
    'preload': ['assets/tiles/maillard_deck.png', 'assets/backdrops/maillard_sea.png'],
    'spawns': {
        'start': {'x': 308, 'y': 264, 'facing': 'up'},
        'arrival': {'x': 308, 'y': 264, 'facing': 'up'},
    },
    'meta': {'connected': True, 'stage': {
        'player': [308, 264], 'gyeongsub': [244, 296], 'ppaman': [372, 296],
    }},
    'entities': [],
}
output = Path(f'assets/maps/{MAP_ID}.json')
index_path = Path('assets/maps/index.json')
index = json.loads(index_path.read_text(encoding='utf-8'))
if '--check' in sys.argv:
    same = json.loads(output.read_text(encoding='utf-8')) == map_data
    registered = MAP_ID in index['maps']
    print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
    sys.exit(0 if same and registered else 1)
output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1), encoding='utf-8')
if MAP_ID not in index['maps']:
    index['maps'].append(MAP_ID)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)
