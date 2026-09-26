#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/ship_lounge_epilogue.py [--check]
# ──────────────────
"""BUILD364 엄청대박인배 라운지 — 결말 퍼레이드 전용 복사본(사용자 2026-09-26). 원래 라운지(ship_lounge)의 바닥·소품을 그대로 쓰되
NPC·트리거·스크립트는 빼고, 보라 문은 오른쪽 문짝만 열려 밝은 빛이 새는 그림, 가운데 바닥엔 커다란 밴드. 연출: ship_lounge_epilogue."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'ship_lounge_epilogue'
SOURCE: Final = Path('assets/maps/ship_lounge.json')
P: Final = 'assets/props/'
# 퍼레이드 배우(처음엔 숨김): (id, 스프라이트, 시작 발 x, 발 y, 배율)
PARADE: Final = [('bidet', 'warm_bidet', 150, 430, None), ('mario', 'mini_mario', 120, 460, None),
                 ('park', 'park_guardian_costume', 640, 440, 2.22), ('ttuulla', 'ttuulla', 660, 470, 1.79),
                 ('obangsun', 'obangsun', 130, 440, None), ('naram', 'naram_giant', 640, 450, None),
                 ('yongjun', 'yongjun', 700, 380, None), ('junhee', 'junhee', 120, 400, None)]
# 지켜보는 일행(뒷모습): 억빠맨 왼쪽 · 경섭+김형섭 어깨동무(장면이 그림) 가운데 · 영클 오른쪽
WATCH: Final = {'ppaman': (322, 368), 'pair': (384, 372), 'youngcle': (456, 364)}
DOOR: Final = {'x': 304, 'y': 16, 'w': 160, 'h': 192, 'enter': [424, 214], 'front': [424, 240]}


def main() -> None:
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/ship_lounge_epilogue.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    src = json.loads(SOURCE.read_text(encoding='utf-8'))
    keep = [e for e in src['entities'] if e['type'] == 'prop' and 'requires' not in e and ('script' not in e or e['id'] == 'ship_lounge_grand_door')]
    entities = []
    for e in keep:
        e = dict(e)
        if e['id'] == 'ship_lounge_grand_door':
            e['image'] = P + 'ship_lounge_grand_door_open.png'; e['id'] = 'epi_door'; e.pop('script', None)
        entities.append(e)
    entities.append({'type': 'prop', 'id': 'epi_bandage', 'image': P + 'ship_lounge_bandage.png', 'x': 196, 'y': 236,
                     'solid': False, 'sortY': -2})
    for name, sprite, x, y, scale in PARADE:
        entities.append({'type': 'npc', 'id': f'epi_{name}', 'sprite': sprite, 'x': x - 12, 'y': y - 24, 'facing': 'up',
                         'solid': False, 'wander': 0, 'hidden': True, **({'visualScale': scale} if scale else {})})
    for name, sprite, scale in (('ppaman', 'ppaman', None), ('youngcle', 'youngcle', 2)):
        x, y = WATCH[name]
        entities.append({'type': 'npc', 'id': f'epi_{name}', 'sprite': sprite, 'x': x - 12, 'y': y - 24, 'facing': 'up',
                         'solid': False, 'wander': 0, **({'visualScale': scale} if scale else {})})
    data = {
        'id': MAP_ID, 'name': '엄청대박인배 라운지', 'stage': 'castle_summit_ready',
        'bgm': 'lounge_parade', 'bgmVolume': 0.6, 'dim': src.get('dim', 0), 'rows': src['rows'],
        'enter': {'script': 'ship_lounge_epilogue', 'early': True},
        'preload': [P + 'ship_lounge_grand_door_open.png', P + 'ship_lounge_bandage.png', P + 'pair_hug_front.png', P + 'pair_hug_back.png'],
        'spawns': {'start': {'x': 372, 'y': 520, 'facing': 'up'}},
        'meta': {'connected': False, 'descent': {'kind': 'lounge', 'band': [0, 0], 'door': DOOR, 'pair': list(WATCH['pair'])}},
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
