#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_raft.py [--check]
# ──────────────────
"""BUILD358 raft room (사용자 2026-09-26): about two seconds' walk right of the entrance, a small pool (about 3x3)
with a raft in the middle sits at the foot of a colossal wall (assets/props/raft358_wall.png). 가재맨 flies ahead and
rises up the wall; 경섭·억빠맨 dive under the raft, gather strength and jump, lifting 요플래 on the raft up the wall
to the ledge on top.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_raft'
W, H = 800, 1504
FLOOR: Final = '▒'
BAND: Final = (1216, 1472)
# 웅덩이(걷지 못함): x, y, w, h — 벽 바로 앞
POOL: Final = (384, 1280, 160, 128)   # BUILD362 20% 넓게 → BUILD367 타일 칸에 맞춤(5×4칸, 사용자 “칸이 안 맞고”)
WALL: Final = {'image': 'assets/props/raft358_wall.png', 'x': 322, 'bottom': 1260, 'w': 316, 'h': 1068}
# 벽 꼭대기 턱(걷는 곳)
LEDGE: Final = (320, 64, 320, 128)
# 웅덩이 옆에 멈춰 서는 자리(발)
STAND: Final = {'player': (356, 1340), 'gyeongsub': (316, 1310), 'ppaman': (316, 1370)}


def anchor(name: str, x: int, y: int) -> dict:
    return {'type': 'prop', 'id': name, 'image': 'assets/tiles/castle306_floor.png',
            'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': False, 'hidden': True}


def main() -> None:
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_raft.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cols, rows = W // 32, H // 32
    cells = [[' '] * cols for _ in range(rows)]
    for x, y, w, h in ((0, BAND[0], W, BAND[1] - BAND[0]), LEDGE):
        for row in range(y // 32, (y + h) // 32):
            for col in range(x // 32, (x + w) // 32):
                cells[row][col] = FLOOR
    px, py, pw, ph = POOL
    for row in range(py // 32, (py + ph) // 32):
        for col in range(px // 32, (px + pw) // 32):
            cells[row][col] = ' '
    entities = [
        {'type': 'prop', 'id': 'raft_wall', 'image': WALL['image'], 'x': WALL['x'], 'y': WALL['bottom'] - WALL['h'],
         'w': WALL['w'], 'h': 2, 'solid': False, 'sortY': -3},
        {'type': 'npc', 'id': 'raft_gajaeman', 'sprite': 'gajaeman_shadow', 'x': -120, 'y': 1200, 'facing': 'right',
         'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.89},
    ]
    for name, (fx, fy) in STAND.items():
        entities.append(anchor(f'raft_stand_{name}', fx - 12, fy - 16))
    data = {
        'id': MAP_ID, 'name': '가재맨성 뗏목 웅덩이', 'stage': 'castle_summit_ready',
        'bgm': 'save_the_world', 'bgmVolume': 0.6, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_raft_intro', 'early': True},
        'preload': [WALL['image'], 'assets/props/raft.png', 'assets/sprites/hyungsub-rise.png', 'assets/backdrops/castle_sunset359.png', 'assets/props/maillard_sun.png'],
        'spawns': {'start': {'x': 24, 'y': 1310, 'facing': 'right'}, 'top': {'x': 468, 'y': 110, 'facing': 'down'}},
        # 꼭대기 턱은 뗏목 연출로만 올라간다(걸어서 닿지 않음) — 연결 검사 대상 아님
        'meta': {'connected': False, 'descent': {'kind': 'raft', 'band': list(BAND), 'gajaeman': 'raft_gajaeman',
                                                'pool': list(POOL), 'wall': WALL, 'ledge': list(LEDGE), 'raft': 'assets/props/raft.png'}},
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
