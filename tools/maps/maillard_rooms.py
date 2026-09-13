#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# From repository root: uv run tools/maps/maillard_rooms.py [--check]
# ──────────────────
"""Generate the steel storage room and path toward the captain's room."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

HEIGHT: Final = 14


def main() -> None:
    """Write both room maps or compare them with committed generator output."""
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    checks = []
    for suffix, name, width, bgm in (
        ('storage', '마이야르호 강퇴폐기창고', 15, 'wind'),
        ('saloon', '선장실로 가는 길', 23, 'maillard_lounge'),
    ):
        map_id = f'maillard_{suffix}'
        interior = f'assets/props/{map_id}_interior.png'
        rows = [' ' * width for _ in range(5)]
        rows.extend(' ' + 'M' * (width - 2) + ' ' for _ in range(5, HEIGHT - 2))
        rows.extend([' ' * width] * 2)
        map_data = {
            'id': map_id, 'name': name, 'stage': 'void_fallen',
            'bgm': bgm, 'dim': 0.08, 'rows': rows,
            'preload': ['assets/tiles/maillard_deck.png', interior],
            'spawns': {'start': {'x': 228, 'y': 248, 'facing': 'up'}},
            'meta': {'connected': True},
            'entities': [
                {'type': 'prop', 'id': f'{suffix}_interior', 'image': interior,
                 'x': 0, 'y': 0, 'w': width * 32, 'h': 448,
                 'solid': False, 'sortY': -1000},
                {'type': 'door', 'id': f'{suffix}_to_lounge',
                 'x': 204, 'y': 366, 'w': 72, 'h': 32,
                 'to': 'maillard_lounge', 'spawn': f'from_{suffix}',
                 'sfx': 'plug', 'interact': True},
            ],
        }
        output = Path(f'assets/maps/{map_id}.json')
        if '--check' in sys.argv:
            same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
            checks.append(same and map_id in index['maps'])
            continue
        output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        if map_id not in index['maps']:
            index['maps'].append(map_id)
    if '--check' in sys.argv:
        print('maillard_rooms', 'same' if all(checks) else 'DIFFERENT')
        sys.exit(0 if all(checks) else 1)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote maillard_storage and maillard_saloon')


if __name__ == '__main__':
    main()
