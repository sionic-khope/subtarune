# -*- coding: utf-8 -*-
"""청록숲 맵 생성기 (사용자 브리핑 2026-09-10).
teal1: 오른쪽으로 쭉 가는 길 (64×12), 청록 땅·검은 수풀 배경, 브금 Weird Birds.   void11 오른쪽 출구 → teal1 → teal2
teal2: 오른쪽 길이 쥰희 닮은 나무 동상 벽(출구보다 3칸 왼쪽)으로 막혀 있고, 그 바로 왼쪽에서 위로 가는 길이 시작(44×26). 동상들이 여기저기 깔려 있다. 브금 Field of Hopes and Dreams.
teal3(위, 다음 브리핑) / teal_east(막힌 오른쪽 너머) 는 빈 착지.
실행: /usr/bin/python3 tools/maps/teal.py  (--check)
"""
import io, json, sys
def g(r, c, grass=False): return 'g' if grass else ('t' if (r + c) % 2 == 0 else 'u')
def cliffs(rows, W, H):
    for r in range(1, H):
        for c in range(W):
            if rows[r][c] == ' ' and rows[r - 1][c] in 'tug': rows[r][c] = 'v'
def grass_at(r, c): return (r * 7 + c * 13) % 11 == 0     # 잔풀 땅을 드문드문
STATUE = 'assets/props/statue_junhee.png'
def statue(id_, x, y, script, wall=False):   # 그림 44×60. 히트박스 = 받침(32×14); 벽 동상은 타일 전체(32×32) 로 빈틈 없이 막는다
    if wall: return {'type': 'prop', 'id': id_, 'image': STATUE, 'x': x + 6, 'y': y + 28, 'w': 32, 'h': 32, 'ix': x, 'iy': y, 'solid': True, 'script': script}
    return {'type': 'prop', 'id': id_, 'image': STATUE, 'x': x + 6, 'y': y + 46, 'w': 32, 'h': 14, 'ix': x, 'iy': y, 'solid': True, 'script': script}

# ── teal1 ──
W, H = 64, 12
rows = [[' '] * W for _ in range(H)]
for r in range(4, 9):
    for c in range(1, W - 1): rows[r][c] = g(r, c, grass_at(r, c))
cliffs(rows, W, H)
m1 = {'id': 'teal1', 'name': '청록숲', 'bgm': 'weird_birds', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush',
      'rows': [''.join(r) for r in rows],
      'spawns': {'from_left': {'x': 60, 'y': 6 * 32 + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 6 * 32 + 8, 'facing': 'right'}, 'landing': {'x': (W - 3) * 32, 'y': 6 * 32 + 8, 'facing': 'left'}},
      'entities': [
          {'type': 'door', 'x': 32, 'y': 4 * 32, 'w': 8, 'h': 160, 'to': 'void11', 'spawn': 'landing', 'sfx': False},
          {'type': 'door', 'x': (W - 1) * 32 - 8, 'y': 4 * 32, 'w': 8, 'h': 160, 'to': 'teal2', 'spawn': 'from_left', 'sfx': False},
      ]}

# ── teal2 ──
W, H = 44, 26
R0, R1 = 19, 23                 # 가로 길 5행
UPC0, UPC1 = 35, 37             # 위로 가는 길 3열 (동상 벽 바로 왼쪽)
WALLC = 39                      # 동상 벽 열 = 오른쪽 출구(42열)보다 3칸 왼쪽
rows = [[' '] * W for _ in range(H)]
for r in range(R0, R1 + 1):
    for c in range(1, W - 1): rows[r][c] = g(r, c, grass_at(r, c))
for r in range(1, R0):
    for c in range(UPC0, UPC1 + 1): rows[r][c] = g(r, c, grass_at(r, c))
cliffs(rows, W, H)
ents = [
    {'type': 'door', 'x': 32, 'y': R0 * 32, 'w': 8, 'h': 160, 'to': 'teal1', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': UPC0 * 32, 'y': 32, 'w': 96, 'h': 8, 'to': 'teal3', 'spawn': 'from_bottom', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * 32 - 8, 'y': R0 * 32, 'w': 8, 'h': 160, 'to': 'teal_east', 'spawn': 'from_left', 'sfx': False},
]
for i in range(5):   # 동상 벽: 가로 길 5행을 두 열로 엇갈리게(겹쳐 보이지 않게) 세로로 막는다 — 홀수 번째는 한 칸 오른쪽
    col = WALLC + (i % 2)
    ents.append(statue(f'statue_w{i + 1}', col * 32 - 6, (R0 + i) * 32 - 28, 'teal2_statue_wall', wall=True))
for j, (c, r) in enumerate([(5, R0), (11, R0), (18, R0), (25, R0), (31, R0), (UPC0, 6), (UPC1, 12), (UPC1, 3)]):   # 깔려 있는 동상들(길 가장자리)
    ents.append(statue(f'statue_d{j + 1}', c * 32 - 6, r * 32 - 30, 'teal2_statue_look'))
m2 = {'id': 'teal2', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush',
      'rows': [''.join(r) for r in rows],
      'spawns': {'from_left': {'x': 60, 'y': 21 * 32 + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 21 * 32 + 8, 'facing': 'right'},
                 'from_top': {'x': 36 * 32 + 4, 'y': 2 * 32 + 16, 'facing': 'down'}, 'landing_east': {'x': (W - 3) * 32, 'y': 21 * 32 + 8, 'facing': 'left'}},
      'meta': {'wallCol': WALLC, 'upCols': [UPC0, UPC1], 'roadRows': [R0, R1]},
      'entities': ents}

def placeholder(id_, door):
    W, H = 16, 12
    rows = [[' '] * W for _ in range(H)]
    for r in range(4, 8):
        for c in range(1, W - 1): rows[r][c] = g(r, c)
    cliffs(rows, W, H)
    return {'id': id_, 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'rows': [''.join(r) for r in rows],
            'spawns': {'from_bottom': {'x': 8 * 32 + 4, 'y': 6 * 32 + 16, 'facing': 'up'}, 'from_left': {'x': 60, 'y': 6 * 32 + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 6 * 32 + 8}},
            'entities': [door]}
m3 = placeholder('teal3', {'type': 'door', 'x': 6 * 32, 'y': 8 * 32 - 8, 'w': 160, 'h': 8, 'to': 'teal2', 'spawn': 'from_top', 'sfx': False})
m3['rows'] = [r if i < 8 else r for i, r in enumerate(m3['rows'])]
me = placeholder('teal_east', {'type': 'door', 'x': 32, 'y': 4 * 32, 'w': 8, 'h': 128, 'to': 'teal2', 'spawn': 'landing_east', 'sfx': False})
maps = {'teal1': m1, 'teal2': m2, 'teal3': m3, 'teal_east': me}
if '--check' in sys.argv:
    ok = all(json.loads(io.open(f'assets/maps/{k}.json', encoding='utf-8').read()) == v for k, v in maps.items())
    print('teal maps', 'same' if ok else 'DIFFERENT'); sys.exit(0 if ok else 1)
for k, v in maps.items(): io.open(f'assets/maps/{k}.json', 'w', encoding='utf-8').write(json.dumps(v, ensure_ascii=False, indent=1))
print('wrote teal1 (64x12), teal2 (44x26), teal3, teal_east')
