#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura12.py [--check]
# ──────────────────
"""벚꽃 숲 12 — 제단(jjajang_sakura12, BUILD284 사용자 브리핑 2026-09-21 “그다음맵 위에 길 뚫어주고 위에 길로 가면 브금 잠깐꺼지고 그냥 그렇게 넓진않음 위로 가면 이제 가운데에 작은잘린 나무 재단? 같은곳위에 보라색 짜장면이 오오라를 뛰면서 (보라색) 배치되게해줘”):
- 벚꽃 숲 11 위쪽 길 끝 문에서 아래 가장자리(7~8열)로 들어와 위로 → 그리 넓지 않은 둥근 나무 널빤지 바닥(타일 '-'). 브금 shop3(사용자 지정, 벚꽃 숲 11 위쪽 길에서 sakura 가 꺼진 뒤 여기서 시작).
- 가운데 작은 잘린 나무 그루터기 제단(assets/props/sakura_stump_altar.png) 위에 어둠의 짜장면 그릇(assets/props/dark_jjajang.png, 보라 오라 = 소품 aura 옵션이 엔진에서 맥동하는 보라 빛을 그린다).
  두 그림 다 gpt-image(assets/source/sakura12-v1, export.py 가 그루터기 윗면 가운데 픽셀을 contract 에 적는다 → 그릇 자리).
- 둘레는 허공과 벚꽃 나무. 문은 아래(→ 벚꽃 숲 11 from_north)뿐. 짜장면을 얻는 방법은 아직 없음(브리핑 대기)."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura12'
WIDTH: Final = 16
HEIGHT: Final = 15
TILE: Final = 32
DECK: Final = '-'
CENTER: Final = (8, 6)                # 바닥 가운데 칸
RADII: Final = (5.4, 3.6)             # 둥근 바닥 반지름(그리 넓지 않음)
PATH_COLS: Final = (7, 8)             # 아래 가장자리 → 위로
ALTAR: Final = (8, 5)                 # 제단 칸(가운데, 살짝 위)
PETALS: Final = {'rate': 14, 'burst': 0, 'burstRate': 14, 'burstSeconds': 0, 'after': 14}
TREES: Final = (
    ('assets/props/jjajang_sakura_1.png', 141, 157, 100),
    ('assets/props/jjajang_sakura_2.png', 135, 159, 30),
    ('assets/props/jjajang_sakura_3.png', 108, 167, 60),
    ('assets/props/jjajang_sakura_4.png', 167, 146, 58),
)
RING: Final = 10
RING_PAD: Final = (1.5, 1.8)
STUMP_CONTRACT: Final = Path('assets/source/sakura12-v1/stump-contract.json')
BOWL_CONTRACT: Final = Path('assets/source/sakura12-v1/bowl-contract.json')
AURA: Final = {'rgb': '180,140,255', 'radius': 36, 'alpha': 0.72, 'pulse': 2.0, 'centerY': 0.55}   # 첫 스크린샷에서 옅어 반지름·세기 올림
BGM: Final = 'shop3'                  # 사용자 지정(2026-09-21 “짜장면 있는 맵 브금은 wsYUaus3RGI”): 20. Shop 3 (DELTARUNE Chapter 5) — assets/audio/bgm/shop3.mp3


def inside(col: int, row: int) -> bool:
    dx, dy = (col - CENTER[0]) / RADII[0], (row - CENTER[1]) / RADII[1]
    return dx * dx + dy * dy <= 1.0


def tree(index: int, cx: float, base_y: float) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    ix, iy = round(cx - base_x), round(base_y - height)
    if ix < -width // 2 or iy < -height // 2 or ix + width > WIDTH * TILE + width // 2 or base_y > HEIGHT * TILE + 8:
        return None
    return {'type': 'prop', 'id': f'sakura12_tree_{index + 1}', 'image': file,
            'x': round(cx) - 12, 'y': round(base_y) - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def altar() -> list[dict[str, object]]:
    """그루터기 제단(밑동을 ALTAR 칸 아래쪽에) + 그 윗면 가운데에 놓인 어둠의 짜장면(보라 오라). 그릇은 그루터기 뒤에 안 가리게 sortY 로 늘 그루터기 다음에."""
    st = json.loads(STUMP_CONTRACT.read_text(encoding='utf-8')); bw = json.loads(BOWL_CONTRACT.read_text(encoding='utf-8'))
    sw, sh = st['size']; bx, by = bw['size']; tx, ty = st['top']
    ax, ay = ALTAR[0] * TILE + 16, ALTAR[1] * TILE + 30            # 제단 밑동 가운데·바닥선
    six, siy = ax - sw // 2, ay - sh
    stump = {'type': 'prop', 'id': 'sakura12_altar', 'image': st['file'], 'x': ax - 18, 'y': ay - 14, 'w': 36, 'h': 14, 'ix': six, 'iy': siy, 'solid': True}
    bix, biy = six + tx - bx // 2, siy + ty - by + 4                    # 그릇 밑변이 윗면 가운데 살짝 아래
    bowl = {'type': 'prop', 'id': 'sakura12_dark_jjajang', 'image': bw['file'], 'x': bix, 'y': biy + by - 6, 'w': bx, 'h': 6, 'ix': bix, 'iy': biy, 'solid': False,
            'sortY': ay + 1, 'aura': dict(AURA)}
    return [stump, bowl]


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if inside(col, row):
                rows[row][col] = DECK
    for row in range(CENTER[1], HEIGHT):                                    # 아래 길: 바닥 → 아래 가장자리(문)
        for col in range(PATH_COLS[0], PATH_COLS[1] + 1):
            rows[row][col] = DECK
    trees = []
    for i in range(RING):
        ang = (i + 0.5) * 2 * math.pi / RING
        cx = (CENTER[0] + 0.5 + (RADII[0] + RING_PAD[0]) * math.cos(ang)) * TILE
        base_y = (CENTER[1] + 0.5 + (RADII[1] + RING_PAD[1]) * math.sin(ang)) * TILE + 30
        if base_y > CENTER[1] * TILE and abs(cx - (PATH_COLS[0] + 1) * TILE) < 3.5 * TILE:   # 아래 길 자리엔 나무 없음
            continue
        t = tree(len(trees), cx, base_y)
        if t:
            trees.append(t)
    props = altar()
    door_south = {'type': 'door', 'id': 'sakura12_south_door', 'x': PATH_COLS[0] * TILE, 'y': HEIGHT * TILE - 10, 'w': (PATH_COLS[1] - PATH_COLS[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura11', 'spawn': 'from_north', 'sfx': False}
    spawn = {'x': PATH_COLS[0] * TILE + 20, 'y': (HEIGHT - 2) * TILE + 6, 'facing': 'up'}
    assert rows[ALTAR[1]][ALTAR[0]] == DECK and rows[ALTAR[1] + 1][ALTAR[0]] == DECK, '제단은 바닥 위'
    for t in trees:
        assert rows[(t['y'] + 12) // TILE][(t['x'] + 12) // TILE] == '@', f"{t['id']} 밑동은 바닥 밖"
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 12', 'stage': 'ship_sinking_done', 'bgm': BGM, 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'preload': [props[0]['image'], props[1]['image']],
        'spawns': {'from_south': spawn, 'start': dict(spawn)},
        'meta': {
            'connected': True,
            'route': [[PATH_COLS[0], HEIGHT - 2], [PATH_COLS[0], CENTER[1] + 1]],
            'role': '벚꽃 숲 11 위쪽 길 다음(BUILD284): 브금 shop3(BUILD285 사용자 지정), 그리 넓지 않은 나무 바닥, 가운데 잘린 나무 그루터기 제단 위 어둠의 짜장면(보라 오라). 아래 문뿐(다음 없음). 발소리 없음',
            'petals': PETALS,
            'sakura12': {'center': list(CENTER), 'radii': list(RADII), 'altar': list(ALTAR), 'pathCols': list(PATH_COLS), 'aura': dict(AURA)},
        },
        'entities': [*trees, *props, door_south],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'deck', sum(row.count(DECK) for row in map_data['rows']), 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura12_tree')]))


if __name__ == '__main__':
    main()
