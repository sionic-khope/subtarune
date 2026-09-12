#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run from the repository root: uv run tools/maps/obj4.py [--check]
# ──────────────────
"""옵젝영역4: 바론 등장 연출용 대형 원형 둥지와 남쪽 진입로."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Final

sys.path.insert(0, '.')
from tools.maps.objlib import water

T: Final = 32
WIDTH: Final = 48
HEIGHT: Final = 52
CENTER: Final = (768, 624)
RADII: Final = (548, 446)
THORNS: Final = 'assets/props/baron_thorns.png'
CANNON: Final = 'assets/props/wooden_cannon_up.png'


def main() -> None:
    rows = [[' '] * WIDTH for _ in range(HEIGHT)]
    for r in range(1, HEIGHT - 1):
        for c in range(1, WIDTH - 1):
            x, y = c * T + T / 2, r * T + T / 2
            radius = ((x - CENTER[0]) / RADII[0]) ** 2 + ((y - CENTER[1]) / RADII[1]) ** 2
            if radius <= 1 or (22 <= c <= 25 and y >= 1024):
                rows[r][c] = water(r, c)
                if radius <= 0.72:
                    rows[r][c] = 'E'
            elif radius <= 1.26 or (20 <= c <= 27 and y >= 1024):
                rows[r][c] = 'c'
    for c in range(20, 28):
        rows[HEIGHT - 1][c] = 'Y' if 22 <= c <= 25 else 'c'
    entities = [
        {'type': 'door', 'x': 704, 'y': 1624, 'w': 128, 'h': 8,
         'to': 'obj3', 'spawn': 'from_top', 'sfx': False},
        {'type': 'trigger', 'id': 'nest_entry', 'x': 704, 'y': 1088,
         'w': 128, 'h': 40, 'once': True, 'flag': 'obj4_baron_seen',
         'unless': 'obj4_baron_done', 'script': 'obj4_baron_intro'},
        {'type': 'npc', 'id': 'baron', 'sprite': 'baron_intro', 'x': 756, 'y': 576,
         'facing': 'down', 'wander': 0, 'hidden': True, 'visualScale': 1.8,
         'unless': 'obj4_baron_done'},
        {'type': 'npc', 'id': 'baron_after', 'sprite': 'baron_intro', 'x': 756, 'y': 576,
         'facing': 'down', 'wander': 0, 'visualScale': 1.8,
         'requires': 'obj4_baron_done'},
        {'type': 'npc', 'id': 'yongjun', 'sprite': 'yongjun', 'x': 756, 'y': 872,
         'facing': 'up', 'wander': 0, 'unless': 'obj4_baron_done'},
        {'type': 'npc', 'id': 'voidgrub', 'sprite': 'voidgrub', 'x': 400, 'y': 848,
         'facing': 'right', 'wander': 0, 'solid': False, 'hidden': True, 'unless': 'obj4_baron_done'},
        {'type': 'prop', 'id': 'cannon_up', 'image': CANNON, 'scale': 1.25,
         'x': 704, 'y': 840, 'w': 128, 'h': 16, 'ix': 648, 'iy': 624,
         'solid': True, 'unless': 'obj4_baron_done'},
    ]
    for i in range(44):
        angle = math.tau * i / 44
        x = CENTER[0] + (RADII[0] + 28) * math.cos(angle)
        y = max(128, CENTER[1] + (RADII[1] + 24) * math.sin(angle))
        if y > 1024 and abs(x - CENTER[0]) < 136:
            continue
        entities.append({
            'type': 'prop', 'id': f'nest_thorn_{i}', 'image': THORNS,
            'x': round(x) - 32, 'y': round(y) - 8, 'w': 64, 'h': 16,
            'ix': round(x) - 64, 'iy': round(y) - 120,
            'solid': True,
        })
    data = {
        'id': 'obj4', 'name': '바론의 둥지', 'stage': 'void_fallen',
        'bgm': 'wind', 'dim': 0.16, 'backdrop': 'obj_forest',
        'spotlight': {'x': CENTER[0], 'y': CENTER[1], 'rx': 532, 'ry': 430, 'alpha': 0.14},
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'start': {'x': 756, 'y': 1568, 'facing': 'up'},
            'from_bottom': {'x': 756, 'y': 1568, 'facing': 'up'},
            'scene': {'x': 756, 'y': 1184, 'facing': 'up'},
            'after': {'x': 756, 'y': 944, 'facing': 'up'},
        },
        'meta': {
            'connected': True, 'arenaCenter': list(CENTER), 'arenaRadii': list(RADII),
            'approachPx': 440, 'stage': {
                'baron': [756, 576], 'yongjun': [756, 872],
                'grub': [560, 848], 'party': [756, 944],
            },
        },
        'preload': [CANNON, THORNS, 'assets/fx/baron_emerge_wind.png'],
        'entities': entities,
    }
    output = Path('assets/maps/obj4.json')
    if '--check' in sys.argv:
        same = json.loads(output.read_text(encoding='utf-8')) == data
        print('obj4', 'same' if same else 'DIFFERENT')
        sys.exit(0 if same else 1)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print('wrote obj4', WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
