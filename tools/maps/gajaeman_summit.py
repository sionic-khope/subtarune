#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_summit.py [--check]
# ──────────────────
"""BUILD337 tower summit (사용자 2026-09-25): up the short stair out of the clouds, then a walk right to the
broken end of the walkway, where 청소년 appears out of black smoke and the battle is fought on the spot.
BUILD342: shorter walk, one seamless edge piece, party packed on the broken end in the same screen as the battle.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_summit'
W, H = 2304, 768   # BUILD342: 시작 + 부서진 끝 두 조각(사용자 “오른쪽길 30% 줄여”) — 끝길은 EDGE 에서 끊긴다
FLOOR: Final = '▓'
# 걷는 곳: 구름에서 올라오는 계단, 오른쪽으로 이어진 길(부서진 끝 앞까지)
EDGE: Final = 1757
WALK: Final = [(112, 380, 236, 340), (112, 350, EDGE - 8 - 112, 86)]
# 대치·전투 한 화면(src/data/teen-battle.js view 와 같은 값): 화면 왼쪽 위 월드 좌표, 일행 발 위치(화면 좌표)
VIEW: Final = (1592, 188)
FEET: Final = {'player': (125, 176), 'gyeongsub': (93, 204), 'ppaman': (61, 232)}
GIANT_IMAGE: Final = 'assets/props/summit342_teen.png'


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
    for name, (fx, fy) in FEET.items():
        # 앵커 아래 가운데 = 발 자리
        entities.append(anchor(f'summit_stand_{name}', VIEW[0] + fx - 12, VIEW[1] + fy - 16))
    # BUILD352 2페이즈 격파 뒤 연출 배우(처음엔 숨김): 박용준·쥰희·영클·편집노조, 그리고 멈춰 설 자리(앵커 아래 가운데 = 발)
    for name, sprite, fx, fy, extra in (
        ('yongjun', 'yongjun', 1398, 404, {'facing': 'right'}),
        ('junhee', 'junhee', 1330, 392, {'facing': 'right'}),
        ('youngcle', 'youngcle_hover', 1300, 360, {'facing': 'right'}),
        ('bidet', 'warm_bidet', 1270, 372, {'facing': 'right'}),
        ('mario', 'mini_mario', 1250, 430, {'facing': 'right'}),
        ('ttuulla', 'ttuulla', 1225, 432, {'facing': 'right', 'visualScale': 1.79}),
        ('park', 'park_guardian_costume', 1200, 380, {'facing': 'right', 'visualScale': 2.22}),
    ):
        entities.append({'type': 'npc', 'id': f'finale_{name}', 'sprite': sprite, 'x': fx - 12, 'y': fy - 24, 'solid': False, 'wander': 0, 'hidden': True, **extra})
    for name, fx, fy in (('junhee', 1752, 392), ('youngcle', 1628, 360), ('mario', 1592, 430), ('bidet', 1562, 372), ('ttuulla', 1532, 432), ('park', 1500, 380)):
        entities.append(anchor(f'finale_stop_{name}', fx - 12, fy - 16))
    entities.extend([
        {'type': 'npc', 'id': 'summit_gajaeman', 'sprite': 'gajaeman_shadow', 'x': EDGE + 200, 'y': -300,
         'facing': 'left', 'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.89},
        # 대치 → 전투. 이긴 뒤엔 스크립트가 바로 끝난다(이어하기에서 대치 뒤 저장이면 전투부터)
        {'type': 'trigger', 'id': 'summit_confront', 'x': EDGE - 380, 'y': 340, 'w': 24, 'h': 110, 'script': 'castle_summit_confront'},
        {'type': 'trigger', 'id': 'summit_back', 'x': 112, 'y': H - 58, 'w': 236, 'h': 10, 'script': 'castle_spire_back'},
    ])
    data = {
        'id': MAP_ID, 'name': '가재맨성 꼭대기', 'stage': 'castle_arena_seen',
        # 들어오면 바람 소리만(사용자 “들어왔을때 바람소리만”) → 대치 중 Gallery
        'bgm': 'wind', 'bgmVolume': 0.35, 'followScreenY': 200, 'rows': [''.join(row) for row in cells],
        'preload': [f'assets/props/summit336_chunk_{i}.png' for i in range(W // 1152)] + [GIANT_IMAGE, 'assets/props/summit342_front.png', 'assets/props/teen342_down.png', 'assets/props/teen342_vacuum.png', 'assets/props/teen342_slam.png'] + [f'assets/props/teen342_rock_{i}.png' for i in range(6)] + [f'assets/props/teenboss339_debris_{i}.png' for i in range(6)] + ['assets/props/teenboss339_knee.png', 'assets/props/cathedral323_sword.png', 'assets/props/arena332_arm.png', 'assets/props/teen347_p2.png', 'assets/props/wooden_cannon.png', 'assets/props/ship_cannonball.png', 'assets/enemies/baron-roar-idle.png'],
        'spawns': {'start': {'x': 218, 'y': 690, 'facing': 'up'}, 'confront': {'x': VIEW[0] + FEET['player'][0] - 12, 'y': VIEW[1] + FEET['player'][1] - 24, 'facing': 'right'}},
        'meta': {'connected': True, 'summit': {'edge': EDGE, 'gajaeman': 'summit_gajaeman'}},
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
