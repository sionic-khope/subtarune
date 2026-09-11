# -*- coding: utf-8 -*-
"""청록숲8 정글 2 (사용자 브리핑 2026-09-11): 청록숲6 같은 정글 지형 — 구불구불한 본길 + 목 3칸으로 붙은 주머니 캠프 3, 길 가장자리 나무 빽빽.
  몹: 돌거북(HP 9, 70원) / 바위게(HP 10, 80원) / 대포미니언(HP 11, 100원) — 왼쪽 아래·가운데·오른쪽 위로 멀리 흩어 놓는다. 이벤트 기믹 없음.
  와드(정찰 카메라 투어)·마나샘(전원 회복 쉼터)은 소품 재사용, 대사는 새로(src/data/cutscenes/teal8_events.js). 입구 왼쪽(teal7) → 출구 오른쪽(teal9 자리표시).
실행: /usr/bin/python3 tools/maps/teal8.py  (--check)
"""
import io, json, sys
W, H, T = 64, 26, 32
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'w' if (r * 7 + c * 13) % 11 == 0 else ('t' if (r + c) % 2 == 0 else 'u')
def fill(r0, r1, c0, c1, ch=None):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1): rows[r][c] = ch or g(r, c)
# 본길(3칸 폭): 왼쪽 가운데로 들어와 위로 → 오른쪽 → 아래로 → 오른쪽 → 다시 위로 → 오른쪽 위 출구 (청록숲6 과 반대로 굽이친다)
fill(12, 14, 1, 13)          # A 입구(왼쪽 가운데)
fill(5, 14, 11, 13)          # B 위로
fill(5, 7, 11, 27)           # C 오른쪽으로
fill(5, 17, 25, 27)          # D 아래로
fill(15, 17, 25, 43)         # E 오른쪽으로
fill(7, 17, 41, 43)          # F 위로
fill(7, 9, 41, 62)           # G 출구까지
# 캠프(주머니): 목 + 공터 — 서로 멀리(왼쪽 아래 / 가운데 / 오른쪽 위)
fill(15, 15, 5, 7); fill(16, 20, 3, 9)       # 캠프1 돌거북: A 아래
fill(10, 12, 28, 29); fill(8, 12, 30, 36)    # 캠프2 바위게: D 오른쪽
fill(6, 6, 52, 54); fill(2, 5, 49, 57)       # 캠프3 대포미니언: G 위
fill(11, 12, 44, 46)                         # 마나샘 알코브: F 오른쪽 옆
# 낙엽 패치(숲 느낌)
for (r, c) in ((13, 4), (6, 15), (9, 26), (16, 33), (12, 42), (8, 55), (18, 6), (10, 34), (4, 52)): rows[r][c] = 'n'
# 숲 바닥('m', 막힘): 길·캠프 둘레 2칸 — 나무는 그 위에만 (허공에 뜬 나무 금지)
walk = [[rows[r][c] in 'tuwn' for c in range(W)] for r in range(H)]
for r in range(1, H - 1):
    for c in range(1, W - 1):
        if rows[r][c] == ' ' and any(walk[r + dr][c + dc] for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2) if 0 <= r + dr < H and 0 <= c + dc < W): rows[r][c] = 'm'
for r in range(1, H):
    for c in range(W):
        if rows[r][c] == ' ' and rows[r - 1][c] in 'tuwnm': rows[r][c] = 'v'   # 숲 바닥 아래 가장자리에 절벽면
rows = [''.join(r) for r in rows]

