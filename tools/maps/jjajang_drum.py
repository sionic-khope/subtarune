#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_drum.py [--check]
# ──────────────────
"""드럼통 길(jjajang_drum, BUILD242 사용자 브리핑 2026-09-19):
"그 다음맵 찍어주는데 맵 중간쯤에 [파란 드럼통 사진] 이런 드럼통 스프라이트 만들어서 넣어주고 거기 가운데로 가면 연출 시작." → 청소부 이별 연출(jjajang_drum_talk), 요플래 혼자 오른쪽 다음 맵(jjajang_chin1)으로.
- 굽이 길(jjajang_run2) 오른쪽 끝에서 왼쪽 가장자리(8~9행)로 들어와 오른쪽 끝까지 곧은 검은 물길(파란 토리이 길과 같은 지역 자산: '*' 검은 물, 소나무).
- 드럼통(assets/props/jjajang_drum.png, 사진 → gpt-image) 은 길 위 칸(7행) 가운데 32열에 서 있고, 30~31열 트리거(한 번) → jjajang_drum_talk. 컷신이 다음 맵으로 보내지만 동쪽 문도 둔다(QA·재방문)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_drum'
WIDTH: Final = 64
HEIGHT: Final = 14
TILE: Final = 32
ROAD_ROWS: Final = (8, 9)
RUN_SPEED: Final = 420
CAM_LEFT: Final = 0.22
SCREEN_W: Final = 480
DRUM_COL: Final = 32               # 드럼통 밑동 가운데 칸(길 위 칸 7행)
DRUM: Final = ('assets/props/jjajang_drum.png', 33, 56)
TRIGGER_COLS: Final = (30, 31)     # “거기 가운데로 가면” — 드럼통 바로 앞
NEAR_BASE: Final = (57.0, 285.3)
FAR_BASE: Final = (196.0, 216.6)
BACK_OFFSET: Final = (176, 121)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
)


def pine(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = PINES[index % len(PINES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {
        'type': 'prop', 'id': f'jjajang_pine_{index + 1}', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True,
    }


def torii(tag: str, col: int, road_rows: tuple[int, int]) -> list[dict[str, object]]:
    """가까운 기둥 밑동을 길 아래 칸 위쪽 2px 에, 먼 기둥은 계약대로 오른쪽 위(길 위 칸)."""
    near_x = col * TILE + 16
    near_y = (road_rows[1] + 1) * TILE + 2
    ix = round(near_x - NEAR_BASE[0])
    iy = round(near_y - NEAR_BASE[1])
    far_x = ix + FAR_BASE[0]
    far_y = iy + FAR_BASE[1]
    back = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_back', 'image': 'assets/props/jjajang_torii_blue_back.png',
        'x': round(far_x - 12), 'y': round(far_y - 22), 'w': 24, 'h': 22, 'ix': ix + BACK_OFFSET[0], 'iy': iy + BACK_OFFSET[1], 'solid': True,
    }
    front = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_front', 'image': 'assets/props/jjajang_torii_blue_front.png',
        'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24, 'ix': ix, 'iy': iy, 'solid': True,
    }
    assert (road_rows[0] - 1) * TILE <= back['y'] and back['y'] + back['h'] <= road_rows[0] * TILE, '먼 기둥 히트박스는 길 위 칸 안'
    assert (road_rows[1] + 1) * TILE <= front['y'] and front['y'] + front['h'] <= (road_rows[1] + 2) * TILE, '가까운 기둥 히트박스는 길 아래 칸 안'
    assert iy >= 0
    return [back, front]


def drum_prop() -> dict[str, object]:
    file, width, height = DRUM
    cx, base_y = DRUM_COL * TILE + 16, (ROAD_ROWS[0] - 1) * TILE + 30   # 밑변은 길 위 칸 바닥 2px 위
    return {
        'type': 'prop', 'id': 'jjajang_drum', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': cx - width // 2, 'iy': base_y - height, 'solid': True,
    }


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in ROAD_ROWS:
        for col in range(WIDTH):
            rows[row][col] = '*'
        rows[row][0] = '+'
        rows[row][WIDTH - 1] = '+'
    cells: list[tuple[int, int]] = []
    for col in range(7, WIDTH - 6, 9):
        for row in (4, 12):
            c, r = col + (row // 8) % 2 * 3, row + (col // 9) % 2
            if rows[r][c] != '@' or c <= 2:
                continue
            cells.append((c, r))
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(cells)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    drum = drum_prop()
    assert rows[(drum['y'] + 6) // TILE][(drum['x'] + 12) // TILE] == '@', '드럼통 밑동은 길 밖'
    talk_trigger = {
        'type': 'trigger', 'id': 'drum_talk_trigger', 'x': TRIGGER_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE,
        'once': True, 'flag': 'drum_talk_started', 'unless': 'drum_talk_done', 'script': 'jjajang_drum_talk',
    }
    assert talk_trigger['x'] + talk_trigger['w'] <= drum['x'] + 12, '트리거는 드럼통 앞(왼쪽)'
    door_west = {'type': 'door', 'id': 'drum_run2_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE, 'to': 'jjajang_run2', 'spawn': 'from_east', 'sfx': False}
    door_east = {'type': 'door', 'id': 'drum_chin1_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE, 'to': 'jjajang_chin1', 'spawn': 'from_west', 'sfx': False}
    return {
        'id': MAP_ID,
        'name': '드럼통 길',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_drum': {'x': 25 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE - 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0]], [WIDTH - 2, ROAD_ROWS[0]]],
            'role': '굽이 길 다음: 곧은 검은 물길, 가운데 드럼통 앞에서 청소부 이별 연출(요플래 혼자 오른쪽 다음 맵 jjajang_chin1 로). 브금 my_castle_town 이어짐',
            'drum': [DRUM_COL, ROAD_ROWS[0] - 1],
        },
        'entities': [*pines, drum, talk_trigger, door_west, door_east],
    }


def main() -> None:
    if '--help' in sys.argv:
        print(f'Usage: /usr/bin/python3 tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json')
    map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, map_data['meta'].get('runs', ''))


if __name__ == '__main__':
    main()
