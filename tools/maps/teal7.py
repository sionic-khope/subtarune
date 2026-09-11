# -*- coding: utf-8 -*-
"""청록숲7 (사용자 브리핑 2026-09-11): 일직선 길 + 길 중간 위쪽에 나무 두 그루 사이 세 명이 숨을 그림자 진 공간(주머니). 입구에서 3초쯤 걸으면 쥰희·경섭·용준 연출(teal7_hide).
실행: /usr/bin/python3 tools/maps/teal7.py  (--check)
"""
import io, json, sys
W, H, T = 48, 14, 32
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'w' if (r * 7 + c * 13) % 11 == 0 else ('t' if (r + c) % 2 == 0 else 'u')
R0, R1 = 8, 10                       # 길 3줄 (256~352)
for r in range(R0, R1 + 1):
    for c in range(1, W - 1): rows[r][c] = g(r, c)
PC0, PC1, PR0, PR1 = 24, 30, 4, 7    # 그림자 주머니: 24~30열, 4~7행 (길 바로 위, 7행이 길과 닿는다) — 트리거(22열) 바로 뒤, 맵 가운데
for r in range(PR0, PR1 + 1):
    for c in range(PC0, PC1 + 1): rows[r][c] = 'd'    # 그늘 땅(걸을 수 있음, 어두움)
walk = [[rows[r][c] in 'tuwnd' for c in range(W)] for r in range(H)]
for r in range(1, H - 1):
    for c in range(1, W - 1):
        if rows[r][c] == ' ' and any(walk[r + dr][c + dc] for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2) if 0 <= r + dr < H and 0 <= c + dc < W): rows[r][c] = 'm'
for r in range(1, H):
    for c in range(W):
        if rows[r][c] == ' ' and rows[r - 1][c] in 'tuwndm': rows[r][c] = 'v'
rows = [''.join(r) for r in rows]

def ftree(id_, x, y):
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/tree_forest.png', 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True}
HIDE_Y = 5 * T + 8                    # 숨는 줄(y 168): 나무 두 그루 사이, 화면 가운데 위
HIDE = {'left': [26 * T + 4, HIDE_Y], 'center': [27 * T + 4, HIDE_Y], 'right': [28 * T + 4, HIDE_Y], 'left_wide': [25 * T + 22, HIDE_Y], 'right_wide': [28 * T + 18, HIDE_Y]}
STAGE = {'gyeongsub': [27 * T + 4, 9 * T + 8], 'guest': [30 * T + 4, 9 * T + 8], 'edge': [(W - 1) * T + 4, 9 * T + 8], 'back_h': [26 * T + 4, 9 * T + 8], 'back_p': [25 * T + 4, 9 * T + 8]}
ents = [
    {'type': 'door', 'x': 32, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'teal6', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'teal8', 'spawn': 'from_left', 'sfx': False},
    # 입구에서 3초쯤(걷기 218px/s × 3 ≈ 650px) 걸으면 연출 1회
    {'type': 'trigger', 'id': 'hide_trig', 'x': 22 * T + 16, 'y': R0 * T, 'w': 16, 'h': 96, 'once': True, 'flag': 'teal7_hide_seen', 'script': 'teal7_hide'},
    # 숨는 공간 양옆 나무 두 그루 (밑동은 주머니 아랫줄, 잎은 위로) — 사이에 셋이 선다
    ftree('hide_tree_l', 24 * T + 8, PR1 * T - 72), ftree('hide_tree_r', 29 * T + 8, PR1 * T - 72),
]
grid = [list(r) for r in rows]
def ground(r, c): return 0 <= r < H and 0 <= c < W and grid[r][c] in 'tuwnd'
seen = set(); k = 0
for r in range(1, H - 2):
    for c in range(1, W - 2):
        if grid[r][c] != 'm': continue
        near = any(ground(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
        if not ((near and (r * 5 + c * 3) % 4 == 0) or (not near and (r * 11 + c * 7) % 9 == 0)): continue
        if PC0 - 2 <= c <= PC1 + 2 and r <= PR1 + 1: continue                 # 주머니 둘레는 비워 둔다(숨는 공간이 보이게)
        x, y = c * T - 12, r * T - 40
        if any(abs(x - sx) < 34 and abs(y - sy) < 30 for (sx, sy) in seen): continue
        seen.add((x, y)); ents.append(ftree(f'st{k}', x, y)); k += 1
m = {'id': 'teal7', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': rows,
     'preload': ['assets/sprites/junhee.png'],
     'spawns': {'from_left': {'x': 60, 'y': 9 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 9 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 9 * T + 8, 'facing': 'left'}},
     'meta': {'connected': True, 'hide': HIDE, 'stage': STAGE, 'trigger': 22 * T + 16},
     'entities': ents}
path = 'assets/maps/teal7.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('teal7', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H, 'trees', k + 2)
