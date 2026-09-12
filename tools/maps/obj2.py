# -*- coding: utf-8 -*-
"""옵젝영역2 (사용자 브리핑 2026-09-12): 오른쪽으로 조금 긴 얕은 물 길 — 가운데에 광장(진짜 광장은 아니고 이벤트가 모인 공터).
  광장: 마나샘(회복 재사용) + 이벤트 2종(**귀환 발판**·**오브젝트 알**) + 바나나 1개.
  광장 가운데에서 **윗길**(바론 둥지 — 표지판 하나, 아직 여기까지)과 **오른쪽길**이 갈리는데, 오른쪽길은 **쥰희 나무 동상**으로 막혀 있어 위로 가게 유도한다.
  타일·소품: tools/art/obj_set.py(recall_pad·obj_egg·obj_egg_cracked·obj_egg_legs), 공용 조각: tools/maps/objlib.py. 왼쪽 ← obj1, 윗길 끝 → obj3(별도 생성기).
실행: /usr/bin/python3 tools/maps/obj2.py  (--check)
"""
import io, json, sys
sys.path.insert(0, '.')
from tools.maps.objlib import T, water, JUNHEE_STATUES
W, H = 76, 22
R0, R1 = 13, 15                      # 가로 길 3줄(들어오는 길·오른쪽길)
PC0, PC1, PR0, PR1 = 26, 44, 6, 17   # 광장(공터)
UC0, UC1 = 33, 36                    # 윗길 4칸 폭(광장 가운데에서 위로)
STAT_C = 50                          # 오른쪽길을 막는 쥰희 동상 열
rows = [[' '] * W for _ in range(H)]
for r in range(R0, R1 + 1):
    for c in range(1, W - 1): rows[r][c] = water(r, c)          # 왼쪽 입구 ~ 오른쪽 끝(막힌 길)
for r in range(PR0, PR1 + 1):
    for c in range(PC0, PC1 + 1):
        rows[r][c] = 'j' if (r * 3 + c * 7) % 9 == 0 else water(r, c)   # 광장은 수련잎을 촘촘히(넓은 물이 휑하지 않게)
for r in range(1, PR0):
    for c in range(UC0, UC1 + 1): rows[r][c] = water(r, c)      # 윗길(바론 둥지 쪽)
for r in range(H):                                              # 둘레 2칸 숲 바닥 + 절벽
    for c in range(W):
        if rows[r][c] == ' ' and any(0 <= r + dr < H and 0 <= c + dc < W and rows[r + dr][c + dc] in 'aAj' for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2)): rows[r][c] = 'c'
for r in range(1, H):
    for c in range(W):
        if rows[r][c] == ' ' and rows[r - 1][c] == 'c': rows[r][c] = 'V'
rows = [''.join(r) for r in rows]

def statue(id_, row, k):             # PR 그림 44×60(포즈 6종, 청록숲2 동상 벽과 같은 세트). 벽이라 히트박스는 타일 전체(32×32)로 빈틈 없이 막는다
    ix, iy = STAT_C * T - 6, row * T - 28
    return {'type': 'prop', 'id': id_, 'image': JUNHEE_STATUES[k % len(JUNHEE_STATUES)], 'x': ix + 6, 'y': iy + 28, 'w': 32, 'h': 32, 'ix': ix, 'iy': iy, 'solid': True, 'script': 'obj2_statue', 'unless': 'obj2_statues_cleared'}
