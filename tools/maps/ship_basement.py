#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: uv run tools/maps/ship_basement.py [--check]
# ──────────────────
"""엄청대박인배 지하실(BUILD468 청소부 히든 보스): 라운지 분수 뒤 버튼 함정으로 경섭·요플래가 떨어지는 빈 방.
사용자 “엄청대박인배 스프라이트지만 약간 빈방같은곳에 떨어짐 지하실느낌의” — 라운지와 같은 철벽(G)·바닥(: ;)·배관, 가구 없이 어둡게(dim).
가로로 길어(30칸) 청소부가 오른쪽에서 걸어 들어올 때 카메라가 오른쪽으로 움직인다. 들어오면 연출 ship_basement_janitor(이미 이겼으면 라운지로 올려 보낸다)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = 'ship_basement'
WIDTH: Final = 30
HEIGHT: Final = 14
P: Final = 'assets/props/'


def main() -> None:
    """Write deterministic map JSON, or audit it without mutating files."""
    cells = [['G'] * WIDTH for _ in range(HEIGHT)]
    for row in range(5, HEIGHT - 1):
        for col in range(1, WIDTH - 1):
            cells[row][col] = ';' if row in (5, HEIGHT - 2) else ':'
    entities = [
        *[{'type': 'prop', 'id': f'basement_conduit_{i}', 'image': P + 'ship_conduit.png',
           'x': x, 'y': 136, 'w': 98, 'h': 24, 'ix': x, 'iy': 28, 'solid': True,
           'anim': {'cols': 3, 'fps': 3}}
          for i, x in enumerate((96, 412, 728))],
        # 허약 청소부(방 안 오른쪽에서 걸어 들어옴)·강한 청소부(멸공의 깃발, 위에서 내려찍음) — 연출이 show 한다
        # 허약 청소부 x 656: 멈추는 자리(요플래 오른쪽 88px = 412)까지 244px. 오른쪽 벽 앞(900)에서 걷던 488px 의 절반 — 사용자 2026-10-15 “벽에서 나오는느낌인데 걷는시간 반절로”
        {'type': 'npc', 'id': 'basement_janitor', 'sprite': 'janitor', 'x': 656, 'y': 300, 'w': 24, 'h': 16,
         'facing': 'left', 'wander': 0, 'hidden': True, 'solid': False, 'unless': 'janitor_hidden_won'},
        {'type': 'npc', 'id': 'janitor_hero', 'sprite': 'janitor_hero', 'x': 290, 'y': 300, 'w': 24, 'h': 16,
         'facing': 'down', 'wander': 0, 'hidden': True, 'solid': False, 'unless': 'janitor_hidden_won'},
    ]
    map_data = {
        'id': MAP_ID, 'name': '엄청대박인배 지하실', 'stage': 'ship_ending_done',
        'bgm': None, 'dim': 0.32, 'rows': [''.join(row) for row in cells],
        'preload': ['assets/sprites/janitor.png', 'assets/battle/janitor-hero-stand.png', 'assets/battle/janitor-hero-laugh.png'],
        'spawns': {
            'start': {'x': 300, 'y': 300, 'facing': 'down'},
            'fall': {'x': 300, 'y': 300, 'facing': 'down'},
        },
        'enter': {'script': 'ship_basement_janitor'},
        'meta': {'connected': False, 'role': '청소부 히든 보스 — 함정으로 떨어지는 지하실'},
        'entities': entities,
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
