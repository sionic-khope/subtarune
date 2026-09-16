#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle15.py [--check]
# ──────────────────
"""용광로 화물 검사실 1(BUILD193): 용암 수로(youngcle14) 위 착지 오른쪽 → 이 방 → youngcle16. 3상자 퍼즐, 최소 25회(youngcle5 의 16회보다 어렵게 — 사용자 “메커니즘 3보다 좀더 어렵게”).
발판 셋이 오른쪽 위 주머니(col 12, rows 5~7)에 세로로: 주머니 입구는 row 7 한 줄뿐이라 맨 위 발판부터 채워야 하고, 마지막 상자는 아래에서 기둥을 타고 올라온다."""
from __future__ import annotations

import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from furnace_crate_room import build_room  # noqa: E402

MAP_ID = 'youngcle15'
LAYOUT = [
    ",,,,,,#,X",
    ",,C,,,#,X",
    ",,,,,,,,X",
    ",,,,C,,#,",
    ",,,,,,,#,",
    ",C,,,,,,,",
    ",,,,,,,,,",
]
# tools/maps/crate_solver.py: 25회
SOLUTION = ['AR', 'AR', 'AR', 'AD', 'AR', 'AR', 'AR', 'AU', 'AU', 'BR', 'BR', 'BU', 'BR', 'BR', 'BU',
            'CR', 'CR', 'CR', 'CR', 'CR', 'CR', 'CR', 'CU', 'CU', 'CU']


def main() -> None:
    data = build_room(map_id=MAP_ID, name='용광로 화물 검사실 1', layout=LAYOUT, pushes=25, solution=SOLUTION, difficulty='harder',
                      prev_map='youngcle14', prev_spawn='top_end', next_map='youngcle16', next_spawn='left')
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID)


if __name__ == '__main__':
    main()
