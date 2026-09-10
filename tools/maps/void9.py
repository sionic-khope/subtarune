# -*- coding: utf-8 -*-
"""보라맵9 뱀길 생성기: 물길 → ↓ ← ↓ → 에 뗏목 5개(점프·헤엄), 벽(고정/미끄러짐/오르내림), 체크포인트 착지 5곳 + 이벤트 소품.
실행: /usr/bin/python3 tools/maps/void9.py  (--check 는 기존과 동일한지만)
규칙: 첫 벽은 출발 300px 이상 뒤, 벽 사이 300px 이상. 착지마다 다른 유형의 이벤트 소품.
"""
import io, json, sys
W, H = 48, 52
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'x' if (r + c) % 2 == 0 else 'X'
def w_(r, c): return 'o' if (r + c) % 2 == 0 else 'O'
LANDS = {'A': (1, 7, 3, 7), 'B': (41, 47, 3, 7), 'C': (41, 47, 27, 31), 'D': (1, 7, 27, 31), 'E': (1, 7, 47, 51), 'F': (41, 47, 47, 51)}   # (c0,c1,r0,r1) 반열림
WATER = [('H', 3, 5, 7, 41), ('V', 7, 27, 43, 45), ('H', 27, 29, 7, 41), ('V', 31, 47, 3, 5), ('H', 47, 49, 7, 41)]   # H: rows r0..r1, cols c0..c1 / V: rows, cols
for (c0, c1, r0, r1) in LANDS.values():
    for r in range(r0, r1):
        for c in range(c0, c1): rows[r][c] = g(r, c)
    for c in range(c0, c1): rows[r1][c] = 'y'
for (kind, a0, a1, b0, b1) in WATER:
    for r in range(a0, a1):
        for c in range(b0, b1): rows[r][c] = w_(r, c)
rows = [''.join(r) for r in rows]
def wall(id_, x, y, wide=False, osc=None):
    e = ({'type': 'prop', 'id': id_, 'image': 'assets/props/water_wall_h.png', 'x': x, 'y': y, 'w': 64, 'h': 28, 'ix': x - 2, 'iy': y - 8, 'solid': True, 'obstacle': True} if wide
         else {'type': 'prop', 'id': id_, 'image': 'assets/props/water_wall.png', 'x': x, 'y': y, 'w': 28, 'h': 36, 'ix': x, 'iy': y - 16, 'solid': True, 'obstacle': True})
    if osc: e['oscillate'] = osc
    return e
def raft(id_, x, y, tx, ty):
    return {'type': 'raft', 'id': id_, 'image': 'assets/props/raft.png', 'x': x, 'y': y, 'route': [[tx, ty]], 'speed': 171, 'jump': True, 'swim': 'ppaman'}
ents = [
  {'type': 'door', 'x': 32, 'y': 96, 'w': 12, 'h': 128, 'to': 'void8', 'spawn': 'landing', 'sfx': False},
  raft('raft9a', 224, 108, 1248, 108),
  wall('w1', 560, 112), wall('w2', 880, 112, osc={'dx': 64, 'period': 3.2}),
  {'type': 'prop', 'id': 'button', 'image': 'assets/props/button.png', 'x': 1352, 'y': 100, 'solid': True, 'script': 'void9_button'},
  raft('raft9b', 1380, 224, 1380, 816),
  wall('w3', 1376, 520, wide=True), wall('w4', 1376, 720, wide=True, osc={'dy': 56, 'period': 3.6}),
  {'type': 'prop', 'id': 'sign_quiz', 'image': 'assets/props/signpost.png', 'x': 1460, 'y': 880, 'solid': True, 'script': 'void9_quiz'},
  raft('raft9c', 1248, 876, 224, 876),
  wall('w5', 900, 880, osc={'dy': 60, 'period': 3.0}), wall('w6', 560, 880),
  {'type': 'prop', 'id': 'puddle', 'image': 'assets/props/puddle.png', 'x': 120, 'y': 944, 'w': 52, 'h': 12, 'ix': 120, 'iy': 940, 'solid': False, 'sortY': 0, 'script': 'void9_puddle'},
  raft('raft9d', 100, 992, 100, 1456),
  wall('w7', 96, 1250, wide=True, osc={'dy': 48, 'period': 2.8}),
  {'type': 'prop', 'id': 'chest', 'image': 'assets/props/chest_small.png', 'x': 150, 'y': 1580, 'solid': True, 'script': 'void9_chest'},
  raft('raft9e', 224, 1516, 1248, 1516),
  wall('w8', 560, 1520, osc={'dx': 80, 'period': 3.4}), wall('w9', 900, 1520), wall('w10', 1100, 1520, osc={'dy': 60, 'period': 2.6, 'phase': 0.5}),
  {'type': 'door', 'x': (W - 1) * 32 - 12, 'y': 1504, 'w': 12, 'h': 128, 'to': 'void10', 'spawn': 'from_left', 'sfx': False},
]
m = {'id': 'void9', 'name': '???', 'bgm': 'scarlet', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'purple_fire', 'rows': rows,
     'spawns': {'from_left': {'x': 60, 'y': 120, 'facing': 'right'}, 'start': {'x': 60, 'y': 120}, 'dock': {'x': 190, 'y': 120, 'facing': 'right'},
                'dockB': {'x': 1396, 'y': 196, 'facing': 'down'}, 'dockC': {'x': 1316, 'y': 890, 'facing': 'left'}, 'dockD': {'x': 116, 'y': 964, 'facing': 'down'}, 'dockE': {'x': 190, 'y': 1528, 'facing': 'right'},
                'landing': {'x': 1420, 'y': 1530, 'facing': 'left'}},
     'entities': ents}
path = 'assets/maps/void9.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('void9', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H)
