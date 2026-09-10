# -*- coding: utf-8 -*-
"""청록숲5 물길 (사용자 브리핑 2026-09-10): 청록 땅 + 파란 물길이 오른쪽으로 일직선. 뗏목 1개(형섭 승선, 억빠맨·경섭은 뗏목 **아래**에서 나란히 헤엄).
  선착장(승선 컷신 teal5_board: 경섭 "타도 될까" → 선택지가 뜨자마자 억빠맨이 끊음 → 둘 다 물로) → 1단 폭포(C 점프 한 번) → 이단폭포 앞 정지(teal5_wall: 협동 2단 점프 튜토리얼, double_jump 획득)
  → 이단폭포 3개(닿으면 쓸려 내려가 체크포인트로) → 착지 → 오른쪽 길 → teal6.
실행: /usr/bin/python3 tools/maps/teal5.py  (--check)
"""
import io, json, sys
W, H = 120, 14
T = 32
LAND_ROWS = range(4, 9)                 # 땅 5줄 (128~288)
WATER_ROWS = range(5, 8)                # 물길 3줄 (160~256) — 뗏목(40) + 아래 헤엄 동료 머리가 들어간다
LEFT = range(1, 10)                     # 왼쪽 선착장 땅 1~9열 (32~320)
WATER = range(10, 88)                   # 물길 10~87열 (320~2816)
RIGHT = range(88, W - 1)                # 오른쪽 착지·길 88~118열
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'w' if (r * 7 + c * 13) % 11 == 0 else ('t' if (r + c) % 2 == 0 else 'u')
def w_(r, c): return 'o' if (r + c) % 2 == 0 else 'O'
for r in LAND_ROWS:
    for c in list(LEFT) + list(RIGHT): rows[r][c] = g(r, c)
for r in WATER_ROWS:
    for c in WATER: rows[r][c] = w_(r, c)
for c in list(LEFT) + list(RIGHT): rows[9][c] = 'v'          # 절벽면
rows = [''.join(r) for r in rows]

RAFT_Y = 5 * T + 6                       # 166 — 뗏목(56x40) 이 물길 위쪽에, 아래 26px 는 헤엄 동료
RAFT_X0, RAFT_X1 = 10 * T + 8, 88 * T - 56 - 8   # 328 → 2752
def waterfall(id_, x, tiers):
    w = 24 if tiers == 1 else 40
    e = {'type': 'prop', 'id': id_, 'image': f'assets/props/waterfall{tiers}.png', 'x': x, 'y': 5 * T, 'w': w, 'h': 96, 'ix': x, 'iy': 5 * T - 4, 'solid': True, 'obstacle': True}
    if tiers == 2: e.update({'clear': 72, 'sweep': True})     # 한 번 점프(64) 로는 못 넘는다 → 협동 2단 점프. 닿으면 체크포인트로 쓸려 내려감
    return e
STOP_X = 1100                            # 첫 이단폭포(1250) 150px 앞에서 멈춘다 — "바로 앞 간격 좀 있는 앞에서"
CHECKPOINTS = [RAFT_X0, STOP_X, 1400, 1900]
ents = [
    {'type': 'door', 'x': 32, 'y': 4 * T, 'w': 8, 'h': 160, 'to': 'teal_east', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': 4 * T, 'w': 8, 'h': 160, 'to': 'teal6', 'spawn': 'from_left', 'sfx': False},
    {'type': 'raft', 'id': 'raft5', 'image': 'assets/props/raft.png', 'x': RAFT_X0, 'y': RAFT_Y, 'route': [[RAFT_X1, RAFT_Y]], 'speed': 171, 'jump': True,
     'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below', 'onBoard': 'teal5_board',
     'stops': [{'x': STOP_X, 'script': 'teal5_wall', 'flag': 'teal5_wall_seen'}], 'checkpoints': CHECKPOINTS},
    waterfall('fall_small', 740, 1),      # 출발 412px 뒤: C 점프 한 번
    waterfall('fall_big1', 1250, 2),      # 튜토리얼(정지 1100 → 1124 에서 C → 공중 정지 → C)
    waterfall('fall_big2', 1750, 2),
    waterfall('fall_big3', 2250, 2),
]
m = {'id': 'teal5', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': rows,
     'spawns': {'from_left': {'x': 60, 'y': 6 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 6 * T + 8, 'facing': 'right'},
                'dock': {'x': RAFT_X0 - 34, 'y': 6 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 6 * T + 8, 'facing': 'left'}},
     'meta': {'raftStart': RAFT_X0, 'raftEnd': RAFT_X1, 'stop': STOP_X, 'holdAt': 1124, 'checkpoints': CHECKPOINTS, 'waterfalls': [740, 1250, 1750, 2250]},
     'entities': ents}
path = 'assets/maps/teal5.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('teal5', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H)
