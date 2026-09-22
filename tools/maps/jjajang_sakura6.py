#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura6.py [--check]
# ──────────────────
"""벚꽃 숲 6(jjajang_sakura6, BUILD277 사용자 브리핑 2026-09-20 — 원문 design/narrative/cutscenes/jjajang_sakura6.md):
"그냥 벚꽃길 오른쪽에 있다가 쭉가는 그땟목맵 5초정도 넣고 바로 오른쪽가는맵" / "땟목내리고 오른쪽가면 광장처럼 살짝 동그란 부분있는데 거기서카메라 오른쪽 이동하면서 연출시작"
- 벚꽃 숲 5 오른쪽 끝 문에서 서쪽 가장자리로 들어와(10~13행 길) 오른쪽으로 → 물가(9열) → 파란 물길 '['(10~37열 × 9~14행, 막힘) 위 뗏목(raft.png, 171px/s, 벚꽃 숲 3 과 같은 뗏목·걸어 올라타기·동료 헤엄)
  으로 오른쪽으로 곧장 28칸(≈ 4.9초) → 뭍(38열~) → 살짝 동그란 광장(타원 13×9칸, 중심 56열·12행) → 오른쪽 길 → 동쪽 끝 문(벚꽃 숲 7, BUILD278).
- 광장 들머리(46~47열) 트리거 → 최미스 고백 연습 연출(`jjajang_sakura6_scene`): 카메라가 광장 가운데로 천천히, 가면 쓴 최미스가 가운데 옆 꽃 무더기(sakura_flowers 1~4) 사이를 따며 움직인 뒤 가운데로.
  최미스는 연출이 끝나면 오른쪽으로 떠난다(맵 NPC unless sakura6_scene_done). 꽃 무더기는 소품(색키·축소한 gpt-image, assets/source/sakura6-v1).
- 땅은 분홍 꽃잎 땅 ')', 나무는 벚꽃 판, 꽃잎 초당 18, 브금 sakura(연출에서 loving_steps 로 바뀌었다가 끝나면 다시), 발소리 없음, 전투 배경 sakura."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura6'
WIDTH: Final = 70
HEIGHT: Final = 24
TILE: Final = 32
GROUND: Final = ')'
WATER: Final = '['
ROAD_ROWS: Final = (10, 13)           # 길 행(가로 한 줄)
CHANNEL_ROWS: Final = (9, 14)         # 파란 물길 행(길보다 위아래 한 줄씩 넓다 — 헤엄치는 동료 자리)
SHORE_COL: Final = 9                  # 물가(서쪽 길 끝 열)
CHANNEL_COLS: Final = (10, 37)        # 물길 28칸 ≈ 4.9초
LANDING_COL: Final = 38               # 뭍 첫 열(뭍 길은 동쪽 끝까지)
PLAZA: Final = (56.0, 12.0, 6.5, 4.5)   # 살짝 동그란 광장(타원 중심 col,row · 반지름 col,row) — 중심 = 연출 카메라 가운데(px 1792, 384)
SCENE_COLS: Final = (46, 47)          # 광장 들머리 트리거(뭍 길, 광장 왼쪽 가장자리 두 칸 앞)
RAFT_SPEED: Final = 171
RAFT_SIZE: Final = (56, 40)           # assets/props/raft.png
FLOWERS: Final = (                    # (소품 파일, 히트박스 x, y — 광장 중심 px 기준 차이) 가운데 옆 오른쪽 셋·왼쪽 하나
    ('assets/props/sakura_flowers_1.png', 64, -72),
    ('assets/props/sakura_flowers_2.png', 120, -16),
    ('assets/props/sakura_flowers_3.png', 72, 48),
    ('assets/props/sakura_flowers_4.png', -108, 24),
)
CHOIMIS_START: Final = (28, -72)      # 최미스 첫 자리(광장 중심 기준) — 꽃 1 왼쪽에서 오른쪽을 보고 꽃을 따는 중
SCENE_FLAG: Final = 'sakura6_scene_done'
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


def in_plaza(col: float, row: float) -> bool:
    cx, cy, rx, ry = PLAZA
    return ((col + 0.5 - cx) / rx) ** 2 + ((row + 0.5 - cy) / ry) ** 2 <= 1.0


def tree(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {'type': 'prop', 'id': f'sakura6_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int, ch: str = GROUND) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = ch
    fill(0, SHORE_COL, ROAD_ROWS[0], ROAD_ROWS[1])                                   # 서쪽 가장자리 → 물가
    fill(CHANNEL_COLS[0], CHANNEL_COLS[1], CHANNEL_ROWS[0], CHANNEL_ROWS[1], WATER)   # 파란 물길
    fill(LANDING_COL, WIDTH - 1, ROAD_ROWS[0], ROAD_ROWS[1])                          # 뭍 → 동쪽 끝
    for row in range(HEIGHT):
        for col in range(LANDING_COL, WIDTH):
            if in_plaza(col, row):
                rows[row][col] = GROUND                                               # 살짝 동그란 광장
    cx_px, cy_px = int(PLAZA[0] * TILE), int(PLAZA[1] * TILE)
    # 뗏목: 물가 바로 오른쪽 물 위 → 오른쪽 곧장, 뭍 첫 열에 4px 걸쳐 멈춘다(뭍에서 왼쪽을 보고 C 로 되돌아갈 수 있다 — 벚꽃 숲 3 과 같은 규칙)
    raft_x, raft_y = CHANNEL_COLS[0] * TILE + 4, (ROAD_ROWS[0] + 1) * TILE - 4
    end_x = LANDING_COL * TILE - RAFT_SIZE[0] + 4
    raft = {'type': 'raft', 'id': 'sakura6_raft', 'image': 'assets/props/raft.png', 'x': raft_x, 'y': raft_y,
            'route': [[end_x, raft_y]], 'speed': RAFT_SPEED, 'walkOn': True, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below'}
    ride_px = end_x - raft_x
    assert 4.5 <= ride_px / RAFT_SPEED <= 5.5, f'뗏목 5초쯤: {ride_px / RAFT_SPEED:.1f}초'
    assert rows[(raft_y + 20) // TILE][(raft_x + 28) // TILE] == WATER and rows[(raft_y + 20) // TILE][(end_x + 20) // TILE] == WATER, '뗏목 경로는 물 위'
    assert rows[ROAD_ROWS[1]][LANDING_COL] == GROUND and rows[ROAD_ROWS[0]][SHORE_COL] == GROUND, '양쪽 물가는 뭍'
    # 꽃 무더기 소품(히트박스 24×8 = 그림 아랫부분, 그림은 히트박스 위로)
    flowers = []
    for i, (file, dx, dy) in enumerate(FLOWERS):
        w, h = png_size(file); x, y = cx_px + dx, cy_px + dy
        assert in_plaza(x // TILE, y // TILE) and in_plaza((x + 23) // TILE, (y + 7) // TILE), f'꽃 {i + 1} 은 광장 안'
        flowers.append({'type': 'prop', 'id': f'sakura6_flowers_{i + 1}', 'image': file, 'x': x, 'y': y, 'w': 24, 'h': 8,
                        'ix': x + 12 - w // 2, 'iy': y + 8 - h, 'solid': True})
    choimis_x, choimis_y = cx_px + CHOIMIS_START[0], cy_px + CHOIMIS_START[1]
    assert in_plaza(choimis_x // TILE, choimis_y // TILE) and in_plaza((choimis_x + 23) // TILE, (choimis_y + 15) // TILE), '최미스는 광장 안'
    for f in flowers:
        assert not (choimis_x < f['x'] + 24 and choimis_x + 24 > f['x'] and choimis_y < f['y'] + 8 and choimis_y + 16 > f['y']), '최미스 첫 자리가 꽃과 겹친다'
    choimis = {'type': 'npc', 'id': 'choimis', 'sprite': 'choimis_masked', 'x': choimis_x, 'y': choimis_y, 'w': 24, 'h': 16, 'solid': True,
               'facing': 'right', 'wander': 0, 'unless': SCENE_FLAG}                     # 연출 뒤 오른쪽으로 떠난다 — 다시 들어와도 없다
    # 나무: 길·물길·광장 둘레 + 위아래 빈 숲
    cells: list[tuple[int, int]] = []
    for col in range(1, SHORE_COL + 1, 3):                                   # 서쪽 길 위아래
        offset = (col // 3) % 2
        cells += [(col, ROAD_ROWS[0] - 3 + offset), (col, ROAD_ROWS[1] + 3 - offset)]
    for col in range(CHANNEL_COLS[0], CHANNEL_COLS[1] + 1, 3):               # 물길 위아래 둑
        offset = (col // 3) % 2
        cells += [(col, CHANNEL_ROWS[0] - 3 + offset), (col + 1, CHANNEL_ROWS[1] + 3 - offset)]
    plaza_bottom = int(PLAZA[1] + PLAZA[3])                                    # 광장 아랫줄(16행)
    for col in range(LANDING_COL, WIDTH - 1, 3):                              # 뭍 길·광장·오른쪽 길 위아래(광장 둘레는 타원 밖으로 밀어낸다)
        offset = (col // 3) % 2
        for row in (ROAD_ROWS[0] - 3 + offset, ROAD_ROWS[1] + 3 - offset):
            r = row
            while in_plaza(col, r) or in_plaza(col, r + (1 if r > PLAZA[1] else -1)):
                r += 1 if r > PLAZA[1] else -1
            if r > PLAZA[1] and abs(col + 0.5 - PLAZA[0]) <= PLAZA[2] + 1:
                r = max(r, plaza_bottom + 3 + (1 - offset))                   # 광장 아래 둘레: 수관(≈157px ≈ 5칸)이 광장 아래쪽·꽃 3·최미스를 덮지 않게 아랫줄 +3~4칸(수관이 가장자리만 살짝 덮는다)
            cells.append((col, r))
    for col in range(2, WIDTH - 1, 5):                                        # 위아래 빈 숲
        cells += [(col, 5 + (col // 5) % 2), (col + 2, 19 + (col // 5) % 3)]
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or not (0 <= col < WIDTH and 0 <= row < HEIGHT) or rows[row][col] != '@':
            continue
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    scene = {'type': 'trigger', 'id': 'sakura6_scene_trigger', 'x': SCENE_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': (SCENE_COLS[1] - SCENE_COLS[0] + 1) * TILE, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE,
             'once': True, 'flag': 'sakura6_scene_started', 'unless': SCENE_FLAG, 'script': 'jjajang_sakura6_scene'}
    door_east = {'type': 'door', 'id': 'sakura6_east_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE, 'to': 'jjajang_sakura7', 'spawn': 'from_west', 'sfx': False}   # BUILD278: 오른쪽 끝 → 벚꽃 숲 7(무대)
    door_west = {'type': 'door', 'id': 'sakura6_west_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE, 'to': 'jjajang_sakura5', 'spawn': 'from_east', 'sfx': False}
    road_y = (ROAD_ROWS[0] + 1) * TILE + 6
    east_col = int(PLAZA[0] + PLAZA[2]) + 2
    chase_anchors = [
        {'type': 'prop', 'id': name, 'image': TREES[0][0], 'x': x, 'y': 334,
         'w': 24, 'h': 16, 'solid': False, 'hidden': True}
        for name, x in (('chase_start', 2180), ('chase_end', 1252))
    ]
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 6', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'chase': {'x': 2180, 'y': 334, 'facing': 'left'},
            'from_west': {'x': TILE + 4, 'y': road_y, 'facing': 'right'},
            'start': {'x': TILE + 4, 'y': road_y, 'facing': 'right'},
            'dock': {'x': (SHORE_COL - 1) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'landing': {'x': (LANDING_COL + 1) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'plaza': {'x': (SCENE_COLS[0] - 2) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'east': {'x': east_col * TILE + 4, 'y': road_y, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE + 4, 'y': road_y, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0] + 1], [SHORE_COL - 1, ROAD_ROWS[0] + 1]],
            'role': '벚꽃 숲 5 오른쪽 끝 문 다음(BUILD277): 오른쪽으로 → 물가 → 뗏목으로 오른쪽 5초 → 뭍 → 살짝 동그란 광장(최미스 고백 연습 연출, 가운데 옆 꽃 무더기) → 오른쪽 길 → 동쪽 끝 문(벚꽃 숲 7, BUILD278). 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'sakura6': {'roadRows': list(ROAD_ROWS), 'shoreCol': SHORE_COL, 'channel': [list(CHANNEL_COLS), list(CHANNEL_ROWS)], 'landingCol': LANDING_COL,
                        'plaza': list(PLAZA), 'center': [cx_px, cy_px], 'sceneCols': list(SCENE_COLS), 'rideSeconds': round(ride_px / RAFT_SPEED, 2),
                        'roadY': road_y, 'choimis': [choimis_x, choimis_y], 'flowers': [[f['x'], f['y']] for f in flowers]},
        },
        'entities': [*trees, raft, *flowers, choimis, *chase_anchors, scene, door_west, door_east],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura6_tree')]), 'ride', map_data['meta']['sakura6']['rideSeconds'])


if __name__ == '__main__':
    main()
