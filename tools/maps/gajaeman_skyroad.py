#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/gajaeman_skyroad.py [--check]
# ──────────────────
"""BUILD358 straight road below the summit (사용자 2026-09-26): black background, a navy stone road that runs
straight right and is a little tall. The party lands at the top-left after leaping off the broken end; 섭 몬스터 leap
in from above/below in each stretch and the 편집노조 knock them away (비데 → 파크가디언 → 뚜울라·도트마리오), then at
the far right four swords fly in and 영클 lasers them before the party goes on to the raft room.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'gajaeman_castle_skyroad'
W, H = 2560, 480
FLOOR: Final = '▒'
# 걷는 곳: 가로로 쭉 이어진 길(세로 9칸)
BAND: Final = (96, 384)
# 구간 이벤트(트리거 x): 비데 · 파크가디언 · 뚜울라와 도트마리오 · 끝(검 넷과 영클 레이저)
ZONES: Final = [('road_z1', 520), ('road_z2', 1120), ('road_z3', 1720), ('road_end', 2240)]
# 구간별 섭 몬스터(결전지 소환 그림 재사용): (구간, 이름, 위/아래, 그림 w, h)
MONSTERS: Final = [(1, 'teemo', 'top', 60, 44), (1, 'ahri', 'bottom', 84, 72),
                   (2, 'darius', 'top', 92, 90), (2, 'nasus', 'bottom', 92, 96),
                   (3, 'thresh', 'top', 84, 92), (3, 'blitzcrank', 'bottom', 104, 100), (3, 'fiddlesticks', 'top', 88, 94)]
ALLIES: Final = [('road_bidet', 'warm_bidet', None), ('road_park', 'park_guardian_costume', 2.22),
                 ('road_ttuulla', 'ttuulla', 1.79), ('road_mario', 'mini_mario', None), ('road_youngcle', 'youngcle_hover', None)]


def main() -> None:
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/gajaeman_skyroad.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    cols, rows = W // 32, H // 32
    cells = [[' '] * cols for _ in range(rows)]
    for row in range(BAND[0] // 32, BAND[1] // 32):
        for col in range(cols):
            cells[row][col] = FLOOR
    entities = [
        {'type': 'npc', 'id': 'road_gajaeman', 'sprite': 'gajaeman_shadow', 'x': -120, 'y': 120, 'facing': 'right',
         'solid': False, 'wander': 0, 'hidden': True, 'visualScale': 1.89},
    ]
    for zone, name, side, w, h in MONSTERS:
        entities.append({'type': 'prop', 'id': f'road_mon_{name}', 'image': f'assets/props/arena332_{name}.png',
                         'x': 0, 'y': -400, 'solid': False, 'hidden': True})
    for actor_id, sprite, scale in ALLIES:
        entities.append({'type': 'npc', 'id': actor_id, 'sprite': sprite, 'x': 0, 'y': -400, 'facing': 'left',
                         'solid': False, 'wander': 0, 'hidden': True, **({'visualScale': scale} if scale else {})})
    for trigger_id, x in ZONES:
        entities.append({'type': 'trigger', 'id': trigger_id, 'x': x, 'y': BAND[0], 'w': 24, 'h': BAND[1] - BAND[0],
                         'script': f'castle_{trigger_id}'})
    data = {
        'id': MAP_ID, 'name': '가재맨성 끝없는 길', 'stage': 'castle_summit_ready',
        # 용준 등장 때 튼 곡(save_the_world)이 이어진다 — 이어하기·QA 점프에서도 같은 곡
        'bgm': 'save_the_world', 'bgmVolume': 0.6, 'rows': [''.join(row) for row in cells],
        'enter': {'script': 'castle_road_intro', 'early': True},
        'preload': ['assets/props/cathedral323_sword.png'] + [f'assets/props/arena332_{n}.png' for _, n, *_ in MONSTERS],
        'spawns': {'start': {'x': 72, 'y': 124, 'facing': 'right'}, 'end': {'x': 2200, 'y': 224, 'facing': 'right'}},
        'meta': {'connected': True, 'descent': {'kind': 'road', 'band': list(BAND), 'gajaeman': 'road_gajaeman',
                                                'monsters': [{'zone': z, 'id': f'road_mon_{n}', 'side': s, 'w': w, 'h': h} for z, n, s, w, h in MONSTERS]}},
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
