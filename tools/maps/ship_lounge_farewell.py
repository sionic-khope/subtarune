#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/ship_lounge_farewell.py [--check]
# ──────────────────
"""BUILD370 엄청대박인배 라운지 — 마지막 작별(사용자 2026-09-26). 결말 라운지(ship_lounge_epilogue)와 같은 방이지만 문은 닫혀 있고
(나갈 때 한쪽 문만 철컥 열림), 브금 없음. 아래에서 억빠맨·어깨동무한 경섭과 김형섭·빛의 요플래가 올라와 문 앞에 세로로 서고, 왼쪽엔 영클.
연출 ship_lounge_farewell → 문이 닫히고 0.8초 뒤 엔딩 크레딧."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'ship_lounge_farewell'
SOURCE: Final = Path('assets/maps/ship_lounge.json')
P: Final = 'assets/props/'
# 문 앞 세로 줄(발): 억빠맨 · 경섭+김형섭 · 요플래(빛), 왼쪽 영클
LINE: Final = {'ppaman': (384, 268), 'pair': (384, 318), 'yoplae': (384, 366), 'youngcle': (318, 272)}
DOOR: Final = {'x': 304, 'y': 16, 'w': 160, 'h': 192, 'enter': [408, 214], 'front': [408, 240], 'center': [384, 214]}


def main() -> None:
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/ship_lounge_farewell.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    src = json.loads(SOURCE.read_text(encoding='utf-8'))
    entities = []
    for e in src['entities']:
        if e['type'] != 'prop' or 'requires' in e or ('script' in e and e['id'] != 'ship_lounge_grand_door'):
            continue
        e = dict(e)
        if e['id'] == 'ship_lounge_grand_door':
            e['id'] = 'fw_door'; e.pop('script', None)
        entities.append(e)
    entities.append({'type': 'prop', 'id': 'fw_bandage', 'image': P + 'ship_lounge_bandage.png', 'x': 196, 'y': 236, 'solid': False, 'sortY': -2})
    for name, sprite, scale, start in (('ppaman', 'ppaman', None, (384, 700)), ('youngcle', 'youngcle', 2, LINE['youngcle'])):
        x, y = start
        entities.append({'type': 'npc', 'id': f'fw_{name}', 'sprite': sprite, 'x': x - 12, 'y': y - 24, 'facing': 'up',
                         'solid': False, 'wander': 0, **({'visualScale': scale} if scale else {})})
    data = {
        'id': MAP_ID, 'name': '엄청대박인배 라운지', 'stage': 'castle_summit_ready',
        'bgm': None, 'dim': src.get('dim', 0), 'rows': src['rows'],
        'enter': {'script': 'ship_lounge_farewell', 'early': True},
        'preload': [P + 'ship_lounge_grand_door.png', P + 'ship_lounge_grand_door_open.png', P + 'ship_lounge_bandage.png',
                    P + 'pair_hug_back.png', P + 'pair_hug_front.png', 'assets/sprites/gyeongsub-lookback.png'],
        'spawns': {'start': {'x': 372, 'y': 560, 'facing': 'up'}},
        'meta': {'connected': False, 'descent': {'kind': 'farewell', 'band': [0, 0], 'door': DOOR, 'line': {k: list(v) for k, v in LINE.items()},
                                                 'pair': list(LINE['pair']), 'charScale': 1}},
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
