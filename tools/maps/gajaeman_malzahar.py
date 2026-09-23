#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from repository root: uv run tools/maps/gajaeman_malzahar.py [--check]
# ──────────────────
"""Build the castle defence fork and the solo runner's far-side landing."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

TILE: Final = 32
MAP_IDS: Final = ('gajaeman_castle_fork', 'gajaeman_torii_end')


def main() -> None:
    """Emit deterministic maps using the adjacent memory-room materials."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/gajaeman_malzahar.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    synchronized = True
    for map_id in MAP_IDS:
        fork = map_id == MAP_IDS[0]
        width, height = (140, 34) if fork else (30, 22)
        floor = ({(col, row) for col in range(8, 19) for row in range(18, height)} if fork
                 else {(col, row) for col in range(1, 26) for row in range(13, 18)})
        if fork:
            floor.update((col, row) for col in range(16, 26) for row in range(18, 25))
            floor.update((col, row) for col in range(20, 26) for row in range(7, 24))
            floor.update((col, row) for col in range(24, width - 1) for row in range(20, 23))
        else:
            floor.update((col, row) for col in range(19, 26) for row in range(5, 17))
        cells = [[' '] * width for _ in range(height)]
        for col, row in floor:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                x, y = col + dx, row + dy
                if 0 <= x < width and 0 <= y < height and (x, y) not in floor:
                    cells[y][x] = '▦'
        for col, row in floor:
            cells[row][col] = '♧' if (col * 3 + row * 7) % 23 < 2 else '♤'
        stage = {
            'fork_player': [388, 708], 'fork_gyeongsub': [460, 716], 'fork_ppaman': [316, 716],
            'fork_bidet_meet': [388, 624], 'fork_mario_meet': [484, 600],
            'fork_right_turn': [688, 680], 'fork_player_wait': [688, 488],
            'fork_ppaman_farewell': [644, 416],
            'fork_bidet_guard': [660, 264], 'fork_mario_guard': [752, 264],
            'fork_gyeongsub_guard': [700, 336], 'fork_ppaman_guard': [644, 336],
        } if fork else {}
        anchors = [
            {'type': 'prop', 'id': name, 'image': 'assets/tiles/castle307_floor.png',
             'x': x, 'y': y, 'w': 24, 'h': 16, 'hidden': True, 'solid': False}
            for name, (x, y) in stage.items()
        ]
        if fork:
            entities = [*anchors,
                {'type': 'prop', 'id': 'castle_monster_aperture',
                 'image': 'assets/props/castle306_gate.png', 'scale': 0.5625,
                 'x': 640, 'y': 224, 'w': 144, 'h': 16, 'ix': 640, 'iy': 60,
                 'solid': True, 'sortY': 0},
                {'type': 'npc', 'id': 'castle_warm_bidet', 'sprite': 'warm_bidet',
                 'x': 388, 'y': 624, 'facing': 'up', 'solid': False, 'wander': 0},
                {'type': 'npc', 'id': 'castle_dot_mario', 'sprite': 'mini_mario',
                 'x': 484, 'y': 600, 'facing': 'up', 'solid': False, 'wander': 0},
                *[{'type': 'npc', 'id': f'castle_guard_{name}', 'sprite': name,
                   'x': stage[f'fork_{name}_guard'][0], 'y': stage[f'fork_{name}_guard'][1],
                   'facing': 'up', 'solid': False, 'wander': 0, 'hidden': True}
                  for name in ('gyeongsub', 'ppaman')],
                {'type': 'door', 'id': 'castle_fork_return', 'x': 256, 'y': height * TILE - 10,
                 'w': 352, 'h': 10, 'to': 'gajaeman_memory2', 'spawn': 'from_fork',
                 'interact': False, 'sfx': False},
                {'type': 'trigger', 'id': 'castle_torii_start', 'x': 1248, 'y': 640,
                 'w': 64, 'h': 96, 'script': 'castle_malzahar_run', 'requires': 'castle_malzahar_split'},
            ]
            # The old torii's near/far bases and split-image offsets are unchanged.
            near_x, near_y = 1008, 738
            ix, iy = round(near_x - 57), round(near_y - 285.3)
            entities.extend([
                {'type': 'prop', 'id': 'castle_torii_back',
                 'image': 'assets/props/jjajang_torii_purple_back.png',
                 'x': round(ix + 196 - 12), 'y': round(iy + 216.6 - 22),
                 'w': 24, 'h': 22, 'ix': ix + 176, 'iy': iy + 121, 'solid': True},
                {'type': 'prop', 'id': 'castle_torii_front',
                 'image': 'assets/props/jjajang_torii_purple_front.png',
                 'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24,
                 'ix': ix, 'iy': iy, 'solid': True},
            ])
            spawns = {'start': {'x': 388, 'y': 952, 'facing': 'up'},
                      'after_split': {'x': 688, 'y': 488, 'facing': 'right'},
                      'torii': {'x': 1188, 'y': 680, 'facing': 'right'}}
            meta = {'connected': True, 'stage': stage, 'route': [[12, 30], [12, 21], [40, 21]],
                    'runRoadRows': [[20, 22]],
                    'runs': {'a': {'dir': 1, 'startX': 1248, 'endX': 4320, 'groundY': 680,
                                   'speed': 420, 'water': False, 'obstacles': False, 'seed': 31,
                                   'keepFollowersHidden': True, 'leadInSeconds': 3,
                                   'encounter': 'malzahar_runner'}}}
        else:
            entities = [{'type': 'prop', 'id': 'castle_torii_end_door',
                         'image': 'assets/props/castle-memory-door.png',
                         'x': 656, 'y': 160, 'w': 96, 'h': 16, 'ix': 656, 'iy': 48,
                         'solid': True, 'sortY': 0, 'script': 'castle_malzahar_end_door'}]
            spawns = {'start': {'x': 692, 'y': 280, 'facing': 'up'}}
            meta = {'connected': True, 'route': [[21, 8], [21, 6]]}
        map_data = {
            'id': map_id, 'name': '가재맨성 결계 갈림길' if fork else '결계 너머 회랑',
            'stage': 'castle_lobby_seen' if fork else 'castle_malzahar_split',
            'bgm': 'castle_right', 'battleBg': 'castle_memory', 'backdrop': 'castle307_right',
            'followScreenY': 250, 'rows': [''.join(row) for row in cells],
            'preload': ['assets/backdrops/castle307_right.png', 'assets/tiles/castle308_wall.png',
                        'assets/tiles/castle307_floor.png', 'assets/tiles/castle307_moss.png',
                        *(['assets/props/jjajang_torii_purple_back.png',
                           'assets/props/jjajang_torii_purple_front.png',
                           'assets/props/castle306_gate.png'] if fork
                          else ['assets/props/castle-memory-door.png'])],
            'spawns': spawns, 'meta': meta, 'entities': entities,
        }
        if fork:
            map_data['enter'] = {'script': 'castle_malzahar_intro', 'early': True}
        output = Path(f'assets/maps/{map_id}.json')
        if '--check' in sys.argv:
            same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
            synchronized = synchronized and same
            print(map_id, 'same' if same else 'DIFFERENT')
        else:
            _ = output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
            print('wrote', map_id, width, 'x', height)
    if '--check' in sys.argv:
        raise SystemExit(0 if synchronized else 1)


if __name__ == '__main__':
    main()
