#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run: uv run tools/maps/ship_deck_epilogue.py [--check]
# ──────────────────
"""BUILD365 엄청대박인배 갑판 — 결말의 노을(사용자 2026-09-26). 밤 갑판(ship_night_deck)의 바닥·난간을 그대로 쓰고 하늘만
노을(castle_sunset_sky: 생성 노을 바다 + 마이야르 태양 + 광선)로, 인물은 역광·긴 그림자. 연출: ship_deck_epilogue."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'ship_deck_epilogue'
SOURCE: Final = Path('assets/maps/ship_night_deck.json')


def main() -> None:
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Usage: uv run tools/maps/ship_deck_epilogue.py [--check]', file=sys.stderr)
        raise SystemExit(2)
    src = json.loads(SOURCE.read_text(encoding='utf-8'))
    data = {
        'id': MAP_ID, 'name': '엄청대박인배 갑판', 'stage': 'castle_summit_ready',
        'bgm': 'wind', 'bgmVolume': 0.35, 'backdrop': 'castle_sunset_sky', 'followScreenY': src.get('followScreenY', 280),
        'rows': src['rows'],
        'enter': {'script': 'ship_deck_epilogue', 'early': True},
        'preload': [p for p in src['preload'] if 'night_sea' not in p] + ['assets/backdrops/castle_sunset359.png', 'assets/props/maillard_sun.png'],
        'spawns': {'start': {'x': 600, 'y': 376, 'facing': 'right'}},
        # 해는 오른쪽 바다 위: 화면 좌표(수평선·해 x)
        'meta': {'connected': True, 'stage': src['meta']['stage'],
                 'descent': {'kind': 'deck', 'band': [0, 0], 'horizonY': 200, 'sunX': 380, 'lookout': [612, 392]}},
        'entities': src['entities'],
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
