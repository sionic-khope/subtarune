#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_stairs.py [--check]
# ──────────────────
"""BUILD334 tower staircase (사용자 2026-09-25): about a minute of climbing at the stair pace, switchback flights.

The geometry here is the single source for the art (tools/art/castle334_stairs_set.py) and the scene
(src/scenes/castle-stairs.js keeps the climber inside the band around PATH and fires the events).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_stairs'
W, H, CHUNK = 1536, 7168, 1024
HALF: Final = 64
FLOOR: Final = '▓'
# BUILD334: 한 줄기 1300px 높이 — 계단 걸음(124.8px/s)으로 약 1분(사용자 “한 1분정도”)
FLIGHTS: Final = [((420, 6940), (1100, 5640)), ((1160, 5480), (480, 4180)), ((420, 4020), (1100, 2720)), ((1160, 2560), (480, 1260))]
LANDINGS: Final = [(0, 6940, 560, 160), (1000, 5480, 320, 160), (280, 4020, 320, 160), (1000, 2560, 320, 160), (260, 920, 440, 340), (400, 0, 160, 920)]
PATH: Final = [(40, 7020), (420, 7020), (420, 6940), (1100, 5640), (1160, 5560), (1160, 5480), (480, 4180), (440, 4100),
               (420, 4020), (1100, 2720), (1160, 2640), (1160, 2560), (480, 1260), (480, 1090), (480, 20)]
# 지나가면 바로 뒤 계단을 청소년 주먹이 부순다(타임어택 아님, 긴박감 연출)
SMASH: Final = [(600, 6620), (900, 6050), (1160, 5520), (980, 5000), (700, 4600), (430, 4060), (760, 3380), (1160, 2600), (820, 1910), (560, 1440)]
ENCOUNTER: Final = {'monsters': (1006, 2900), 'nunu': (532, 1360)}


def main() -> None:
    """Write rows, baked chunks, anchors, actors and events."""
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_stairs.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cols, rows = W // 32, H // 32
    cells = [[' '] * cols for _ in range(rows)]

    def fill(x0: int, y0: int, x1: int, y1: int) -> None:
        for row in range(max(0, y0 // 32), min(rows, (y1 + 31) // 32)):
            for col in range(max(0, x0 // 32), min(cols, (x1 + 31) // 32)):
                cells[row][col] = FLOOR
    for (ax, ay), (bx, by) in zip(PATH, PATH[1:]):
        steps = max(1, int(max(abs(bx - ax), abs(by - ay)) // 16))
        for i in range(steps + 1):
            x = ax + (bx - ax) * i / steps; y = ay + (by - ay) * i / steps
            fill(int(x - HALF), int(y - HALF), int(x + HALF), int(y + HALF // 2))
    entities = [{'type': 'prop', 'id': f'stairs_chunk_{i}', 'image': f'assets/props/stairs334_chunk_{i}.png',
                 'x': 0, 'y': top, 'w': W, 'h': 2, 'solid': False, 'sortY': -3} for i, top in enumerate(range(0, H, CHUNK))]
    entities.extend([
        {'type': 'npc', 'id': 'stairs_park', 'sprite': 'park_guardian_costume', 'x': 540, 'y': 6750,
         'facing': 'up', 'solid': False, 'wander': 0, 'visualScale': 2.22},
        {'type': 'npc', 'id': 'stairs_ttuulla', 'sprite': 'ttuulla', 'x': 600, 'y': 6650,
         'facing': 'up', 'solid': False, 'wander': 0, 'visualScale': 1.79},
        {'type': 'npc', 'id': 'stairs_junhee', 'sprite': 'junhee', 'x': 660, 'y': 6550, 'facing': 'up', 'solid': False, 'wander': 0},
    ])
    monsters = [('blitzcrank', 104, 100, 1040), ('darius', 92, 90, 1130), ('fiddlesticks', 88, 94, 1210)]
    for name, w, h, x in monsters:
        entities.append({'type': 'prop', 'id': f'stairs_mon_{name}', 'image': f'assets/props/arena332_{name}.png',
                         'x': x - w // 2, 'y': 2690 - h, 'solid': False, 'hidden': True})
    # BUILD337: 꼭대기 통로 끝(맵 위 가장자리)을 밟으면 꼭대기 길로
    entities.append({'type': 'door', 'id': 'stairs_to_summit', 'x': 400, 'y': 0, 'w': 160, 'h': 12,
                     'to': 'gajaeman_castle_summit', 'spawn': 'start', 'interact': False, 'sfx': False})
    entities.append({'type': 'trigger', 'id': 'stairs_back', 'x': 0, 'y': 6940, 'w': 10, 'h': 160, 'script': 'castle_spire_back'})
    data = {
        'id': MAP_ID, 'name': '가재맨성 무너지는 계단', 'stage': 'castle_arena_seen',
        'bgm': 'castle_gajaeman', 'bgmVolume': 0.5, 'followScreenY': 210, 'rows': [''.join(row) for row in cells],
        'preload': [f'assets/props/stairs334_chunk_{i}.png' for i in range(len(range(0, H, CHUNK)))]
        + ['assets/props/arena332_arm.png', 'assets/enemies/nunusub316.png'] + [f'assets/props/arena332_{n}.png' for n, *_ in monsters],
        'spawns': {'start': {'x': 40, 'y': 7008, 'facing': 'right'}, 'top': {'x': 468, 'y': 1080, 'facing': 'up'}},
        'meta': {'connected': True, 'stairs': {'path': [list(p) for p in PATH], 'half': HALF - 14, 'smash': [list(p) for p in SMASH],
                                                'encounters': {k: list(v) for k, v in ENCOUNTER.items()},
                                                'allies': [['stairs_park', 200], ['stairs_ttuulla', 290], ['stairs_junhee', 380]],
                                                'nunu': {'x': 480, 'feet': 1240, 'image': 'assets/enemies/nunusub316.png'}}},
        'entities': entities,
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == data and MAP_ID in index['maps']
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID)


if __name__ == '__main__':
    main()
