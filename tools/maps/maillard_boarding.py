#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# From repository root: uv run tools/maps/maillard_boarding.py [--check]
# ──────────────────
"""Generate the square boarding deck and the iron bridge to Youngcle's ship."""
from __future__ import annotations

import json
from pathlib import Path
import sys


def main() -> None:
    """Write the two connected exterior maps or compare their generated artifacts."""
    deck_rows = [['!'] * 22 for _ in range(22)]
    for row in range(7, 19):
        deck_rows[row][6:18] = ['M'] * 12
    for row in range(12, 15):
        deck_rows[row][1:6] = ['M'] * 5
        deck_rows[row][18:21] = ['I'] * 3
        deck_rows[row][21] = 'J'
    bridge_rows = ['!' * 45 for _ in range(16)]
    for row in range(12, 15):
        bridge_rows[row] = '!' + 'I' * 43 + '!'
    bridge_rows[14] = '!' + 'I' * 31 + '!' * 13
    common = {
        'stage': 'void_fallen', 'bgm': 'youngcle_assault', 'dim': 0,
        'backdrop': 'maillard_sunrise', 'sunrise': {'animated': False},
        'preload': ['assets/tiles/maillard_deck.png', 'assets/tiles/youngcle_iron.png',
                    'assets/backdrops/maillard_sunset.png', 'assets/props/maillard_sun.png',
                    'assets/backdrops/maillard_sea.png'],
    }
    boarding = {
        **common, 'id': 'maillard_boarding', 'name': '마이야르호 접현 갑판',
        'rows': [''.join(row) for row in deck_rows],
        'enter': {'script': 'maillard_boarding_intro'},
        'spawns': {
            'start': {'x': 228, 'y': 432, 'facing': 'right'},
            'from_starboard': {'x': 228, 'y': 432, 'facing': 'right'},
            'from_bridge': {'x': 484, 'y': 432, 'facing': 'left'},
        },
        'meta': {'connected': True, 'stage': {
            'player': [356, 432], 'gyeongsub': [292, 432], 'ppaman': [228, 432],
            'junhee': [548, 400], 'yongjun': [484, 464],
        }},
        'entities': [
            {'type': 'door', 'id': 'boarding_to_starboard', 'x': 16, 'y': 384,
             'w': 32, 'h': 96, 'to': 'maillard_starboard', 'spawn': 'from_boarding',
             'sfx': False, 'interact': False},
            {'type': 'door', 'id': 'boarding_to_bridge', 'x': 656, 'y': 384,
             'w': 32, 'h': 96, 'to': 'youngcle_bridge', 'spawn': 'from_boarding',
             'sfx': False, 'interact': False},
            {'type': 'npc', 'id': 'boarding_junhee', 'sprite': 'junhee',
             'x': 548, 'y': 400, 'facing': 'right', 'wander': 0, 'solid': False,
             'unless': 'maillard_boarding_departed'},
            {'type': 'npc', 'id': 'boarding_yongjun', 'sprite': 'yongjun',
             'x': 484, 'y': 464, 'facing': 'right', 'wander': 0, 'solid': False,
             'unless': 'maillard_boarding_departed'},
        ],
    }
    bridge = {
        **common, 'id': 'youngcle_bridge', 'name': '철 전함으로 가는 다리',
        'rows': bridge_rows, 'followScreenY': 285,
        'preload': [*common['preload'], 'assets/props/youngcle_hull_entry.png'],
        'spawns': {
            'start': {'x': 164, 'y': 416, 'facing': 'right'},
            'from_boarding': {'x': 164, 'y': 416, 'facing': 'right'},
            'from_inside': {'x': 1164, 'y': 416, 'facing': 'left'},
        },
        'meta': {'connected': True},
        'entities': [
            {'type': 'door', 'id': 'bridge_to_boarding', 'x': 16, 'y': 384,
             'w': 32, 'h': 96, 'to': 'maillard_boarding', 'spawn': 'from_bridge',
             'sfx': False, 'interact': False},
            {'type': 'prop', 'id': 'youngcle_entrance_image',
             'image': 'assets/props/youngcle_hull_entry.png', 'x': 976, 'y': -32,
             'w': 896, 'h': 717, 'solid': False, 'sortY': 0},
            {'type': 'door', 'id': 'youngcle_entrance', 'x': 1296, 'y': 400,
             'w': 144, 'h': 32, 'solid': False, 'to': 'youngcle1', 'spawn': 'from_bridge',
             'sfx': False, 'interact': False},
            {'type': 'sign', 'id': 'youngcle_upper_hull', 'x': 1024, 'y': 384,
             'w': 352, 'h': 16, 'solid': True, 'script': 'youngcle_entrance'},
            {'type': 'sign', 'id': 'youngcle_lower_hull', 'x': 1024, 'y': 432,
             'w': 352, 'h': 80, 'solid': True, 'script': 'youngcle_entrance'},
            {'type': 'sign', 'id': 'youngcle_back_wall', 'x': 1376, 'y': 384,
             'w': 64, 'h': 128, 'solid': True, 'script': 'youngcle_entrance'},
        ],
    }
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    checks = []
    for map_data in (boarding, bridge):
        map_id = map_data['id']
        output = Path(f'assets/maps/{map_id}.json')
        if '--check' in sys.argv:
            same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
            checks.append(same and map_id in index['maps'])
            continue
        output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        if map_id not in index['maps']:
            index['maps'].append(map_id)
    if '--check' in sys.argv:
        print('maillard_boarding', 'same' if all(checks) else 'DIFFERENT')
        sys.exit(0 if all(checks) else 1)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote maillard_boarding and youngcle_bridge')


if __name__ == '__main__':
    main()
