#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_sunset.py [--check]
# ──────────────────
"""BUILD359 sunset ground above the castle wall (사용자 2026-09-26): a 2D side-on stage in the proportions of the user's
reference — the top 40% is sky (generated sunset over the sea with mountains and islands, assets/backdrops/
castle_sunset359.png, plus the Maillard deck sun and soft rays), then a wide black ground top, a front edge and a dark
band at the bottom. 요플래 tumbles up from in front of the ground and lands kneeling; 가재맨 is already up here and flees right.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_sunset'
W, H = 960, 384   # 화면(360) + 24: 카메라가 y 24 에 서면 참고 그림 비율 그대로
FLOOR: Final = '▓'
GROUND_TOP, EDGE = 214, 312   # BUILD361: 검은 땅을 줄였다(사용자 “바닥 검은색 좀 줄여도”) — 하늘 47%
BAND: Final = (224, 304)
LAND: Final = (300, 262)
GAJAEMAN: Final = (452, 252)


def main() -> None:
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_sunset.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cols, rows = W // 32, H // 32
    cells = [[' '] * cols for _ in range(rows)]
    for row in range(BAND[0] // 32, BAND[1] // 32):
        for col in range(cols):
            cells[row][col] = FLOOR
    entities = [
        {'type': 'npc', 'id': 'sunset_gajaeman', 'sprite': 'gajaeman_shadow', 'x': GAJAEMAN[0] - 12, 'y': GAJAEMAN[1] - 24,
         'facing': 'left', 'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.36},
    ]
    data = {
        'id': MAP_ID, 'name': '가재맨성 노을 끝', 'stage': 'castle_summit_ready',
        'bgm': 'save_the_world_rise', 'bgmVolume': 0.7, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_sunset_arrival', 'early': True},
        'preload': ['assets/backdrops/castle_sunset359.png', 'assets/props/maillard_sun.png', 'assets/sprites/hyungsub-land.png'],
        'spawns': {'arrive': {'x': LAND[0] - 12, 'y': LAND[1] - 24, 'facing': 'right'}},
        'meta': {'connected': True, 'descent': {'kind': 'sunset', 'band': list(BAND), 'gajaeman': 'sunset_gajaeman',
                                                'land': list(LAND), 'gajaemanAt': list(GAJAEMAN), 'groundTop': GROUND_TOP,
                                                'edgeY': EDGE, 'horizonY': 192, 'charScale': 0.72, 'sunDx': 70}},
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
