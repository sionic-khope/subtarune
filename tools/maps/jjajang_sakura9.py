#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura9.py [--check]
# ──────────────────
"""벚꽃 숲 9 — 파란 토리이 달리기(jjajang_sakura9, BUILD282 사용자 브리핑 2026-09-21 — 원문 design/narrative/cutscenes/jjajang_sakura8.md):
"위쪽길로가면 위살짝갔다가 왼쪽으로 살짝 갔다가 왼쪽으로 쭊 이어져있는 파란호리이 분홍색 나뭇가지랑 나뭇잎들 쳐낼수있는 기믹 한 15초정도 달리는 맵 찍어줘" / "파란호리이 기믹 참고잘하고"
- 벚꽃 숲 8 윗줄 문에서 아래 가장자리(218~219열)로 들어와 위로 7칸 → 8~9행에서 왼쪽으로 12칸 → 파란 토리이(가까운 기둥 206열, 토리이 굽이 길과 같은 소품·자리 계산)를 왼쪽으로 지나면
  러너(dir −1, 420px/s, meta.runs.a): 장애물은 분홍 벚꽃 잎·꽃가지·꽃잎 다발(assets/props/run_sakura_*.png, 쳐내면 분홍 꽃잎 조각) — 왼쪽 362px 에서 제동(≈ 14.6초). 바닥은 분홍 꽃잎 땅(물 아님 → 물결·물걸음 없음, meta.runs.a.water false).
- 왼쪽 끝은 길만(다음 맵 없음). 지역 자산: 벚꽃 나무 판, 꽃잎 초당 18, 브금 sakura, 발소리 없음."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura9'
WIDTH: Final = 232
HEIGHT: Final = 18                    # 달리는 길 아래 나무 밑동을 15~16행에 둬 캐노피(≤167px)가 길(8~9행, y 256~320)을 안 덮게(첫 플레이테스트 스크린샷: 달리는 주인공·장애물이 캐노피에 가려짐)
TILE: Final = 32
GROUND: Final = ')'
RUN_ROWS: Final = (8, 9)              # 달리는 길(왼쪽으로)
ENTRY_COLS: Final = (218, 219)        # 아래 가장자리에서 위로
TURN_COLS: Final = (206, 219)         # 왼쪽으로 살짝(토리이까지)
TORII_COL: Final = 206                # 가까운 기둥 밑동 칸(왼쪽으로 지남)
RUN_SPEED: Final = 420
END_X: Final = 362                    # 왼쪽 끝 제동 자리(러너 기본값)
OBSTACLE_TYPES: Final = ('sakura_leaf', 'sakura_petals', 'sakura_leaf2', 'sakura_branch', 'sakura_leaf', 'sakura_petals')
PETAL_COLORS: Final = ('#ffc2e0', '#ff8ad0', '#ffffff')   # 쳐낼 때 흩날리는 조각(분홍 2톤 + 흰)
NEAR_BASE: Final = (57.0, 285.3)      # 토리이 굽이 길(tools/maps/jjajang_run2.py)과 같은 자리 계산
FAR_BASE: Final = (196.0, 216.6)
BACK_OFFSET: Final = (176, 121)
OBSTACLE_IMAGES: Final = ('assets/props/run_sakura_leaf_1.png', 'assets/props/run_sakura_leaf_2.png', 'assets/props/run_sakura_branch.png', 'assets/props/run_sakura_petals.png')
TREES: Final = (
    ('assets/props/jjajang_sakura_1.png', 141, 157, 100),
    ('assets/props/jjajang_sakura_2.png', 135, 159, 30),
    ('assets/props/jjajang_sakura_3.png', 108, 167, 60),
    ('assets/props/jjajang_sakura_4.png', 167, 146, 58),
)
PETALS: Final = {'rate': 18, 'burst': 0, 'burstRate': 18, 'burstSeconds': 0, 'after': 18}


def tree(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {'type': 'prop', 'id': f'sakura9_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def torii(tag: str, col: int, road_rows: tuple[int, int]) -> list[dict[str, object]]:
    """가까운 기둥 밑동을 길 아래 칸 위쪽 2px 에, 먼 기둥은 계약대로 오른쪽 위(길 위 칸) — 토리이 굽이 길과 같은 계산."""
    near_x = col * TILE + 16
    near_y = (road_rows[1] + 1) * TILE + 2
    ix = round(near_x - NEAR_BASE[0]); iy = round(near_y - NEAR_BASE[1])
    far_x = ix + FAR_BASE[0]; far_y = iy + FAR_BASE[1]
    back = {'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_back', 'image': 'assets/props/jjajang_torii_blue_back.png',
            'x': round(far_x - 12), 'y': round(far_y - 22), 'w': 24, 'h': 22, 'ix': ix + BACK_OFFSET[0], 'iy': iy + BACK_OFFSET[1], 'solid': True}
    front = {'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_front', 'image': 'assets/props/jjajang_torii_blue_front.png',
             'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24, 'ix': ix, 'iy': iy, 'solid': True}
    assert (road_rows[0] - 1) * TILE <= back['y'] and back['y'] + back['h'] <= road_rows[0] * TILE, '먼 기둥 히트박스는 길 위 칸 안'
    assert (road_rows[1] + 1) * TILE <= front['y'] and front['y'] + front['h'] <= (road_rows[1] + 2) * TILE, '가까운 기둥 히트박스는 길 아래 칸 안'
    assert iy >= 0
    return [back, front]


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int, ch: str = GROUND) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = ch
    fill(ENTRY_COLS[0], ENTRY_COLS[1], RUN_ROWS[0], HEIGHT - 1)             # 아래 가장자리 → 위로
    fill(0, TURN_COLS[1], RUN_ROWS[0], RUN_ROWS[1])                          # 왼쪽으로 쭉(토리이 → 왼쪽 끝)
    gates = torii('a', TORII_COL, RUN_ROWS)
    run_start_x = (TORII_COL - 3) * TILE
    ride = (run_start_x - END_X) / RUN_SPEED
    assert 13.5 <= ride <= 16.5, f'달리기 15초쯤: {ride:.1f}초'
    runs = {'a': {'dir': -1, 'endX': END_X, 'speed': RUN_SPEED, 'obstacles': True, 'seed': 41, 'types': list(OBSTACLE_TYPES), 'water': False, 'petals': list(PETAL_COLORS)}}
    cells: list[tuple[int, int]] = []
    for col in range(1, TURN_COLS[1], 3):                                    # 달리는 길 위아래(토리이 기둥 자리는 비운다)
        offset = (col // 3) % 2
        if abs(col - TORII_COL) > 3:
            cells += [(col, RUN_ROWS[0] - 3 + offset), (col + 1, RUN_ROWS[1] + 7 - offset)]   # 아래쪽 밑동 15~16행: 캐노피 위 끝(밑동 −167px) ≥ 343 > 길 아래 끝 320
    for row in range(RUN_ROWS[1] + 6, HEIGHT - 1, 2):                        # 입구 세로 길 양옆(길에서 3~4칸 떨어져 캐노피가 길을 덜 덮게)
        offset = (row // 2) % 2
        cells += [(ENTRY_COLS[0] - 3 - offset, row), (ENTRY_COLS[1] + 3 + offset, row)]
    for col in range(2, WIDTH - 1, 7):                                       # 위·아래 빈 숲
        cells += [(col, 2 + (col // 7) % 2), (col + 3, HEIGHT - 2 - (col // 7) % 2)]
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or not (0 <= col < WIDTH and 0 <= row < HEIGHT) or rows[row][col] != '@':
            continue
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    start = {'type': 'trigger', 'id': 'sakura9_torii_a', 'x': run_start_x, 'y': RUN_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_sakura9_start'}   # 가까운 기둥 왼쪽 = 왼쪽으로 지난 자리
    door_south = {'type': 'door', 'id': 'sakura9_south_door', 'x': ENTRY_COLS[0] * TILE, 'y': HEIGHT * TILE - 10, 'w': (ENTRY_COLS[1] - ENTRY_COLS[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura8', 'spawn': 'from_north', 'sfx': False}
    road_y = (RUN_ROWS[0] + 1) * TILE + 6
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 9', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'preload': ['assets/props/jjajang_torii_blue_back.png', 'assets/props/jjajang_torii_blue_front.png', *OBSTACLE_IMAGES],
        'spawns': {
            'from_south': {'x': ENTRY_COLS[0] * TILE + 4, 'y': (HEIGHT - 2) * TILE + 6, 'facing': 'up'},
            'start': {'x': ENTRY_COLS[0] * TILE + 4, 'y': (HEIGHT - 2) * TILE + 6, 'facing': 'up'},
            'torii': {'x': (TORII_COL + 2) * TILE + 4, 'y': road_y, 'facing': 'left'},
            'end': {'x': END_X + 20, 'y': road_y, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[ENTRY_COLS[0], HEIGHT - 2], [ENTRY_COLS[0], RUN_ROWS[0] + 1], [TORII_COL + 2, RUN_ROWS[0] + 1]],
            'role': '벚꽃 숲 8 윗줄 문 다음(BUILD282): 위로 살짝 → 왼쪽으로 살짝 → 파란 토리이 → 왼쪽으로 15초 달리기(분홍 나뭇잎·꽃가지 쳐내기) → 왼쪽 끝(다음 맵 없음). 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'runRoadRows': [list(RUN_ROWS)],
            'runs': runs,
            'sakura9': {'runRows': list(RUN_ROWS), 'entryCols': list(ENTRY_COLS), 'turnCols': list(TURN_COLS), 'toriiCol': TORII_COL, 'runStartX': run_start_x, 'endX': END_X, 'rideSeconds': round(ride, 1), 'roadY': road_y},
        },
        'entities': [*trees, *gates, start, door_south],
    }


def main() -> None:
    if '--help' in sys.argv:
        print(f'Usage: /usr/bin/python3 tools/maps/{MAP_ID}.py [--check]'); return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr); raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json'); index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8')); map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data; registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT'); raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID); index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura9_tree')]), 'ride', map_data['meta']['sakura9']['rideSeconds'])


if __name__ == '__main__':
    main()
