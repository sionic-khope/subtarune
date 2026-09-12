#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from the repository root: uv run tools/maps/obj3.py [--check]
# ──────────────────
"""옵젝영역3: 얕은 물과 숲 사이로 바론 둥지(obj4)에 이어지는 짧은 윗길."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

sys.path.insert(0, '.')
from tools.maps.objlib import water

T: Final = 32
WIDTH: Final = 18
HEIGHT: Final = 16


def main() -> None:
    rows = [[' '] * WIDTH for _ in range(HEIGHT)]
    for r in range(HEIGHT):
        for c in range(5, 13):
            rows[r][c] = 'c'
        for c in range(7, 11):
            rows[r][c] = 'Y' if r in (0, HEIGHT - 1) else water(r, c)
        rows[r][13] = 'c'
        rows[r][4] = 'c'
    for c in range(4, 14):
        if c < 7 or c > 10:
            rows[HEIGHT - 1][c] = 'V'
    trees = []
    for r in (3, 5, 7, 9, 11, 13):
        for c in (6, 11):
            x, y = c * T + 4, r * T + 16
            image = 'tree_obj_purple' if (r + c) % 4 == 0 else 'tree_obj'
            trees.append({
                'type': 'prop', 'id': f'ot{len(trees)}',
                'image': f'assets/props/{image}.png',
                'x': x, 'y': y, 'w': 24, 'h': 12,
                'ix': x - 16, 'iy': y - 72, 'solid': True,
            })
    data = {
        'id': 'obj3', 'name': '옵젝영역 — 둥지 앞길', 'stage': 'void_fallen',
        'bgm': 'wind', 'dim': 0.12, 'backdrop': 'obj_forest',
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'start': {'x': 276, 'y': 432, 'facing': 'up'},
            'from_bottom': {'x': 276, 'y': 432, 'facing': 'up'},
            'from_top': {'x': 276, 'y': 96, 'facing': 'down'},
        },
        'meta': {'connected': True, 'approachPx': 392, 'corridorWidth': 128},
        'entities': [
            {'type': 'door', 'id': 'south_exit', 'x': 224, 'y': 472, 'w': 128, 'h': 8,
             'to': 'obj2', 'spawn': 'from_top', 'sfx': False},
            {'type': 'door', 'x': 224, 'y': 32, 'w': 128, 'h': 8,
             'to': 'obj4', 'spawn': 'from_bottom', 'sfx': False},
            *trees,
        ],
    }
    output = Path('assets/maps/obj3.json')
    if '--check' in sys.argv:
        same = json.loads(output.read_text(encoding='utf-8')) == data
        print('obj3', 'same' if same else 'DIFFERENT')
        sys.exit(0 if same else 1)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print('wrote obj3', WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