def ftree(id_, x, y):   # 숲 나무 56×84, 줄기 밑동만 막힘(24×12)
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/tree_forest.png', 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True}
CAMPS = {'krug': [6, 18], 'scuttle': [33, 10], 'cannon': [53, 3]}   # 와드 정찰 카메라가 훑는 타일 좌표
ents = [
    {'type': 'door', 'x': 32, 'y': 12 * T, 'w': 8, 'h': 96, 'to': 'teal7', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': 7 * T, 'w': 8, 'h': 96, 'to': 'teal9', 'spawn': 'from_left', 'sfx': False},
    # 와드(재사용): 입구 길 A 위쪽 가장자리 — 이번엔 경섭이 박는다 → 시야 확보 → 카메라가 캠프 3곳을 훑는다
    {'type': 'prop', 'id': 'ward', 'image': 'assets/props/ward.png', 'anim': {'cols': 2, 'fps': 2}, 'x': 8 * T + 6, 'y': 12 * T + 20, 'w': 20, 'h': 12, 'ix': 8 * T + 6, 'iy': 12 * T - 4, 'solid': True, 'script': 'teal8_ward'},
    # 마나샘(재사용, id 는 blue): F 옆 알코브 — 이번엔 억빠맨이 먼저 마신다 → 전원 HP 회복(쉼터, 반복 가능)
    {'type': 'prop', 'id': 'blue', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4}, 'x': 45 * T + 4, 'y': 11 * T + 22, 'w': 32, 'h': 12, 'ix': 45 * T, 'iy': 11 * T - 10, 'solid': True, 'script': 'teal8_blue'},
    # 캠프 몹 (걸어다니고 가까이 가면 쫓아온다). 잡으면 teal8_<id>_defeated 로 영구 제거
    {'type': 'enemy', 'id': 'krug', 'sprite': 'krug', 'x': CAMPS['krug'][0] * T, 'y': CAMPS['krug'][1] * T, 'facing': 'left', 'wander': 20, 'enemies': ['krug'], 'unless': 'teal8_krug_defeated'},
    {'type': 'enemy', 'id': 'scuttle', 'sprite': 'scuttle', 'x': CAMPS['scuttle'][0] * T, 'y': CAMPS['scuttle'][1] * T, 'facing': 'left', 'wander': 44, 'enemies': ['scuttle'], 'unless': 'teal8_scuttle_defeated'},
    {'type': 'enemy', 'id': 'cannon', 'sprite': 'cannon', 'x': CAMPS['cannon'][0] * T, 'y': CAMPS['cannon'][1] * T + 8, 'facing': 'down', 'wander': 16, 'enemies': ['cannon'], 'unless': 'teal8_cannon_defeated'},
]
# 나무: 길·캠프 가장자리를 따라 빽빽하게 + 숲 안쪽 군데군데 — 밑동은 숲 바닥(m) 위에만
grid = [list(r) for r in rows]
def ground(r, c): return 0 <= r < H and 0 <= c < W and grid[r][c] in 'tuwn'
spots = []
for r in range(1, H - 2):
    for c in range(1, W - 2):
        if grid[r][c] != 'm': continue
        near = any(ground(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
        if near and (r * 5 + c * 3) % 4 == 0: spots.append((r, c))
        elif not near and (r * 11 + c * 7) % 9 == 0: spots.append((r, c))
seen = set()
for j, (r, c) in enumerate(spots):
    x, y = c * T - 12, r * T - 40
    if ground(r + 1, c): y -= T                                                       # 밑동 히트박스(그림 y+72 = 한 칸 아래)가 길 위에 떨어지면 한 칸 올린다 — 나무 밑동은 길 밖(레이아웃 감사 tests/unit/maps-layout.test.mjs)
    if any(abs(x - sx) < 34 and abs(y - sy) < 30 for (sx, sy) in seen): continue
    seen.add((x, y)); ents.append(ftree(f'jt{j}', x, y))
m = {'id': 'teal8', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': rows,
     'spawns': {'from_left': {'x': 60, 'y': 13 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 13 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 8 * T + 8, 'facing': 'left'},
                'camp1': {'x': 5 * T, 'y': 16 * T + 8, 'facing': 'down'}, 'camp2': {'x': 31 * T, 'y': 9 * T + 8, 'facing': 'right'}, 'camp3': {'x': 50 * T, 'y': 4 * T + 8, 'facing': 'right'}},
     'meta': {'connected': True, 'events': ['ward', 'blue'], 'camps': CAMPS, 'trees': len([e for e in ents if e.get('id', '').startswith('jt')])},
     'entities': ents}
path = 'assets/maps/teal8.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('teal8', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H, 'trees', m['meta']['trees'])