ents = [
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'obj5', 'spawn': 'from_left', 'sfx': False, 'requires': 'obj2_statues_cleared', 'lockedScript': 'obj2_statue'},
    {'type': 'door', 'x': 32, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'obj1', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': UC0 * T + 8, 'y': 32, 'w': 96, 'h': 8, 'to': 'obj3', 'spawn': 'from_bottom', 'sfx': False},
    # 오른쪽길을 막는 쥰희 나무 동상 3개(길 3줄을 통째로) — 조사하면 obj2_statue
    *[statue(f'statue{k + 1}', R0 + k, k) for k in range(3)],
    # 윗길 입구 표지판(바론 둥지 경고) — 광장 위쪽, 길 왼쪽 가장자리
    {'type': 'prop', 'id': 'sign', 'image': 'assets/props/signpost.png', 'scale': 1.4, 'x': (UC0 - 2) * T + 4, 'y': (PR0 + 1) * T + 10, 'w': 28, 'h': 10, 'ix': (UC0 - 2) * T, 'iy': (PR0 + 1) * T - 32, 'solid': True, 'script': 'obj2_sign'},
    # 마나샘(재사용): 광장 위쪽 가장자리
    {'type': 'prop', 'id': 'blue', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4}, 'x': 28 * T + 4, 'y': PR0 * T - 12, 'w': 32, 'h': 12, 'ix': 28 * T, 'iy': PR0 * T - 44, 'solid': True, 'script': 'obj2_blue'},
    # 이벤트 1 귀환 발판: 광장 가운데(바닥 그림이라 항상 뒤에, 밟고 설 수 있게 solid 아님)
    {'type': 'prop', 'id': 'recall', 'image': 'assets/props/recall_pad.png', 'anim': {'cols': 3, 'fps': 4}, 'scale': 1.6, 'x': 34 * T, 'y': 11 * T + 36, 'w': 90, 'h': 4, 'ix': 34 * T, 'iy': 11 * T + 8, 'solid': False, 'sortY': 0, 'script': 'obj2_recall'},
    # 물 위 디딤돌(장식): 넓은 광장이 허전하지 않게. 밟히지 않게 solid
    *[{'type': 'prop', 'id': f'rock{k + 1}', 'image': 'assets/props/stone_block.png', 'x': cx + 1, 'y': cy - 8, 'w': 28, 'h': 8, 'ix': cx, 'iy': cy - 22, 'solid': True}
      for k, (cx, cy) in enumerate(((27 * T + 8, 9 * T), (42 * T, 8 * T + 16), (30 * T + 16, 13 * T + 8), (40 * T + 8, 12 * T + 24), (36 * T, 16 * T + 16)))],
    # 이벤트 2 오브젝트 알: 광장 왼쪽 아래 구석. 깨지면 다리가 나와 도망가고 자리는 빈다(obj2_egg)
    {'type': 'prop', 'id': 'egg', 'image': 'assets/props/obj_egg.png', 'x': 28 * T + 4, 'y': 16 * T + 10, 'w': 16, 'h': 8, 'ix': 28 * T, 'iy': 16 * T - 12, 'solid': True, 'script': 'obj2_egg', 'unless': 'obj2_egg_hatched'},
    # 바나나 1개(힐템): 광장 오른쪽 아래
    {'type': 'prop', 'id': 'banana', 'image': 'assets/props/banana.png', 'x': 41 * T + 3, 'y': 15 * T + 14, 'w': 26, 'h': 8, 'ix': 41 * T, 'iy': 15 * T + 6, 'solid': False, 'sortY': 0, 'script': 'obj2_banana', 'unless': 'obj2_banana_taken'},
]
# 나무: 물 둘레 숲 바닥 위에만, 밑동이 길 위에 떨어지면 한 칸 올린다
grid = [list(r) for r in rows]
def ground(r, c): return 0 <= r < H and 0 <= c < W and grid[r][c] in 'aAj'
# 소품이 나무에 가리지 않게 둘레를 비운다(동상 벽·표지판 — 2026-09-11 레이아웃 규칙 '소품 열과 캐릭터 자리 열은 겹치지 않게')
CLEAR_C = set(range(STAT_C - 2, STAT_C + 3)) | set(range(UC0 - 3, UC0 + 1))
spots = []
for r in range(1, H - 2):
    for c in range(1, W - 2):
        if c in CLEAR_C: continue
        if grid[r][c] != 'c':
            if grid[r + 1][c] == 'c' and not ground(r + 2, c) and (r * 5 + c * 3) % 3 == 0: spots.append((r, c))
            continue
        near = any(ground(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
        if near and (r * 5 + c * 3) % 3 == 0: spots.append((r, c))
        elif near and (r * 7 + c * 5) % 4 == 0: spots.append((r, c))
        elif not near and (r * 11 + c * 7) % 5 == 0: spots.append((r, c))
seen = set()
tree_count = 0
for j, (r, c) in enumerate(spots):
    x, y = c * T - 12, r * T - 40
    if ground(r + 1, c): y -= T
    if any(abs(x - sx) < 30 and abs(y - sy) < 28 for (sx, sy) in seen): continue
    seen.add((x, y))
    img = 'assets/props/tree_obj_purple.png' if (r * 13 + c * 7) % 4 == 0 else 'assets/props/tree_obj.png'
    ents.append({'type': 'prop', 'id': f'ot{j}', 'image': img, 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True})
    tree_count += 1
m2 = {'id': 'obj2', 'name': '옵젝영역', 'bgm': 'wind', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'obj_forest', 'rows': rows,
      'spawns': {'from_left': {'x': 60, 'y': 14 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 14 * T + 8, 'facing': 'right'},
                 'plaza': {'x': 34 * T, 'y': 14 * T + 8, 'facing': 'right'}, 'from_top': {'x': UC0 * T + 40, 'y': 3 * T + 8, 'facing': 'down'},
                 'from_right': {'x': (W - 3) * T, 'y': 14 * T + 8, 'facing': 'left'}},
      'meta': {'connected': True, 'road': [R0, R1], 'plaza': [PC0, PC1, PR0, PR1], 'up': [UC0, UC1], 'statue_c': STAT_C,
               'events': ['blue', 'recall', 'egg', 'banana', 'sign', 'statue1'],
               # 막아야 하는 길: [출발 타일, 절대 닿으면 안 되는 타일] — 동상 벽에 틈이 있으면 tests/unit/maps-connect.test.mjs 가 잡는다(2026-09-12 '다 안 막히고 뚫린다')
               'blocked': [[46, R0 + 1], [W - 3, R0 + 1]], 'blockedClearedBy': 'obj2_statues_cleared', 'trees': tree_count},
      'entities': ents}
maps = {'obj2': m2}
if '--check' in sys.argv:
    ok = all(json.loads(io.open(f'assets/maps/{k}.json', encoding='utf-8').read()) == v for k, v in maps.items())
    print('obj2', 'same' if ok else 'DIFFERENT'); sys.exit(0 if ok else 1)
for k, v in maps.items(): io.open(f'assets/maps/{k}.json', 'w', encoding='utf-8').write(json.dumps(v, ensure_ascii=False, indent=1))
print('wrote obj2', W, 'x', H, 'trees', tree_count)
