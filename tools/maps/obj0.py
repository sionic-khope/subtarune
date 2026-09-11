# -*- coding: utf-8 -*-
"""옵젝영역0 (사용자 브리핑 2026-09-11): 청록숲9 사원 문을 지나면 나오는 새 지역. 일직선 길 하나 — 바닥은 얕은 물(밟으면 에코 물 발소리 + 물결 고리, tiles.js step),
  주변은 더 울창한 초록숲(보라 나무를 넷에 하나꼴로 섞음), 배경 backdrop obj_forest(초록 덤불 + 보라 먼 층), 브금은 허공처럼 '휘잉' 바람(wind). 몹 없음. 이벤트: 마나샘(회복 쉼터, 30열 위쪽 — 억빠맨이 발밑 물을 먼저 마시는 개그).
  obj1 은 자리표시(16×12, 왼쪽 문만). 타일·소품: tools/art/obj_set.py.
실행: /usr/bin/python3 tools/maps/obj0.py  (--check)
"""
import io, json, sys
T = 32
def water(r, c):                       # 얕은 물 두 변형 체커 + 수련잎(드문드문, 입구·출구 4칸은 비움)
    if 4 <= c and (r * 7 + c * 5) % 19 == 0: return 'j'
    return 'a' if (r + c) % 2 == 0 else 'A'
BLUE_C = 30                            # 마나샘 열(위쪽 숲 띠 가장자리, 길 윗줄에 닿게) — 사용자 2026-09-11 "오브제숲0에 마나샘(회복) 추가"
def build(W, H, R0, R1, ents, trees):
    rows = [[' '] * W for _ in range(H)]
    for r in range(R0, R1 + 1):
        for c in range(1, W - 1): rows[r][c] = water(r, c)
    for r in range(H):                                                                   # 물 둘레 2칸 숲 바닥('c', 막힘) — 나무는 그 위에만
        for c in range(W):
            if rows[r][c] == ' ' and any(0 <= r + dr < H and rows[r + dr][c] in 'aAj' for dr in (-2, -1, 1, 2)): rows[r][c] = 'c'
    for r in range(1, H):
        for c in range(W):
            if rows[r][c] == ' ' and rows[r - 1][c] in 'c': rows[r][c] = 'V'                 # 숲 바닥 아래 가장자리에 절벽면
    rows = [''.join(r) for r in rows]
    if trees:
        grid = [list(r) for r in rows]
        def ground(r, c): return 0 <= r < H and 0 <= c < W and grid[r][c] in 'aAj'
        spots = []
        for r in range(1, H - 2):
            for c in range(1, W - 2):
                if trees == 'obj0' and abs(c - BLUE_C) <= 1 and r < R0: continue                 # 마나샘 자리(위쪽 띠)는 나무를 비운다
                if grid[r][c] != 'c':
                    if grid[r + 1][c] == 'c' and not ground(r + 2, c) and (r * 5 + c * 3) % 3 == 0: spots.append((r, c))   # 위쪽 띠 뒷줄: 허공 위 그림이지만 밑동은 숲 바닥(r+1) — 위도 아래처럼 두 줄로 울창하게
                    continue
                near = any(ground(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
                if near and (r * 5 + c * 3) % 3 == 0: spots.append((r, c))                  # 길가는 빽빽하게(3칸에 하나 + 아래 조건)
                elif near and (r * 7 + c * 5) % 4 == 0: spots.append((r, c))
                elif not near and (r * 11 + c * 7) % 5 == 0: spots.append((r, c))
        seen = set()
        for j, (r, c) in enumerate(spots):
            x, y = c * T - 12, r * T - 40
            if ground(r + 1, c): y -= T                                                      # 밑동(그림 y+72)이 길 위에 떨어지면 한 칸 올린다 — 나무 밑동은 길 밖(maps-layout 감사)
            if any(abs(x - sx) < 30 and abs(y - sy) < 28 for (sx, sy) in seen): continue
            seen.add((x, y))
            img = 'assets/props/tree_obj_purple.png' if (r * 13 + c * 7) % 4 == 0 else 'assets/props/tree_obj.png'   # 넷에 하나는 보라 나무
            ents.append({'type': 'prop', 'id': f'ot{j}', 'image': img, 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True})
    return rows
W, H, R0, R1 = 60, 14, 6, 8
ents0 = [
    {'type': 'door', 'x': 32, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'teal9', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'obj1', 'spawn': 'from_left', 'sfx': False},
    # 마나샘(재사용, id blue): 위쪽 숲 띠 가장자리, 밑동 히트박스(32×12)가 길 윗줄(R0) 바로 위에 닿아 아래에서 C 로 누른다(프로브 19px). 억빠맨이 발밑 물을 먼저 마시는 새 대사(obj0_events.js)
    {'type': 'prop', 'id': 'blue', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4}, 'x': BLUE_C * T + 4, 'y': R0 * T - 12, 'w': 32, 'h': 12, 'ix': BLUE_C * T, 'iy': R0 * T - 44, 'solid': True, 'script': 'obj0_blue'},
]
rows0 = build(W, H, R0, R1, ents0, 'obj0')
m0 = {'id': 'obj0', 'name': '옵젝영역', 'bgm': 'wind', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'obj_forest', 'rows': rows0,
      'spawns': {'from_left': {'x': 60, 'y': 7 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 7 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 7 * T + 8, 'facing': 'left'}},
      'meta': {'connected': True, 'road': [R0, R1], 'events': ['blue'], 'trees': len([e for e in ents0 if e.get('id', '').startswith('ot')])},
      'entities': ents0}
ents1 = [{'type': 'door', 'x': 32, 'y': 5 * T, 'w': 8, 'h': 96, 'to': 'obj0', 'spawn': 'landing', 'sfx': False}]
rows1 = build(16, 12, 5, 7, ents1, False)
m1 = {'id': 'obj1', 'name': '옵젝영역', 'bgm': 'wind', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'obj_forest', 'rows': rows1,
      'spawns': {'from_left': {'x': 60, 'y': 6 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 6 * T + 8, 'facing': 'right'}},
      'entities': ents1}
maps = {'obj0': m0, 'obj1': m1}
if '--check' in sys.argv:
    ok = all(json.loads(io.open(f'assets/maps/{k}.json', encoding='utf-8').read()) == v for k, v in maps.items())
    print('obj maps', 'same' if ok else 'DIFFERENT'); sys.exit(0 if ok else 1)
for k, v in maps.items(): io.open(f'assets/maps/{k}.json', 'w', encoding='utf-8').write(json.dumps(v, ensure_ascii=False, indent=1))
print('wrote obj0', W, 'x', H, 'trees', m0['meta']['trees'], '/ obj1 placeholder')
