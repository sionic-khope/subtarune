#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_summit.py [--check]
# ──────────────────
"""BUILD337 tower summit (사용자 2026-09-25): up the short stair out of the clouds, then a long walk right to the
broken end of the walkway, where 청소년 rises out of black smoke. The battle will be fought right here (not built yet).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_summit'
W, H = 4608, 768
FLOOR: Final = '▓'
# 걷는 곳: 구름에서 올라오는 계단, 오른쪽으로 이어진 길(부서진 끝 앞까지)
WALK: Final = [(112, 380, 236, 340), (112, 350, 3848, 86)]
TALK_X: Final = 3800
GIANT: Final = {'x': 4330, 'bottom': 620, 'image': 'assets/props/summit336_teen.png', 'shoulder': [4470, 215]}


def anchor(name: str, x: int, y: int) -> dict:
    return {'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
            'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True}


def main() -> None:
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_summit.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cols, rows = W // 32, H // 32
    cells = [[' '] * cols for _ in range(rows)]
    for x, y, w, h in WALK:
        for row in range(y // 32, min(rows, (y + h + 31) // 32)):
            for col in range(x // 32, min(cols, (x + w + 31) // 32)):
                cells[row][col] = FLOOR
    entities = [{'type': 'prop', 'id': f'summit_chunk_{i}', 'image': f'assets/props/summit336_chunk_{i}.png',
                 'x': i * 1152, 'y': 0, 'w': 1152, 'h': 2, 'solid': False, 'sortY': -3} for i in range(W // 1152)]
    for name, x, y in (('summit_stand_player', TALK_X, 386), ('summit_stand_gyeongsub', TALK_X - 70, 366),
                       ('summit_stand_ppaman', TALK_X - 70, 410)):
        entities.append(anchor(name, x, y))
    entities.extend([
        {'type': 'npc', 'id': 'summit_gajaeman', 'sprite': 'gajaeman_shadow', 'x': 4150, 'y': -300,
         'facing': 'left', 'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.89},
        # 대치 → 전투. 이긴 뒤엔 스크립트가 바로 끝난다(이어하기에서 대치 뒤 저장이면 전투부터)
        {'type': 'trigger', 'id': 'summit_confront', 'x': 3480, 'y': 340, 'w': 24, 'h': 110, 'script': 'castle_summit_confront'},
        {'type': 'trigger', 'id': 'summit_back', 'x': 112, 'y': H - 58, 'w': 236, 'h': 10, 'script': 'castle_spire_back'},
    ])
    data = {
        'id': MAP_ID, 'name': '가재맨성 꼭대기', 'stage': 'castle_arena_seen',
        'bgm': None, 'followScreenY': 200, 'rows': [''.join(row) for row in cells],
        'preload': [f'assets/props/summit336_chunk_{i}.png' for i in range(W // 1152)] + [GIANT['image']],
        'spawns': {'start': {'x': 218, 'y': 690, 'facing': 'up'}, 'confront': {'x': TALK_X, 'y': 386, 'facing': 'right'}},
        'meta': {'connected': True, 'summit': {'giant': GIANT, 'smoke': [3990, W], 'gajaeman': 'summit_gajaeman'}},
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
