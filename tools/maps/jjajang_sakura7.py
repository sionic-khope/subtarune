#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_sakura7.py [--check]
# ──────────────────
"""벚꽃 숲 7(jjajang_sakura7, BUILD278 사용자 브리핑 2026-09-20 네 통 — 원문 design/narrative/cutscenes/jjajang_sakura7.md):
"오른쪽 길로 시작하지만 2초정도 걸으면 세로로 꽤 긴 가로로도 어느정도 되는 맵(약간 뚜울라무대맵마냥)이고 세로 맨 위에 나무로된 무대와 약간 야외 결혼식마냥 적당한 무대 나무 바닥 양옆에는 꽃장식들
 무대의 끝에는 있고, 거기 중상단부터 이제 가순이들이 여러명 배치되어있고 위를 바라보는 느낌이야. 그리고 오른쪽으로 어느정도가면 주인공들이 느김표 하고 카메라가 무대쪽으로 전환되며 가운데에 주인공들 세명이 걸어오는거임."
- 벚꽃 숲 6 오른쪽 끝 문에서 서쪽 가장자리로(20~23행 길) → 오른쪽 10칸(≈2초) → 넓은 벚꽃 들(10~33열 × 2~27행) → 맨 위 가운데 결혼식 나무 무대 소품(assets/props/wedding_stage.png 384×197, 양끝 꽃 기둥, 앞 계단)
  무대 자리(16~29열 × 3~8행)는 막힌 땅('@') — 무대 위 배우는 연출이 exact 로 세운다. 무대 아래 두 줄에 가순이 열넷(가순이 1~6 시트 돌려 씀)이 위를 보고 서 있다.
- 들 오른쪽(34~37열 × 20~23행)은 오른쪽 길 → 동쪽 끝(다음 맵은 아직 없음). 들머리 트리거(18~19열 × 20~23행) → 무대 연출(`jjajang_sakura7_scene`).
- 연출 배우(숨김): 점례(jeomnye, 드레스 입은 가순이 — 무대 뒤에서 걸어 나온다), 가면 최미스(choimis_masked, 무대 오른쪽 어둠 속), 가면 벗은 최미스(choimis, 가면이 벗겨질 때 바꿔 세움), 도미조림(하늘에서 떨어짐),
  디스코드 가면 소품(점례 뒤에 떨어짐), 관객이 던지는 토마토·계란·쓰레기·사과 심 열넷(관객 자리에 숨겨 두고 무대로 날린다).
- 땅은 분홍 꽃잎 땅 ')', 나무는 벚꽃 판(무대 뒤·들 둘레), 꽃잎 초당 18, 브금 sakura(연출에서 어둠·loving_steps), 발소리 없음, 전투 배경 sakura."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_sakura7'
WIDTH: Final = 38
HEIGHT: Final = 30
TILE: Final = 32
GROUND: Final = ')'
ROAD_ROWS: Final = (20, 23)           # 서쪽 길·오른쪽 길 행
ENTRY_COLS: Final = (0, 9)            # 서쪽 가장자리 → 들(10칸 ≈ 2초)
FIELD_COLS: Final = (10, 33)          # 넓은 들
FIELD_ROWS: Final = (2, 27)
EXIT_COLS: Final = (34, WIDTH - 1)    # 오른쪽 길 → 동쪽 끝
STAGE_FILE: Final = 'assets/props/wedding_stage.png'
STAGE_IX: Final = 528                 # 무대 그림 왼쪽 위(px) — 들 가운데(720) 기준 폭 384
STAGE_IY: Final = 96
STAGE_FLOOR: Final = (185, 263)       # 무대 그림 안 판자 윗면 y 범위(px, 맵 좌표) — 배우 발은 이 사이
STAGE_BLOCK_COLS: Final = (16, 29)    # 무대 자리(막힌 땅)
STAGE_BLOCK_ROWS: Final = (3, 8)
SCENE_COLS: Final = (18, 19)          # 들머리 트리거(들 세로 전체 띠 — BUILD280)
SPOT: Final = {'x': 720, 'y': 254, 'rx': 76, 'ry': 42, 'alpha': 0.35}   # 스포트라이트(무대 가운데 앞)
JEOMNYE_START: Final = (708, 172)     # 무대 뒤(판자 뒷선) — 어둠 속에서 걸어 나온다
JEOMNYE_SPOT: Final = (708, 236)      # 무대 가운데 앞(발 252)
CHOIMIS_START: Final = (880, 236)     # 무대 오른쪽 끝(판자 위) 어둠 속
CHOIMIS_SPOT: Final = (764, 236)      # 점례 오른쪽
PARTY_SPOTS: Final = {'player': (708, 424), 'gyeongsub': (668, 428), 'ppaman': (748, 428)}   # 관객 뒤 가운데(카메라 무대 뷰 아래 안)
CROWD_ROWS: Final = (340, 386)        # 관객 두 줄(y)
CROWD_X0: Final = 536
CROWD_GAP: Final = 54
THROW_FILES: Final = ('assets/props/throw_tomato.png', 'assets/props/throw_egg.png', 'assets/props/throw_paper.png', 'assets/props/throw_apple.png')
STAIN_FILES: Final = {'t': 'assets/props/splat_tomato.png', 'e': 'assets/props/splat_egg.png'}   # 토마토·계란 얼룩(BUILD279) — 난동 때 떨어진 자리에 남는다
BURST_SHEETS: Final = ('assets/fx/tomato_burst.png', 'assets/fx/egg_burst.png', 'assets/fx/cannon_smoke.png')   # 과즙 튐·착지 먼지(boom 노드)
SCENE_FLAG: Final = 'sakura7_scene_done'
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


def tree(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = TREES[index % len(TREES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {'type': 'prop', 'id': f'sakura7_tree_{index + 1}', 'image': file,
            'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True}


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    def fill(c0: int, c1: int, r0: int, r1: int, ch: str = GROUND) -> None:
        for row in range(r0, r1 + 1):
            for col in range(c0, c1 + 1):
                rows[row][col] = ch
    fill(ENTRY_COLS[0], ENTRY_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1])            # 서쪽 길
    fill(FIELD_COLS[0], FIELD_COLS[1], FIELD_ROWS[0], FIELD_ROWS[1])          # 들
    fill(EXIT_COLS[0], EXIT_COLS[1], ROAD_ROWS[0], ROAD_ROWS[1])              # 오른쪽 길
    fill(STAGE_BLOCK_COLS[0], STAGE_BLOCK_COLS[1], STAGE_BLOCK_ROWS[0], STAGE_BLOCK_ROWS[1], '@')   # 무대 자리는 못 올라간다(연출은 exact)
    sw, sh = png_size(STAGE_FILE)
    assert (sw, sh) == (384, 197), (sw, sh)
    assert STAGE_IX == 720 - sw // 2 and STAGE_IY + 89 == STAGE_FLOOR[0] and STAGE_IY + 167 == STAGE_FLOOR[1], '무대 그림 자리·판자 윗면 계산(export.py 참고: 판자 윗면 89~167)'
    stage = {'type': 'prop', 'id': 'wedding_stage', 'image': STAGE_FILE, 'x': STAGE_IX, 'y': STAGE_FLOOR[1] - 1, 'w': sw, 'h': 20,
             'ix': STAGE_IX, 'iy': STAGE_IY, 'solid': True, 'sortY': -1}     # sortY -1: 무대 위 배우가 판자 위에 그려진다. 히트박스 = 앞면(계단 포함 폭)
    for name, (x, y) in (('jeomnye', JEOMNYE_SPOT), ('choimis', CHOIMIS_SPOT), ('choimis_start', CHOIMIS_START)):
        assert STAGE_FLOOR[0] <= y + 16 <= STAGE_FLOOR[1] and STAGE_IX + 24 <= x and x + 24 <= STAGE_IX + sw, f'{name} 는 무대 판자 위'
    assert STAGE_FLOOR[0] <= JEOMNYE_START[1] + 16 + 4, '점례 출발은 판자 뒷선'
    assert STAGE_FLOOR[0] <= SPOT['y'] <= STAGE_FLOOR[1] + 8, '스포트라이트는 무대 앞 가운데'
    # 연출 배우(숨김)
    actors = [
        {'type': 'npc', 'id': 'jeomnye', 'sprite': 'jeomnye', 'x': JEOMNYE_START[0], 'y': JEOMNYE_START[1], 'w': 24, 'h': 16, 'solid': True, 'facing': 'down', 'wander': 0, 'hidden': True, 'unless': SCENE_FLAG},
        {'type': 'npc', 'id': 'choimis', 'sprite': 'choimis_masked', 'x': CHOIMIS_START[0], 'y': CHOIMIS_START[1], 'w': 24, 'h': 16, 'solid': True, 'facing': 'left', 'wander': 0, 'hidden': True, 'unless': SCENE_FLAG},
        {'type': 'npc', 'id': 'choimis_bare', 'sprite': 'choimis', 'x': CHOIMIS_SPOT[0], 'y': CHOIMIS_SPOT[1], 'w': 24, 'h': 16, 'solid': True, 'facing': 'up', 'wander': 0, 'hidden': True, 'unless': SCENE_FLAG},
        {'type': 'npc', 'id': 'domijorim', 'sprite': 'domijorim', 'x': CHOIMIS_SPOT[0], 'y': CHOIMIS_SPOT[1], 'w': 24, 'h': 16, 'solid': False, 'facing': 'down', 'wander': 0, 'hidden': True, 'unless': SCENE_FLAG},
        {'type': 'prop', 'id': 'discord_mask', 'image': 'assets/props/discord_mask.png', 'x': JEOMNYE_SPOT[0], 'y': JEOMNYE_SPOT[1] - 40, 'w': 0, 'h': 0,
         'ix': JEOMNYE_SPOT[0] - 11, 'iy': JEOMNYE_SPOT[1] - 80, 'solid': False, 'hidden': True, 'unless': SCENE_FLAG},
    ]
    # 관객 가순이 열넷(두 줄, 위를 본다) + 각자 발밑에 숨긴 던질 것
    crowd, throws = [], []
    for i in range(14):
        row, col = divmod(i, 7)
        x = CROWD_X0 + col * CROWD_GAP + ((i * 37) % 13 - 6)
        y = CROWD_ROWS[row] + ((i * 29) % 9 - 4)
        crowd.append({'type': 'npc', 'id': f'crowd_{i + 1}', 'sprite': f'gasuni{i % 6 + 1}', 'x': x, 'y': y, 'w': 24, 'h': 16, 'solid': True, 'facing': 'up', 'wander': 0})
        tw, th = png_size(THROW_FILES[i % 4])
        throws.append({'type': 'prop', 'id': f'throw_{i + 1}', 'image': THROW_FILES[i % 4], 'x': x + 12 - tw // 2, 'y': y + 8 - th // 2, 'w': tw, 'h': th,
                       'ix': x + 12 - tw // 2, 'iy': y + 8 - th // 2, 'solid': False, 'hidden': True})
    stains = []
    for kind, file in STAIN_FILES.items():
        sw_, sh_ = png_size(file)
        for i in range(4):
            stains.append({'type': 'prop', 'id': f'stain_{kind}{i + 1}', 'image': file, 'x': 0, 'y': 0, 'w': sw_, 'h': sh_, 'ix': 0, 'iy': 0, 'solid': False, 'hidden': True})   # 연출이 떨어진 자리로 옮겨 보이게 한다
    for c in crowd:
        assert rows[(c['y'] + 8) // TILE][(c['x'] + 12) // TILE] == GROUND and c['y'] + 16 > STAGE_FLOOR[1] + 40, f"{c['id']} 는 무대 아래 들 위"
        assert c['y'] + 16 < PARTY_SPOTS['player'][1], f"{c['id']} 는 일행 자리보다 위"
    for name, (x, y) in PARTY_SPOTS.items():
        assert rows[(y + 8) // TILE][(x + 12) // TILE] == GROUND, f'{name} 자리는 들 위'
    # 나무: 무대 양옆 뒤·들 둘레·길 위아래
    cells: list[tuple[int, int]] = []
    for col in range(FIELD_COLS[0] + 1, FIELD_COLS[1], 3):                    # 들 위쪽(무대 폭 밖)·아래쪽
        offset = (col // 3) % 2
        if col < STAGE_BLOCK_COLS[0] - 1 or col > STAGE_BLOCK_COLS[1] + 1:
            cells.append((col, 5 + offset))
        cells.append((col, HEIGHT - 2 + (offset if HEIGHT - 2 + offset < HEIGHT else 0)))
    for row in range(FIELD_ROWS[0] + 2, FIELD_ROWS[1], 3):                    # 들 왼쪽·오른쪽 가장자리(길 행은 비운다)
        offset = (row // 3) % 2
        for col in (FIELD_COLS[0] - 1 - offset, FIELD_COLS[1] + 1 + offset):
            if not (ROAD_ROWS[0] - 1 <= row <= ROAD_ROWS[1] + 1):
                cells.append((col, row))
    for col in range(1, ENTRY_COLS[1], 3):                                    # 서쪽 길 위아래
        offset = (col // 3) % 2
        cells += [(col, ROAD_ROWS[0] - 3 + offset), (col, ROAD_ROWS[1] + 3 - offset)]
    for col in range(EXIT_COLS[0], WIDTH - 1, 3):                             # 오른쪽 길 위아래
        offset = (col // 3) % 2
        cells += [(col, ROAD_ROWS[0] - 3 + offset), (col, ROAD_ROWS[1] + 3 - offset)]
    for col in range(2, WIDTH - 1, 5):                                        # 위 숲(무대 뒤 폭 밖)·아래 숲
        if col < STAGE_BLOCK_COLS[0] - 2 or col > STAGE_BLOCK_COLS[1] + 2:
            cells.append((col, 5 + (col // 5) % 2))
    seen: set[tuple[int, int]] = set(); trees = []
    for col, row in cells:
        if (col, row) in seen or not (0 <= col < WIDTH and 0 <= row < HEIGHT) or rows[row][col] != '@':
            continue
        t = tree(len(trees), col, row)
        if t:
            seen.add((col, row)); trees.append(t)
    # 들머리 트리거는 들 세로 전체(2~27행)를 막는 띠 — 대각선으로 위로 올라가 길 행을 안 밟아도 걸린다(사용자 2026-09-21 “대각선 위로 올라가버리면 이벤트 발생이 안 되는 문제, 영역을 더”)
    scene = {'type': 'trigger', 'id': 'sakura7_scene_trigger', 'x': SCENE_COLS[0] * TILE, 'y': FIELD_ROWS[0] * TILE, 'w': (SCENE_COLS[1] - SCENE_COLS[0] + 1) * TILE, 'h': (FIELD_ROWS[1] - FIELD_ROWS[0] + 1) * TILE,
             'once': True, 'flag': 'sakura7_scene_started', 'unless': SCENE_FLAG, 'script': 'jjajang_sakura7_scene'}
    door_west = {'type': 'door', 'id': 'sakura7_west_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': (ROAD_ROWS[1] - ROAD_ROWS[0] + 1) * TILE, 'to': 'jjajang_sakura6', 'spawn': 'from_east', 'sfx': False}
    road_y = (ROAD_ROWS[0] + 1) * TILE + 6
    return {
        'id': MAP_ID, 'name': '벚꽃 숲 7', 'stage': 'ship_sinking_done', 'bgm': 'sakura', 'dim': 0, 'battleBg': 'sakura',
        'rows': [''.join(row) for row in rows],
        'preload': [STAGE_FILE, 'assets/props/discord_mask.png', *THROW_FILES, *STAIN_FILES.values(), *BURST_SHEETS],
        'spawns': {
            'from_west': {'x': TILE + 4, 'y': road_y, 'facing': 'right'},
            'start': {'x': TILE + 4, 'y': road_y, 'facing': 'right'},
            'field': {'x': (FIELD_COLS[0] + 1) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'before_scene': {'x': (SCENE_COLS[0] - 3) * TILE + 4, 'y': road_y, 'facing': 'right'},
            'after': {'x': PARTY_SPOTS['player'][0] - 12, 'y': PARTY_SPOTS['player'][1], 'facing': 'up'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0] + 1], [SCENE_COLS[0] - 2, ROAD_ROWS[0] + 1]],
            'role': '벚꽃 숲 6 오른쪽 끝 문 다음(BUILD278): 오른쪽으로 2초 → 넓은 들 → 맨 위 결혼식 나무 무대 + 관객 가순이들. 들머리 트리거 → 그 남자와 그 여자의 무대 연출 → 오른쪽 길(다음 맵 없음). 브금 sakura, 발소리 없음',
            'petals': PETALS,
            'sakura7': {'roadRows': list(ROAD_ROWS), 'entryCols': list(ENTRY_COLS), 'fieldCols': list(FIELD_COLS), 'fieldRows': list(FIELD_ROWS), 'exitCols': list(EXIT_COLS), 'sceneCols': list(SCENE_COLS),
                        'stage': [STAGE_IX, STAGE_IY, sw, sh], 'stageFloor': list(STAGE_FLOOR), 'spot': SPOT, 'jeomnyeStart': list(JEOMNYE_START), 'jeomnyeSpot': list(JEOMNYE_SPOT),
                        'choimisStart': list(CHOIMIS_START), 'choimisSpot': list(CHOIMIS_SPOT), 'partySpots': {k: list(v) for k, v in PARTY_SPOTS.items()},
                        'crowd': [[c['x'], c['y']] for c in crowd], 'roadY': road_y},
        },
        'entities': [*trees, stage, *actors, *crowd, *stains, *throws, scene, door_west],
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'trees', len([e for e in map_data['entities'] if e['id'].startswith('sakura7_tree')]), 'crowd', len(map_data['meta']['sakura7']['crowd']))


if __name__ == '__main__':
    main()
