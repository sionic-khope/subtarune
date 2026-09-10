# -*- coding: utf-8 -*-
"""청록숲5 물길 (사용자 브리핑 2026-09-10): 청록 땅 + 파란 물길이 오른쪽으로 쭉 — **폭포마다 물길이 한 단(64px) 위로 올라가는 계단식**.
  뗏목 1개(형섭 승선, 억빠맨·경섭은 뗏목 아래에서 나란히 헤엄). 선착장(승선 컷신 teal5_board) → 기존 한 칸 점프 벽(water_wall, C 한 번)
  → 이단폭포 앞 정지(teal5_wall: 협동 2단 점프 튜토리얼) → 이단폭포 3개(각각 물길이 64px 위로; 닿으면 쓸려 내려가 체크포인트로) → 착지 → 오른쪽 길 → teal6.
실행: /usr/bin/python3 tools/maps/teal5.py  (--check)
"""
import io, json, sys
W, H, T = 120, 20, 32
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'w' if (r * 7 + c * 13) % 11 == 0 else ('t' if (r + c) % 2 == 0 else 'u')
def w_(r, c): return 'o' if (r + c) % 2 == 0 else 'O'
# 물길 단(top row): L0 12 → 폭포1(1250) → L1 10 → 폭포2(1750) → L2 8 → 폭포3(2250) → L3 6. 각 단은 3줄(96px)
FALLS = [1250, 1750, 2250]
LEVELS = [(12, 10, 39), (10, 40, 54), (8, 55, 70), (6, 71, 87)]      # (top row, c0, c1 inclusive)
for (top, c0, c1) in LEVELS:
    for r in range(top, top + 3):
        for c in range(c0, c1 + 1): rows[r][c] = w_(r, c)
    for c in range(c0, c1 + 1): rows[top + 3][c] = 'v'             # 물길 아래 턱
LEFT_ROWS, RIGHT_ROWS = range(11, 16), range(5, 10)                 # 선착장 땅(1~9열), 착지·길 땅(88~118열)
for r in LEFT_ROWS:
    for c in range(1, 10): rows[r][c] = g(r, c)
for c in range(1, 10): rows[16][c] = 'v'
for r in RIGHT_ROWS:
    for c in range(88, W - 1): rows[r][c] = g(r, c)
for c in range(88, W - 1): rows[10][c] = 'v'
rows = [''.join(r) for r in rows]

ry = lambda top: top * T + 6                                        # 뗏목 y (그 단의 물길 위쪽)
Y0, Y1, Y2, Y3 = ry(12), ry(10), ry(8), ry(6)                       # 390 / 326 / 262 / 198
RAFT_X0, RAFT_X1 = 10 * T + 8, 88 * T - 56 - 8                      # 328 → 2752
# 경유점: 폭포 8px 앞까지 평평 → 폭포(40) + 8px 뒤에서 한 단 위 — 점프하는 동안 뗏목이 위로 올라간다(계단식)
ROUTE = [[FALLS[0] - 8, Y0], [FALLS[0] + 48, Y1], [FALLS[1] - 8, Y1], [FALLS[1] + 48, Y2], [FALLS[2] - 8, Y2], [FALLS[2] + 48, Y3], [RAFT_X1, Y3]]
def waterfall(id_, x, top):        # 이단폭포: 위 단(top) 물길 꼭대기부터 아래 단 바닥까지(64+96) 막는다. 항상 뒤에 그린다(sortY) — 뗏목이 폭포 앞을 지나 올라간다
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/waterfall2.png', 'x': x, 'y': top * T, 'w': 40, 'h': 160, 'ix': x, 'iy': top * T - 4, 'sortY': top * T, 'solid': True, 'obstacle': True, 'clear': 72, 'sweep': True}
def wall(id_, x, y):               # 기존 한 칸 점프 벽(void8/9 와 같은 소품) — C 점프 한 번
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/water_wall.png', 'x': x, 'y': y, 'w': 28, 'h': 36, 'ix': x, 'iy': y - 16, 'solid': True, 'obstacle': True}
STOP_X, HOLD_X = 1100, 1116        # 첫 이단폭포 150px 앞 정지 / 튜토리얼 "지금 C" 정지점
CHECKPOINTS = [{'x': RAFT_X0, 'y': Y0}, {'x': STOP_X, 'y': Y0}, {'x': 1400, 'y': Y1}, {'x': 1900, 'y': Y2}]
ents = [
    {'type': 'door', 'x': 32, 'y': 11 * T, 'w': 8, 'h': 160, 'to': 'teal_east', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': 5 * T, 'w': 8, 'h': 160, 'to': 'teal6', 'spawn': 'from_left', 'sfx': False},
    {'type': 'raft', 'id': 'raft5', 'image': 'assets/props/raft.png', 'x': RAFT_X0, 'y': Y0, 'route': ROUTE, 'speed': 171, 'jump': True,
     'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'onBoard': 'teal5_board',
     'stops': [{'x': STOP_X, 'script': 'teal5_wall', 'flag': 'teal5_wall_seen'}], 'checkpoints': CHECKPOINTS},
    wall('wall_small', 740, Y0 + 2),
    waterfall('fall_big1', FALLS[0], 10), waterfall('fall_big2', FALLS[1], 8), waterfall('fall_big3', FALLS[2], 6),
]
m = {'id': 'teal5', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': rows,
     'spawns': {'from_left': {'x': 60, 'y': 13 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 13 * T + 8, 'facing': 'right'},
                'dock': {'x': RAFT_X0 - 34, 'y': 13 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 7 * T + 8, 'facing': 'left'}},
     'meta': {'raftStart': RAFT_X0, 'raftEnd': RAFT_X1, 'stop': STOP_X, 'holdAt': HOLD_X, 'checkpoints': CHECKPOINTS, 'waterfalls': FALLS, 'wall': 740, 'levels': [Y0, Y1, Y2, Y3]},
     'entities': ents}
path = 'assets/maps/teal5.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('teal5', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H)
