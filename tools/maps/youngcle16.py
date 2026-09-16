#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle16.py [--check]
# ──────────────────
"""용광로 화물 검사실 2(BUILD193): youngcle15 다음. 3상자 퍼즐, 최소 31회(두 방 중 더 어렵다). 오른쪽 끝은 열린 통로(다음 맵은 다음 브리핑).
가운데 격벽 기둥(col 8)이 방을 둘로 나누고 상자는 row 5·row 10 두 통로로만 건넌다. 발판 셋은 오른쪽 아래 주머니(col 12, rows 8~10) 세로: 위 발판부터 채워야 하고, 상자마다 아래 통로로 내려갔다 오른쪽 벽을 타고 올라간다."""
from __future__ import annotations

import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from furnace_crate_room import build_room  # noqa: E402

MAP_ID = 'youngcle16'
LAYOUT = [
    ",,,,,,,,,",
    ",C,,#,,,,",
    ",,C,#,##,",
    ",,,,#,,,X",
    ",C,,#,##X",
    ",,,,,,,,X",
    ",,,,#,,,,",
]
# tools/maps/crate_solver.py: 31회
SOLUTION = ['AR', 'AR', 'AD', 'AD', 'AD', 'AD', 'AR', 'AR', 'AR', 'AR', 'AR', 'AU', 'AU', 'BR', 'BD', 'BD', 'BD', 'BR', 'BR', 'BR', 'BR', 'BR', 'BU',
            'CR', 'CR', 'CD', 'CR', 'CR', 'CR', 'CR', 'CR']


def main() -> None:
    data = build_room(map_id=MAP_ID, name='용광로 화물 검사실 2', layout=LAYOUT, pushes=31, solution=SOLUTION, difficulty='hardest',
                      prev_map='youngcle15', prev_spawn='landing', next_map=None, next_spawn=None)
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
