#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# uv run tools/maps/maillard_captain.py [--check]
# ──────────────────
"""Generate a furnished captain cabin, leaving its central floor open."""
import json
from pathlib import Path
import sys
from typing import Final

WIDTH: Final = 27
HEIGHT: Final = 18
MAP_ID: Final = 'maillard_captain'


def main() -> None:
    """Write the cabin map or verify its committed generator output."""
    rows = [' ' * WIDTH] * 6
    rows.extend(' ' + 'M' * (WIDTH - 2) + ' ' for _ in range(6, HEIGHT - 2))
    rows.extend([' ' * WIDTH] * 2)
    map_data = {
        'id': MAP_ID, 'name': '마이야르호 선장실', 'stage': 'void_fallen',
        'bgm': 'maillard_lounge', 'dim': 0.06, 'rows': rows,
        'enter': {'script': 'captain_reveal', 'flag': 'captain_reveal_started'},
        'preload': ['assets/tiles/maillard_deck.png',
                    *[f'assets/props/captain_{name}.png' for name in ('walls', 'window', 'chart', 'helm', 'stowage', 'carpet')]],
        'spawns': {'start': {'x': 420, 'y': 376, 'facing': 'up'}},
        'meta': {'connected': True},
        'entities': [
            {'type': 'npc', 'id': 'captain_junhee', 'sprite': 'junhee',
             'x': 620, 'y': 244, 'facing': 'right', 'wander': 0,
             'unless': 'captain_reveal_done'},
            {'type': 'npc', 'id': 'captain_mankatsuki', 'sprite': 'junhee_mankatsuki',
             'x': 420, 'y': 270, 'facing': 'down', 'wander': 0, 'visualScale': 1.5,
             'requires': 'captain_reveal_done'},
            {'type': 'npc', 'id': 'captain_shadow', 'sprite': 'gajaeman_shadow',
             'x': 324, 'y': 284, 'facing': 'right', 'wander': 0, 'hidden': True,
             'solid': False, 'visualScale': 1.89, 'unless': 'captain_reveal_done'},
            {'type': 'prop', 'id': 'captain_walls', 'image': 'assets/props/captain_walls.png',
             'x': 0, 'y': 0, 'w': 864, 'h': 576, 'solid': False, 'sortY': -1000},
            {'type': 'prop', 'id': 'captain_carpet', 'image': 'assets/props/captain_carpet.png',
             'x': 284, 'y': 288, 'w': 288, 'h': 176, 'solid': False, 'sortY': -950},
            {'type': 'prop', 'id': 'captain_window', 'image': 'assets/props/captain_window.png',
             'x': 596, 'y': 28, 'w': 236, 'h': 156, 'solid': False, 'sortY': -900},
            {'type': 'prop', 'id': 'captain_chart', 'image': 'assets/props/captain_chart.png',
             'x': 72, 'y': 212, 'w': 144, 'h': 40, 'ix': 68, 'iy': 148, 'solid': True},
            {'type': 'prop', 'id': 'captain_helm', 'image': 'assets/props/captain_helm.png',
             'x': 676, 'y': 226, 'w': 128, 'h': 28, 'ix': 672, 'iy': 146, 'solid': True},
            {'type': 'prop', 'id': 'captain_stowage', 'image': 'assets/props/captain_stowage.png',
             'x': 58, 'y': 402, 'w': 106, 'h': 22, 'ix': 55, 'iy': 330, 'solid': True},
            {'type': 'door', 'id': 'captain_to_saloon', 'x': 396, 'y': 490, 'w': 72, 'h': 36,
             'to': 'maillard_saloon', 'spawn': 'from_captain', 'sfx': 'plug', 'interact': True},
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
