#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura10.py [--check]
# ──────────────────
"""벚꽃 숲 10 — 파란 토리이 10초 달리기·절벽 오르막(jjajang_sakura10, BUILD283 사용자 브리핑 2026-09-21 — 원문 design/narrative/cutscenes/jjajang_sakura10.md):
"왼쪽으로 더 가면 맵 추가 파란토리이 10초짜리있고 장애물은없음, 왼쪽끝에 절벽오르막 있으며 거기로 가지면 꽤 점프되는 연출과함께 점프된뒤에 잔상 점프 한 슬로우 6초정도 하다가 떨어지는데
 점프할때 소리도 나고 그 살짝 벚꽃같은게 좀 나오다가 떨어져서 다음맵으로 전환되는거 만들어주샘"
- 벚꽃 숲 9 왼쪽 끝 문에서 동쪽 가장자리(10~11행)로 들어와 왼쪽으로 조금 → 파란 토리이(가까운 기둥 150열, 토리이 굽이 길과 같은 소품·자리 계산)를 왼쪽으로 지나면
  러너(meta.runs.a: dir −1, 420px/s, 장애물 없음, 물 아님) ≈ 10초 → endX(오르막 밑동 480px)에서 제동 없이 오르막(finale: 소품 비탈 그대로 ramp px 동안 rise 만큼 오르며 달림)
  → 도약(점프 소리) → 슬로우 6초(잔상·꽃잎 조금) → 낙하 → outro jjajang_sakura10_outro(어둡게 → 벚꽃 숲 11 나무 정상 착지).
- 길 위 하늘(0~9행)은 비워 둬 뛰어오른 주인공이 검은 하늘에 보인다. 절벽 왼쪽(오르막 소품 왼쪽 약 1220px)은 허공(@) — 슬로우 동안 앞으로 쭉 멀리뛰기(실시간 150px/s, 카메라가 따라가 맵이 흐른다)해 맵 안에서 떨어진다. 근처엔 나무 없음.
- 오르막 소품 assets/props/sakura_cliff_ramp.png(assets/source/sakura10-v1/export.py 가 비탈 시작·꼭대기 픽셀을 ramp-contract.json 에 적는다 → 여기서 읽어 자리·finale.ramp/rise 를 맞춘다), 항상 뒤에(sortY −1)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura10'
WIDTH: Final = 188
HEIGHT: Final = 20
TILE: Final = 32
GROUND: Final = ')'
RUN_ROWS: Final = (10, 11)            # 달리는 길(왼쪽으로) — 위 10행은 하늘(도약이 화면에 남게)
TORII_COL: Final = 178                # 가까운 기둥 밑동 칸(왼쪽으로 지남)
RUN_SPEED: Final = 420
END_X: Final = 1400                   # 오르막 밑동(러너 endX — 여기서 제동 없이 비탈로). 왼쪽 허공 약 1220px: 멀리뛰기(도약 92 + 슬로우 900 + 낙하 ≈170px)가 맵 안에서 끝난다
PETAL_COLORS: Final = ('#ffc2e0', '#ff8ad0', '#ffffff')
NEAR_BASE: Final = (57.0, 285.3)      # 토리이 굽이 길(tools/maps/jjajang_run2.py)과 같은 자리 계산
FAR_BASE: Final = (196.0, 216.6)
BACK_OFFSET: Final = (176, 121)
RAMP_CONTRACT: Final = Path('assets/source/sakura10-v1/ramp-contract.json')
TREE_MIN_COL: Final = END_X // TILE + 4   # 절벽 근처·허공엔 나무 없음
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
    return {'type': 'prop', 'id': f'sakura10_tree_{index + 1}', 'image': file,
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


def ramp_prop(feet_y: int) -> tuple[dict[str, object], dict[str, int]]:
    """오르막 소품: 비탈 시작(오른쪽 낮은 끝) 픽셀을 (END_X, 발 높이)에 맞춘다. finale.ramp/rise 는 비탈 시작 → 꼭대기 픽셀 차."""
    c = json.loads(RAMP_CONTRACT.read_text(encoding='utf-8'))
    sx, sy = c['slope_start']; tx, ty = c['slope_top']; w, h = c['size']
    ix, iy = END_X - sx, feet_y - sy
    assert ix > 0 and iy > 0 and sx > tx and sy > ty
    prop = {'type': 'prop', 'id': 'sakura10_cliff_ramp', 'image': c['file'], 'x': ix, 'y': iy, 'w': w, 'h': h, 'ix': ix, 'iy': iy, 'solid': False, 'sortY': -1}
    return prop, {'ramp': sx - tx, 'rise': sy - ty, 'topX': ix + tx, 'left': ix}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    road_y = (RUN_ROWS[0] + 1) * TILE + 6
    feet_y = road_y + 16
    ramp, geo = ramp_prop(feet_y)
    for row in range(RUN_ROWS[0], RUN_ROWS[1] + 1):                       # 길: 오르막 밑동 → 동쪽 끝(밑동 왼쪽은 허공)
        for col in range(END_X // TILE, WIDTH):
            rows[row][col] = GROUND
    gates = torii('a', TORII_COL, RUN_ROWS)
    run_start_x = (TORII_COL - 3) * TILE
    ride = (run_start_x - END_X) / RUN_SPEED
    assert 9.5 <= ride <= 11.0, f'달리기 10초쯤: {ride:.1f}초'
    runs = {'a': {'dir': -1, 'endX': END_X, 'speed': RUN_SPEED, 'obstacles': False, 'seed': 5, 'water': False, 'petals': list(PETAL_COLORS),
                  'finale': {'ramp': geo['ramp'], 'rise': geo['rise'], 'petalBurst': 36}, 'outro': 'jjajang_sakura10_outro'}}
    cells: list[tuple[int, int]] = []
    for col in range(TREE_MIN_COL, WIDTH - 1, 3):                            # 달리는 길 위아래(토리이 기둥 자리는 비운다)
        offset = (col // 3) % 2
        if abs(col - TORII_COL) > 3:
            cells += [(col, RUN_ROWS[0] - 3 + offset), (col + 1, RUN_ROWS[1] + 7 - offset)]   # 아래쪽 밑동 17~18행: 캐노피 위 끝 ≥ 439 > 길 아래 끝 384
    for col in range(TREE_MIN_COL + 2, WIDTH - 1, 7):                        # 아래 빈 숲
        cells += [(col + 3, HEIGHT - 2 - (col // 7) % 2)]
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or not (0 <= col < WIDTH and 0 <= row < HEIGHT) or rows[row][col] != '@':
            continue
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    start = {'type': 'trigger', 'id': 'sakura10_torii_a', 'x': run_start_x, 'y': RUN_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE, 'script': 'jjajang_sakura10_start'}   # 가까운 기둥 왼쪽 = 왼쪽으로 지난 자리
    door_east = {'type': 'door', 'id': 'sakura10_east_door', 'x': WIDTH * TILE - 10, 'y': RUN_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE, 'to': 'jjajang_sakura9', 'spawn': 'from_west', 'sfx': False}
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 10', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'preload': ['assets/props/jjajang_torii_blue_back.png', 'assets/props/jjajang_torii_blue_front.png', ramp['image']],
        'spawns': {
            'from_east': {'x': WIDTH * TILE - 60, 'y': road_y, 'facing': 'left'},
            'start': {'x': WIDTH * TILE - 60, 'y': road_y, 'facing': 'left'},
            'torii': {'x': (TORII_COL + 2) * TILE + 4, 'y': road_y, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[WIDTH - 2, RUN_ROWS[0] + 1], [TORII_COL + 2, RUN_ROWS[0] + 1]],
            'role': '벚꽃 숲 9 왼쪽 끝 문 다음(BUILD283): 왼쪽으로 조금 → 파란 토리이 → 왼쪽으로 10초 달리기(장애물 없음) → 절벽 오르막 → 도약·잔상 슬로우 6초·낙하 → 벚꽃 숲 11 나무 정상. 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'runRoadRows': [list(RUN_ROWS)],
            'runs': runs,
            'sakura10': {'runRows': list(RUN_ROWS), 'toriiCol': TORII_COL, 'runStartX': run_start_x, 'endX': END_X, 'rideSeconds': round(ride, 1), 'roadY': road_y, 'feetY': feet_y,
                         'ramp': {'left': geo['left'], 'topX': geo['topX'], 'len': geo['ramp'], 'rise': geo['rise']}},
        },
        'entities': [*trees, *gates, ramp, start, door_east],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura10_tree')]), 'ride', map_data['meta']['sakura10']['rideSeconds'], 'ramp', map_data['meta']['sakura10']['ramp'])


if __name__ == '__main__':
    main()
