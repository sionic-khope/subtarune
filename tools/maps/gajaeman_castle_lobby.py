#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/gajaeman_castle_lobby.py [--check]
# ──────────────────
"""Build the three-door castle lobby and its cutscene-safe approach routes."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_lobby'
WIDTH: Final = 40
HEIGHT: Final = 32


def main() -> None:
    """Generate the lobby, with closed side doors and the larger sealed gate."""
    if '--help' in sys.argv:
        print(f'Usage: uv run tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    cells = [[' '] * WIDTH for _ in range(HEIGHT)]
    floor = {(col, row) for col in range(14, 26) for row in range(11, HEIGHT)}
    floor.update((col, row) for col in range(6, 34) for row in range(18, 23))
    floor.update((col, row) for col in (*range(6, 12), *range(28, 34)) for row in range(16, 23))
    for col, row in floor:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            if 0 <= row + dy < HEIGHT and 0 <= col + dx < WIDTH and (col + dx, row + dy) not in floor:
                cells[row + dy][col + dx] = '▥'
    for col, row in floor:
        variation = (col * 7 + row * 11) % 17
        cells[row][col] = '♠' if variation < 3 else '♣' if variation < 5 else '♦' if variation == 5 else '♜'
    stage = {
        'lobby_focus': [640, 560], 'lobby_youngcle': [524, 496],
        'lobby_junhee': [628, 400], 'lobby_player': [604, 568],
        'lobby_gyeongsub': [676, 576], 'lobby_ppaman': [532, 584],
        'lobby_entry_player': [604, 864],
        'lobby_entry_gyeongsub': [676, 912], 'lobby_entry_ppaman': [532, 912],
        'lobby_left_turn': [532, 656], 'lobby_left_door': [276, 520],
        'lobby_left_block_return': [484, 656],
    }
    hover_stage = {'lobby_gajaeman': [844, 416]}
    actor_stage = {**stage, **hover_stage}
    anchors = [
        {'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
         'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True}
        for name, (x, y) in {**actor_stage, 'lobby_left_inside': [276, 472],
                            'lobby_wall1': [432, 422], 'lobby_wall2': [704, 336],
                            'lobby_wall3': [848, 442]}.items()
    ]
    actors = [
        {'type': 'npc', 'id': f'castle_lobby_{name}', 'sprite': sprite,
         'x': actor_stage[f'lobby_{name}'][0], 'y': actor_stage[f'lobby_{name}'][1],
         'facing': facing, 'solid': False, 'wander': 0,
         'hidden': name == 'gajaeman', 'unless': 'castle_lobby_seen',
         **({'visualScale': 1.89} if name == 'gajaeman' else {})}
        for name, sprite, facing in (('youngcle', 'youngcle_hover', 'right'),
                                    ('junhee', 'junhee', 'up'),
                                    ('gajaeman', 'gajaeman_shadow', 'left'))
    ]
    side_doors = [
        {'type': 'prop', 'id': f'castle_lobby_{side}_door',
         'image': 'assets/props/castle306_gate.png', 'scale': 0.5625,
         'x': center - 72, 'y': 496, 'w': 144, 'h': 16,
         'ix': center - 72, 'iy': 332, 'solid': True, 'sortY': 0,
         **({'script': 'castle_lobby_right_enter'} if side == 'right' else {})}
        for side, center in (('left', 288), ('right', 992))
    ]
    map_data = {
        'id': MAP_ID, 'name': '가재맨성 로비', 'stage': 'ship_invasion_arrived',
        'bgm': None, 'backdrop': 'castle306_distant', 'followScreenY': 250,
        'enter': {'script': 'castle_lobby_intro', 'early': True},
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/backdrops/castle306_distant.png', 'assets/fx/explosion.png',
                    'assets/props/castle306_gate.png', 'assets/props/castle307_sealed_gate.png',
                    'assets/tiles/gajaeman_castle_wall.png',
                    *[f'assets/tiles/castle306_{suffix}.png'
                      for suffix in ('floor', 'moss', 'cracked', 'moss_dense')]],
        'spawns': {'start': {'x': 604, 'y': 864, 'facing': 'up'},
                   'after_intro': {'x': 604, 'y': 568, 'facing': 'right'},
                   'from_right': {'x': 980, 'y': 600, 'facing': 'down'}},
        'meta': {'connected': True, 'stage': stage, 'hoverStage': hover_stage, 'seals': 2},
        'entities': [*anchors, *actors, *side_doors,
                     {'type': 'prop', 'id': 'castle_lobby_sealed_door',
                      'image': 'assets/props/castle307_sealed_gate.png', 'scale': 0.75,
                      'x': 520, 'y': 336, 'w': 240, 'h': 16, 'ix': 520, 'iy': 64,
                      'solid': True, 'sortY': 0, 'script': 'castle_lobby_sealed'},
                     {'type': 'trigger', 'id': 'castle_lobby_left_guard',
                      'x': 416, 'y': 576, 'w': 64, 'h': 160,
                      'script': 'castle_lobby_left_block'},
                     {'type': 'door', 'id': 'castle_lobby_return',
                      'x': 448, 'y': HEIGHT * 32 - 10, 'w': 384, 'h': 10,
                      'to': 'gajaeman_castle_approach', 'spawn': 'from_lobby',
                      'interact': False, 'sfx': False}],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    _ = output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        _ = index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
