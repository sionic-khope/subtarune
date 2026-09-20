#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura5.py [--check]
# ──────────────────
"""벚꽃 숲 5(jjajang_sakura5, BUILD271 사용자 브리핑 2026-09-20 — 원문 design/narrative/cutscenes/jjajang_sakura5.md):
"그다음맵은 아래로 살짝 갔다가 오른쪽길에 3초걷다가 나무다리 3초정도 걷고 오른쪽길도 있는데 윗길도 있음 위에는 뭔가 동그랗게 펼쳐져있고
 맵이 그 갈라지는 사이공간오면 연출시작"
- 벚꽃 숲 4 아랫줄 문에서 들어와(왼쪽 위 길, 되돌아가는 문은 윗줄 끝 — 도착 자리는 길 중간 15행이라 아래로 살짝 7칸 ≈ 1초만 걷는다) → 오른쪽으로 21칸(달리기 ≈ 3초) → 파란 물 위 나무다리 20칸(≈ 3초)
  → 갈림목(연출 트리거): 오른쪽 길(동쪽 끝 문 → 벚꽃 숲 6, BUILD277)과 윗길 → 위에 동그란 공터(타원 23×19칸)·한가운데 거대한 벚꽃 나무(768×762, 위쪽은 맵 밖 — 카메라에 맨 위가 안 보인다).
- 공터의 가순이 4·5·6·도현·도미조림은 나무 밑동 오른쪽 땅(밑동 36px 위, 뿌리 앞)에 서 있는 NPC — 사용자 정정 “가순이들이나 캐릭터들 전부 다 벚꽃나무 아래 땅에 있어야지”. 일행은 윗길 연출에서 밑동 왼쪽에 선다. 공터에 들어가기 전 오른쪽 길로 가면 억빠맨이 막는다.
- 윗길로 좀 올라가면(공터 밑 두 줄 트리거) 두 번째 연출(브금 telling·도미조림 느낌표·짜장면 얘기 → 전투 → 승리 뒤 연출: 가순이 셋이 아래로 걸어 내려가 사라진다, unless sakura5_girls_left; 눕힌 도현·도미조림은 unless sakura5_clearing_scene_done — 다시 들어오면 없다) — 같은 트리거가 공터 방문 플래그도 세운다.
- 땅은 분홍 꽃잎 땅 ')', 나무다리 ']', 물 '[', 꽃잎 초당 18, 브금 sakura(연출에서 끔), 발소리 없음, 전투 배경 sakura."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura5'
WIDTH: Final = 68
HEIGHT: Final = 40
TILE: Final = 32
GROUND: Final = ')'
DECK: Final = ']'
WATER: Final = '['
ENTRY_COLS: Final = (4, 7)            # 왼쪽 위 길(윗줄 문에서 아래로)
SPAWN_ROW: Final = 15                 # 도착 자리(문은 윗줄 0행 — “포탈을 끝으로” 규칙, 도착은 길 중간이라 아래로 살짝만)
ROAD_ROWS: Final = (22, 25)           # 오른쪽 길
RIGHT_COLS: Final = (4, 24)           # 아래로 살짝 뒤 오른쪽으로 21칸(≈ 3초)
BRIDGE_COLS: Final = (25, 44)         # 나무다리 20칸(≈ 3초)
WATER_ROWS: Final = (16, 34)          # 다리 위아래로 화면 끝까지 물
JUNCTION_COLS: Final = (45, 56)       # 갈라지는 사이공간
SCENE_COLS: Final = (49, 52)          # 연출 트리거: 다리 건너 갈림목 사이공간(윗길 바로 아래 왼쪽) — 사용자 “연출 발생 지점 좀 더 오른쪽”(다리 끝 45~48 → 49~52)
UP_COLS: Final = (52, 55)             # 윗길
BLOCK_COLS: Final = (57, 58)          # 오른쪽 길 막기(공터 다녀오기 전)
EAST_COLS: Final = (57, WIDTH - 1)    # 오른쪽 길 → 동쪽 끝 문(벚꽃 숲 6, BUILD277)
CLEARING: Final = (54, 10, 11.5, 9.5)   # 동그란 공터: 중심(열, 행)·가로 반지름·세로 반지름(칸)
TREE_FILE: Final = 'assets/props/sakura_giant_tree.png'
TREE_BASE_ROW: Final = 10             # 거대 나무 밑동 행(공터 가운데). 그림 위쪽(-412px)은 맵 밖 — 카메라가 0행에 있어도 맨 위는 안 보인다
TREE_TRUNK_W: Final = 128             # 밑동 히트박스 폭(그림 실측 127)
ACTOR_FEET_Y: Final = 314             # 배우 발 위치(px) = 밑동(350) 36px 위, 뿌리 앞 땅. 카메라 y 124 에서 발이 190(대화창 230 위)
PARTY_FEET_Y: Final = 320             # 윗길 연출에서 일행이 서는 발 위치(밑동 왼쪽)
PARTY_X: Final = 1640                 # 주인공 x(경섭 -40, 억빠맨 +40)
ACTORS: Final = (                     # (id, 스프라이트, 중심에서의 x 차이, y 차이, 보는 쪽) — 밑동 오른쪽에 가순이 셋 → 도현 → 도미조림
    ('gasuni4', 'gasuni4', 50, -4, 'right'),
    ('gasuni5', 'gasuni5', 94, 4, 'right'),
    ('gasuni6', 'gasuni6', 138, -4, 'right'),
    ('dohyun', 'dohyun', 200, 0, 'left'),
    ('domijorim', 'domijorim', 250, 0, 'left'),
)
SCENE_FLAG: Final = 'sakura5_scene_done'
GIRLS_LEFT_FLAG: Final = 'sakura5_girls_left'     # 승리 뒤 가순이 셋이 떠났다(윗길 연출 스크립트가 세운다)
CLEARING_SCENE_FLAG: Final = 'sakura5_clearing_scene_done'   # 윗길 연출 전부 끝(전투·승리 뒤 대사까지) — 눕힌 도현·도미조림은 다시 들어오면 없다(BUILD276, 사용자 “맵 재입장시 없애”)
CLEARING_FLAG: Final = 'sakura5_clearing_visited'
TREES: Final = (
    ('assets/props/jjajang_sakura_1.png', 141, 157, 100),
    ('assets/props/jjajang_sakura_2.png', 135, 159, 30),
    ('assets/props/jjajang_sakura_3.png', 108, 167, 60),
    ('assets/props/jjajang_sakura_4.png', 167, 146, 58),
)
PETALS: Final = {'rate': 18, 'burst': 0, 'burstRate': 18, 'burstSeconds': 0, 'after': 18}


def png_size(path: str) -> tuple[int, int]:
    data = Path(path).read_bytes()
    return struct.unpack('>II', data[16:24])


def in_clearing(col: int, row: int) -> bool:
    cx, cy, rx, ry = CLEARING
    return ((col - cx) / rx) ** 2 + ((row - cy) / ry) ** 2 <= 1.0


def tree(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {'type': 'prop', 'id': f'sakura5_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int, ch: str) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = ch
    fill(ENTRY_COLS[0], ENTRY_COLS[1], 0, ROAD_ROWS[1], GROUND)                      # 윗줄 문에서 아래로(도착은 15행)
    fill(RIGHT_COLS[0], RIGHT_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1], GROUND)           # 오른쪽 길
    fill(BRIDGE_COLS[0], BRIDGE_COLS[1], WATER_ROWS[0], WATER_ROWS[1], WATER)        # 파란 물
    fill(BRIDGE_COLS[0], BRIDGE_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1], DECK)           # 나무다리
    fill(JUNCTION_COLS[0], JUNCTION_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1], GROUND)     # 갈림목
    fill(EAST_COLS[0], EAST_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1], GROUND)             # 오른쪽 길
    for row in range(HEIGHT):                                                        # 동그란 공터
        for col in range(WIDTH):
            if in_clearing(col, row):
                rows[row][col] = GROUND
    clearing_bottom = max(r for r in range(HEIGHT) if in_clearing(CLEARING[0], r))
    fill(UP_COLS[0], UP_COLS[1], clearing_bottom, ROAD_ROWS[0], GROUND)             # 윗길(공터 밑에서 갈림목까지)
    assert all(rows[r][c] != WATER for r in range(WATER_ROWS[0], WATER_ROWS[1] + 1) for c in range(BRIDGE_COLS[0], BRIDGE_COLS[1] + 1) if in_clearing(c, r)), '공터와 물이 겹친다'
    assert rows[0][CLEARING[0]] == '@' and in_clearing(CLEARING[0], 1), '공터 위쪽은 한 줄 숲을 남긴다'
    cells: list[tuple[int, int]] = []
    for row in range(1, HEIGHT - 1, 3):                                   # 길·물·공터 바깥에 어긋난 격자로 나무
        offset = (row // 3) % 2
        for col in range(1 + offset, WIDTH - 1, 5):
            cells.append((col, row))
    tw, th = png_size(TREE_FILE)
    center_x = CLEARING[0] * TILE + 16
    base_y = TREE_BASE_ROW * TILE + 30
    canopy = (center_x - tw // 2, base_y - th, center_x + tw // 2, base_y)   # 거대 나무 그림 사각형(위쪽은 맵 밖)
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or rows[row][col] != '@':
            continue
        if canopy[0] <= col * TILE + 16 <= canopy[2] and row * TILE + 30 <= canopy[3]:
            continue                                                          # 거대 나무 그림 아래엔 작은 나무를 심지 않는다(수관이 덮는다)
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    giant = {'type': 'prop', 'id': 'sakura5_giant_tree', 'image': TREE_FILE, 'x': center_x - TREE_TRUNK_W // 2, 'y': base_y - 12, 'w': TREE_TRUNK_W, 'h': 12,
             'ix': center_x - tw // 2, 'iy': base_y - th, 'solid': True, 'sortY': -1}   # sortY -1: 밑동 앞에 선 배우들이 나무 위에 그려진다. iy 는 음수(수관이 맵 위로 나간다)
    assert giant['iy'] < 0 and center_x - tw // 2 >= 0 and center_x + tw // 2 <= WIDTH * TILE, '거대 나무: 위는 맵 밖, 좌우는 맵 안'
    actors = []
    for aid, sprite, dx, dy, facing in ACTORS:
        x, y = center_x + dx - 12, ACTOR_FEET_Y + dy - 16
        assert in_clearing(x // TILE, y // TILE) and in_clearing((x + 23) // TILE, (y + 15) // TILE), f'{aid} 는 공터 안'
        assert y + 16 <= base_y - 12 or x >= giant['x'] + giant['w'] or x + 24 <= giant['x'], f'{aid} 가 밑동과 겹친다'
        actor = {'type': 'npc', 'id': aid, 'sprite': sprite, 'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': True, 'facing': facing, 'wander': 0}
        if aid.startswith('gasuni'):
            actor['unless'] = GIRLS_LEFT_FLAG                                    # 승리 뒤 연출에서 셋이 아래로 걸어 내려가 사라진다(BUILD274) — 다시 들어와도 없다
        else:
            actor['unless'] = CLEARING_SCENE_FLAG                                # 승리 뒤 눕힌 둘은 연출이 끝난 채 맵을 다시 들어오면 없다(BUILD276) — 연출 중엔 그대로 누워 있다
        actors.append(actor)
    for px in (PARTY_X - 40, PARTY_X, PARTY_X + 40):
        assert in_clearing((px - 12) // TILE, PARTY_FEET_Y // TILE) and PARTY_FEET_Y <= giant['y'], '일행 자리는 공터 안·밑동 히트박스 위쪽'
    scene = {'type': 'trigger', 'id': 'sakura5_scene_trigger', 'x': SCENE_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': (SCENE_COLS[1] - SCENE_COLS[0] + 1) * TILE, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE,
             'once': True, 'flag': 'sakura5_scene_started', 'unless': SCENE_FLAG, 'script': 'jjajang_sakura5_scene'}
    visited = {'type': 'trigger', 'id': 'sakura5_clearing_trigger', 'x': UP_COLS[0] * TILE, 'y': clearing_bottom * TILE, 'w': (UP_COLS[1] - UP_COLS[0] + 1) * TILE, 'h': 2 * TILE,
               'once': True, 'flag': CLEARING_FLAG, 'script': 'jjajang_sakura5_clearing'}
    block = {'type': 'trigger', 'id': 'sakura5_block_trigger', 'x': BLOCK_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': (BLOCK_COLS[1] - BLOCK_COLS[0] + 1) * TILE, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE,
             'unless': CLEARING_FLAG, 'script': 'jjajang_sakura5_no_right'}
    door_east = {'type': 'door', 'id': 'sakura5_east_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE, 'to': 'jjajang_sakura6', 'spawn': 'from_west', 'sfx': False}   # BUILD277: 오른쪽 끝 → 벚꽃 숲 6(뗏목 5초)
    door_north = {'type': 'door', 'id': 'sakura5_north_door', 'x': ENTRY_COLS[0] * TILE, 'y': 0, 'w': (ENTRY_COLS[1] - ENTRY_COLS[0] + 1) * TILE, 'h': 10, 'to': 'jjajang_sakura4', 'spawn': 'south_end', 'sfx': False}
    mid_x = (ENTRY_COLS[0] + ENTRY_COLS[1] + 1) * TILE // 2 - 12
    road_y = (ROAD_ROWS[0] + 1) * TILE + 8
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 5', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'preload': [TREE_FILE],
        'spawns': {
            'from_north': {'x': mid_x, 'y': SPAWN_ROW * TILE + 16, 'facing': 'down'},
            'start': {'x': mid_x, 'y': SPAWN_ROW * TILE + 16, 'facing': 'down'},
            'bridge_end': {'x': (BRIDGE_COLS[1] - 1) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'fork': {'x': (UP_COLS[0] + 1) * TILE + 4, 'y': road_y, 'facing': 'up'},
            'clearing': {'x': PARTY_X - 12, 'y': PARTY_FEET_Y - 16, 'facing': 'right'},
            'east': {'x': (BLOCK_COLS[1] + 2) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE + 4, 'y': road_y, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[ENTRY_COLS[0] + 1, 1], [ENTRY_COLS[0] + 1, ROAD_ROWS[0] + 1], [UP_COLS[0] + 1, ROAD_ROWS[0] + 1], [UP_COLS[0] + 1, TREE_BASE_ROW + 2], [UP_COLS[0] + 1, ROAD_ROWS[0] + 1], [WIDTH - 2, ROAD_ROWS[0] + 1]],
            'role': '벚꽃 숲 4 아랫줄 문 다음(BUILD271): 아래로 살짝 → 오른쪽 3초 → 나무다리 3초 → 갈림목(연출: 브금 끄고 카메라 위 공터 — 도미조림·가순이 4·5·6·도현). 윗길 = 거대 벚꽃 나무 공터, 오른쪽 길 → 동쪽 끝 문(벚꽃 숲 6, BUILD277; 공터 전엔 억빠맨이 막는다). 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'sakura5': {'entryCols': list(ENTRY_COLS), 'spawnRow': SPAWN_ROW, 'roadRows': list(ROAD_ROWS), 'rightCols': list(RIGHT_COLS), 'bridgeCols': list(BRIDGE_COLS), 'waterRows': list(WATER_ROWS),
                        'sceneCols': list(SCENE_COLS), 'upCols': list(UP_COLS), 'blockCols': list(BLOCK_COLS), 'eastCols': list(EAST_COLS), 'clearing': list(CLEARING), 'clearingBottom': clearing_bottom,
                        'treeBaseRow': TREE_BASE_ROW, 'treeBaseY': base_y, 'treeTop': giant['iy'], 'actorFeetY': ACTOR_FEET_Y, 'partyFeetY': PARTY_FEET_Y, 'partyX': PARTY_X,
                        'girlsFocus': [center_x + 94, ACTOR_FEET_Y - 18]},
        },
        'entities': [*trees, giant, *actors, scene, visited, block, door_north, door_east],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura5_tree')]), 'clearing bottom', map_data['meta']['sakura5']['clearingBottom'])


if __name__ == '__main__':
    main()
