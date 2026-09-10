# -*- coding: utf-8 -*-
"""청록숲6 정글 (사용자 브리핑 2026-09-11): 나무가 많은 가로·세로로 긴 맵, 살짝 구불구불, 배치는 롤 정글처럼 — 구불구불한 본길 옆에 주머니(캠프)가 붙고 그 안에 몹.
  캠프 3: 칼날부리(40원) / 늑대(50원) / 두꺼비(60원). 닿으면 표준 조우, 이기면 영구 제거. 입구 왼쪽(teal5) → 출구 오른쪽(teal7 자리표시).
실행: /usr/bin/python3 tools/maps/teal6.py  (--check)
"""
import io, json, sys
W, H, T = 64, 26, 32
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'w' if (r * 7 + c * 13) % 11 == 0 else ('t' if (r + c) % 2 == 0 else 'u')
def fill(r0, r1, c0, c1, ch=None):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1): rows[r][c] = ch or g(r, c)
# 본길(3칸 폭): 살짝 계단식으로 구불구불 — 왼쪽 위에서 들어와 오른쪽 위로 나간다
fill(4, 6, 1, 10)            # A1 왼쪽 위 (입구)
fill(6, 8, 9, 20)            # A2 한 단 내려간 길
fill(6, 16, 18, 20)          # B 세로로 내려감
fill(14, 16, 18, 30)         # C1 오른쪽으로
fill(16, 18, 29, 40)         # C2 한 단 더 내려서 오른쪽
fill(8, 18, 38, 40)          # D 세로로 올라감
fill(8, 10, 38, 50)          # E1 오른쪽으로
fill(6, 8, 49, 62)           # E2 한 단 올라 출구까지
# 캠프(주머니): 목(3칸) + 공터
fill(7, 7, 6, 8); fill(8, 12, 4, 9)          # 캠프1 칼날부리: A1 아래
fill(11, 13, 16, 17); fill(10, 14, 10, 16)   # 캠프2 늑대: B 왼쪽
fill(19, 19, 32, 34); fill(20, 23, 30, 36)   # 캠프3 두꺼비: C2 아래
# 낙엽 패치(숲 느낌)
for (r, c) in ((5, 3), (7, 14), (15, 22), (17, 34), (9, 44), (7, 56), (11, 6), (12, 13), (21, 33)): rows[r][c] = 'n'
# 숲 바닥('m', 막힘): 길·캠프 둘레 2칸을 어두운 땅으로 — 나무가 허공에 떠 보이지 않게 (사용자 2026-09-11)
walk = [[rows[r][c] in 'tuwn' for c in range(W)] for r in range(H)]
for r in range(1, H - 1):
    for c in range(1, W - 1):
        if rows[r][c] == ' ' and any(walk[r + dr][c + dc] for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2) if 0 <= r + dr < H and 0 <= c + dc < W): rows[r][c] = 'm'
for r in range(1, H):
    for c in range(W):
        if rows[r][c] == ' ' and rows[r - 1][c] in 'tuwnm': rows[r][c] = 'v'   # 숲 바닥 아래 가장자리에 절벽면
rows = [''.join(r) for r in rows]

def ftree(id_, x, y):   # 숲 나무 56×84, 줄기 밑동만 막힘(24×12) — teal.py 와 같은 소품
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/tree_forest.png', 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True}
ents = [
    {'type': 'door', 'x': 32, 'y': 4 * T, 'w': 8, 'h': 96, 'to': 'teal5', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': 6 * T, 'w': 8, 'h': 96, 'to': 'teal7', 'spawn': 'from_left', 'sfx': False},
    # 캠프 몹 (걸어다니고 가까이 가면 쫓아온다). 잡으면 teal6_<id>_defeated 로 영구 제거
    # 이벤트 1 와드(정찰): A2 길 위쪽 가장자리에 박혀 있다 → 억빠맨이 박으면 시야 확보 → 카메라가 캠프 3곳을 훑는다 (롤 정글, 사용자 2026-09-11)
    {'type': 'prop', 'id': 'ward', 'image': 'assets/props/ward.png', 'anim': {'cols': 2, 'fps': 2}, 'x': 13 * T + 6, 'y': 6 * T + 20, 'w': 20, 'h': 12, 'ix': 13 * T + 6, 'iy': 6 * T - 4, 'solid': True, 'script': 'teal6_ward'},
    # 이벤트 2 파란 돌(블루 버프): 늑대 캠프 안쪽 구석 — 경섭이 핥는다 → 전원 HP 회복(쉼터, 반복 가능)
    {'type': 'prop', 'id': 'blue', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4}, 'x': 10 * T + 4, 'y': 10 * T + 22, 'w': 32, 'h': 12, 'ix': 10 * T, 'iy': 10 * T - 10, 'solid': True, 'script': 'teal6_blue'},
    {'type': 'enemy', 'id': 'bird', 'sprite': 'razorbeak', 'x': 6 * T + 4, 'y': 10 * T, 'facing': 'left', 'wander': 30, 'enemies': ['razorbeak'], 'unless': 'teal6_bird_defeated'},
    {'type': 'enemy', 'id': 'wolf', 'sprite': 'wolf', 'x': 13 * T, 'y': 12 * T, 'facing': 'right', 'wander': 36, 'enemies': ['wolf'], 'unless': 'teal6_wolf_defeated'},
    {'type': 'enemy', 'id': 'toad', 'sprite': 'toad', 'x': 33 * T, 'y': 21 * T + 8, 'facing': 'left', 'wander': 20, 'enemies': ['toad'], 'unless': 'teal6_toad_defeated'},
]
# 나무: 길·캠프 가장자리(허공 칸) 를 따라 빽빽하게 + 허공 군데군데 — 밑동은 길 밖에 두어 동선을 막지 않는다
grid = [list(r) for r in rows]
def ground(r, c): return 0 <= r < H and 0 <= c < W and grid[r][c] in 'tuwn'
spots = []
for r in range(1, H - 2):
    for c in range(1, W - 2):
        if grid[r][c] != 'm': continue                                          # 나무는 숲 바닥 위에만
        near = any(ground(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
        if near and (r * 5 + c * 3) % 4 == 0: spots.append((r, c))          # 길 가장자리 줄
        elif not near and (r * 11 + c * 7) % 9 == 0: spots.append((r, c))    # 숲 안쪽
seen = set()
for j, (r, c) in enumerate(spots):
    x, y = c * T - 12, r * T - 40
    if any(abs(x - sx) < 34 and abs(y - sy) < 30 for (sx, sy) in seen): continue
    seen.add((x, y)); ents.append(ftree(f'jt{j}', x, y))
m = {'id': 'teal6', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': rows,
     'spawns': {'from_left': {'x': 60, 'y': 5 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 5 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 7 * T + 8, 'facing': 'left'},
                'camp1': {'x': 6 * T, 'y': 8 * T + 8, 'facing': 'down'}, 'camp2': {'x': 15 * T, 'y': 12 * T + 8, 'facing': 'left'}, 'camp3': {'x': 33 * T, 'y': 20 * T + 8, 'facing': 'down'}},
     'meta': {'connected': True, 'events': ['ward', 'blue'], 'camps': {'bird': [6, 10], 'wolf': [13, 12], 'toad': [33, 21]}, 'trees': len([e for e in ents if e.get('id', '').startswith('jt')])},
     'entities': ents}
path = 'assets/maps/teal6.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('teal6', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H, 'trees', m['meta']['trees'])
