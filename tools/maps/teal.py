# -*- coding: utf-8 -*-
"""청록숲 맵 생성기 (사용자 브리핑 2026-09-10).
teal1: 오른쪽으로 쭉 가는 길 (64×12), 청록 땅·검은 수풀 배경, 브금 Weird Birds.   void11 오른쪽 출구 → teal1 → teal2
teal2: 오른쪽 길이 쥰희 닮은 나무 동상 벽(출구보다 3칸 왼쪽)으로 막혀 있고, 그 바로 왼쪽에서 위로 가는 길이 시작(44×26). 동상들이 여기저기 깔려 있다. 브금 Field of Hopes and Dreams.
       가운데는 넓은 광장(13~28열·12~23행, 사용자 "가운데 중앙은 좀 더 넓게") — 이벤트 나무(`tree_teal.png`, 똑똑 연출) + 바나나 2개(포타슘 이벤트).
teal3: 아래에서 위로 오르는 길 → 울창한 숲 공터(숲 나무 여러 그루·낙엽·오른쪽 풀숲) → 가운데 무기 상자(컷신: CS 미니언 등장 → 전투). teal_east(막힌 오른쪽 너머) 는 빈 착지.
실행: /usr/bin/python3 tools/maps/teal.py  (--check)
"""
import io, json, sys
from itertools import cycle
def g(r, c, grass=False): return 'w' if grass else ('t' if (r + c) % 2 == 0 else 'u')
def cliffs(rows, W, H):
    for r in range(1, H):
        for c in range(W):
            if rows[r][c] == ' ' and rows[r - 1][c] in 'tuwnm': rows[r][c] = 'v'
def grass_at(r, c): return (r * 7 + c * 13) % 11 == 0     # 잔풀 땅을 드문드문
STATUES = cycle(f'assets/props/statue_junhee_{pose}.png' for pose in
                ('arms_crossed', 'laugh', 'gesture', 'arms_raised', 'thinking', 'look_back'))
def statue(id_, x, y, script, wall=False):   # 그림 44×60. 히트박스 = 받침(32×14); 벽 동상은 타일 전체(32×32) 로 빈틈 없이 막는다
    image = next(STATUES)
    if wall: return {'type': 'prop', 'id': id_, 'image': image, 'x': x + 6, 'y': y + 28, 'w': 32, 'h': 32, 'ix': x, 'iy': y, 'solid': True, 'script': script}
    return {'type': 'prop', 'id': id_, 'image': image, 'x': x + 6, 'y': y + 46, 'w': 32, 'h': 14, 'ix': x, 'iy': y, 'solid': True, 'script': script}

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
      ] + [   # 꽃가루 뿜는 풀 3마리: 길 바깥 위쪽(허공, 길 윗변에 뿌리) 균등 배치 — 길에 포함되지 않음(사용자), 뿜는 타이밍은 서로 어긋나게
          {'type': 'spitter', 'id': f'spitter{i + 1}', 'image': 'assets/props/spitter.png', 'x': (W - 2) * 32 * (i + 1) // 4 - 8, 'y': 4 * 32 - 8, 'w': 16, 'h': 8, 'solid': False, 'period': 2.6, 'offset': i * 0.9, 'range': 320}
          for i in range(3)
      ]}

# ── teal2 ──
W, H = 44, 26
R0, R1 = 19, 23                 # 가로 길 5행
UPC0, UPC1 = 20, 22             # 위로 가는 길 3열 — 가운데 광장 위쪽 한가운데서 위로 (사용자: 막힌 오른쪽 길 옆이 아니라 광장 위)
WALLC = 39                      # 동상 벽 열 = 오른쪽 출구(42열)보다 3칸 왼쪽
rows = [[' '] * W for _ in range(H)]
PC0, PC1, PR0 = 13, 28, 12      # 가운데 광장(열 13~28, 행 12~광장 아래 = 길)
for r in range(R0, R1 + 1):
    for c in range(1, W - 1): rows[r][c] = g(r, c, grass_at(r, c))
for r in range(PR0, R0):
    for c in range(PC0, PC1 + 1): rows[r][c] = g(r, c, grass_at(r, c))
for r in range(1, PR0):
    for c in range(UPC0, UPC1 + 1): rows[r][c] = g(r, c, grass_at(r, c))
cliffs(rows, W, H)
TS = 0.5                                              # 이벤트 나무는 거대 나무의 반절 크기(imageScale)
TW, TH = int(240 * TS), int(264 * TS)
TX, TY = 16 * 32 - TW // 2, (PR0 + 3) * 32 + 14 - int(252 * TS)   # 광장 왼쪽 위(16열), 밑동 바닥 y = 15행+14 — 위 길(20~22열)을 막지 않게
ents = [
    {'type': 'door', 'x': 32, 'y': R0 * 32, 'w': 8, 'h': 160, 'to': 'teal1', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': UPC0 * 32, 'y': 32, 'w': 96, 'h': 8, 'to': 'teal3', 'spawn': 'from_bottom', 'sfx': False},   # 광장 위 길 끝(맵 위쪽)
    {'type': 'door', 'x': (W - 1) * 32 - 8, 'y': R0 * 32, 'w': 8, 'h': 160, 'to': 'teal_east', 'spawn': 'from_left', 'sfx': False},
]
for i in range(5):   # 동상 벽: 가로 길 5행을 두 열로 엇갈리게(겹쳐 보이지 않게) 세로로 막는다 — 홀수 번째는 한 칸 오른쪽
    col = WALLC + (i % 2)
    st = statue(f'statue_w{i + 1}', col * 32 - 6, (R0 + i) * 32 - 28, 'teal2_statue_wall', wall=True); st['unless'] = 'statues_cleared'   # 전투 뒤 미니언이 펑펑 날려버리면 사라진다
    ents.append(st)
for j, (c, r) in enumerate([(5, R0), (10, R0), (31, R0), (PC0, PR0), (PC1, PR0), (UPC0, 6), (UPC1, 9), (UPC1, 3)]):   # 깔려 있는 동상들(길 가장자리·광장 위 모서리·위 길 옆)
    ents.append(statue(f'statue_d{j + 1}', c * 32 - 6, r * 32 - 30, 'teal2_statue_look'))
ents += [
    {'type': 'prop', 'id': 'tree', 'image': 'assets/props/tree_teal.png', 'scale': TS, 'x': TX + int(88 * TS), 'y': TY + int(252 * TS) - 44, 'w': int(64 * TS), 'h': 44, 'ix': TX, 'iy': TY, 'solid': True, 'script': 'teal2_tree'},   # 이벤트 나무(똑똑), 반절 크기 — Prop 의 크기 키는 `scale`(imageScale 아님, 2026-09-10 뚫림·상호작용 불가 원인)
    {'type': 'prop', 'id': 'banana1', 'image': 'assets/props/banana.png', 'x': 25 * 32 + 2, 'y': 13 * 32 + 14, 'w': 28, 'h': 10, 'ix': 25 * 32 + 2, 'iy': 13 * 32 + 4, 'solid': False, 'script': 'teal2_banana1', 'unless': 'banana1_eaten'},   # 바나나 1개, 광장 상단
]
m2 = {'id': 'teal2', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush',
      'rows': [''.join(r) for r in rows],
      'spawns': {'from_left': {'x': 60, 'y': 21 * 32 + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 21 * 32 + 8, 'facing': 'right'},
                 'from_top': {'x': 21 * 32 + 4, 'y': 2 * 32 + 16, 'facing': 'down'}, 'landing_east': {'x': (W - 3) * 32, 'y': 21 * 32 + 8, 'facing': 'left'}},
      'meta': {'wallCol': WALLC, 'upCols': [UPC0, UPC1], 'roadRows': [R0, R1], 'plaza': [PC0, PC1, PR0, R1]},
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
# ── teal3: 위로 오르는 길 → 숲 공터 ──
W3, H3 = 34, 30
CL0, CL1, CR0, CR1 = 6, 27, 8, 21          # 공터 열 6~27, 행 8~21
UP0, UP1 = 16, 18                          # 아래 길 3열(행 22~28)
rows = [[' '] * W3 for _ in range(H3)]
leaf_at = lambda r, c: (r * 5 + c * 11) % 9 == 0
for r in range(CR0, CR1 + 1):
    for c in range(CL0, CL1 + 1): rows[r][c] = 'n' if leaf_at(r, c) else g(r, c, grass_at(r, c))
for r in range(CR1 + 1, H3 - 1):
    for c in range(UP0, UP1 + 1): rows[r][c] = g(r, c, grass_at(r, c))
cliffs(rows, W3, H3)
BOX_X, BOX_Y = 16 * 32 + 8, 14 * 32 + 8    # 공구상자 히트박스(32×16), 그림 36×26
def ftree(id_, x, y):   # 숲 나무 56×84, 줄기 밑동만 막힘(24×12)
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/tree_forest.png', 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True}
def bush(id_, x, y):    # 풀숲 56×40, 아래 절반 막힘
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/bush_teal.png', 'x': x + 4, 'y': y + 22, 'w': 48, 'h': 18, 'ix': x, 'iy': y, 'solid': True}
ents3 = [
    {'type': 'door', 'x': UP0 * 32, 'y': (H3 - 1) * 32 - 8, 'w': 96, 'h': 8, 'to': 'teal2', 'spawn': 'from_top', 'sfx': False},
    # 무기 상자(PR #7 weapon_box_open.png 64×64, 발 pivot 32,60): 밑동 40×14 만 막힘, 그림 밑변 = 히트박스 밑변 + 4. id 는 컷신 호환으로 'toolbox' 유지
    {'type': 'prop', 'id': 'toolbox', 'image': 'assets/props/weapon_box_open.png', 'x': BOX_X - 4, 'y': BOX_Y + 2, 'w': 40, 'h': 14, 'ix': BOX_X + 16 - 32, 'iy': BOX_Y + 16 - 60, 'solid': True, 'script': 'teal3_toolbox'},
]
# 숲 나무: 공터 위쪽 두 줄(빽빽이), 양옆 세로줄, 아래 모서리
tx = [(c, 6, 240) for c in range(CL0 - 1, CL1 + 1, 2)] + [(c, 7, 262) for c in range(CL0, CL1 + 1, 3)]
tx += [(CL0 - 1, r, None) for r in range(9, CR1, 2)] + [(CL1 + 1, r, None) for r in range(9, 12, 2)] + [(CL1 + 1, r, None) for r in range(17, CR1, 2)]
tx += [(c, CR1 + 1, None) for c in (CL0, CL0 + 2, CL0 + 4, CL0 + 6, CL0 + 8, CL1 - 8, CL1 - 6, CL1 - 4, CL1 - 2, CL1)]
for i, (c, r, yy) in enumerate(tx):
    ents3.append(ftree(f'ftree{i + 1}', c * 32 - 12 + ((i * 7) % 3) * 4, (yy if yy is not None else r * 32 - 40)))
for j, (c, r) in enumerate([(CL1, 13), (CL1, 15), (CL1 - 1, 12), (CL1 - 1, 16)]):   # 오른쪽 풀숲(미니언이 튀어나오는 곳)
    ents3.append(bush(f'bush{j + 1}', c * 32 - 12, r * 32 - 10))
m3 = {'id': 'teal3', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'rows': [''.join(r) for r in rows],
      'spawns': {'from_bottom': {'x': 17 * 32 + 4, 'y': (H3 - 3) * 32 + 8, 'facing': 'up'}, 'start': {'x': 17 * 32 + 4, 'y': (H3 - 3) * 32 + 8, 'facing': 'up'}, 'box': {'x': BOX_X, 'y': BOX_Y + 40, 'facing': 'up'}},
      'meta': {'box': [BOX_X, BOX_Y], 'clearing': [CL0, CL1, CR0, CR1]},
      'entities': ents3}
# ── teal_east (청록숲 4): 쭉 가는 길인데 세로로도 긴 맵 — 오른쪽 → 아래로 길게 → 오른쪽. 이벤트 3(바나나 껍질·수상한 버튼2·검은 꽃) + 걸어다니는 CS 둘 (사용자 2026-09-10)
W4, H4 = 44, 40
rows = [[' '] * W4 for _ in range(H4)]
HR0, HR1 = 4, 6                   # 위 가로 길 (행 4~6), 열 1~26
VC0, VC1 = 24, 26                 # 세로 길 (열 24~26), 행 4~35
BR0, BR1 = 33, 35                 # 아래 가로 길 (행 33~35), 열 24~42
for r in range(HR0, HR1 + 1):
    for c in range(1, VC1 + 1): rows[r][c] = g(r, c, grass_at(r, c))
for r in range(HR0, BR1 + 1):
    for c in range(VC0, VC1 + 1): rows[r][c] = g(r, c, grass_at(r, c))
for r in range(BR0, BR1 + 1):
    for c in range(VC0, W4 - 1): rows[r][c] = g(r, c, grass_at(r, c))
for r in range(HR1 + 1, HR1 + 4):                       # 버튼 주머니(위 길 아래)
    for c in range(10, 15): rows[r][c] = g(r, c, grass_at(r, c))
for r in range(18, 23):                                 # 검은 꽃 주머니(세로 길 왼쪽, 나무로 음지)
    for c in range(VC0 - 5, VC0): rows[r][c] = g(r, c, grass_at(r, c))
walk4 = [[rows[r][c] in 'tuwn' for c in range(W4)] for r in range(H4)]   # 길 둘레 2칸 숲 바닥('m') — 나무가 허공에 뜨지 않게 (2026-09-11)
for r in range(1, H4 - 1):
    for c in range(1, W4 - 1):
        if rows[r][c] == ' ' and any(walk4[r + dr][c + dc] for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2) if 0 <= r + dr < H4 and 0 <= c + dc < W4): rows[r][c] = 'm'
cliffs(rows, W4, H4)
ents4 = [
    {'type': 'door', 'x': 32, 'y': HR0 * 32, 'w': 8, 'h': 96, 'to': 'teal2', 'spawn': 'landing_east', 'sfx': False},
    {'type': 'door', 'x': (W4 - 1) * 32 - 8, 'y': BR0 * 32, 'w': 8, 'h': 96, 'to': 'teal5', 'spawn': 'from_left', 'sfx': False},
    # 1) 바나나 껍질: 위 길 한가운데, 밟으면(트리거) 미끄러짐
    {'type': 'prop', 'id': 'peel', 'image': 'assets/props/banana_peel.png', 'x': 8 * 32 + 3, 'y': 5 * 32 + 14, 'w': 26, 'h': 8, 'ix': 8 * 32 + 3, 'iy': 5 * 32 + 8, 'solid': False, 'sortY': 0},
    {'type': 'trigger', 'id': 'peel_trig', 'x': 8 * 32 + 3, 'y': 5 * 32 + 6, 'w': 26, 'h': 20, 'script': 'teal4_peel'},
    # 2) 수상한 버튼 2: 주머니 안
    {'type': 'prop', 'id': 'button2', 'image': 'assets/props/button_teal.png', 'x': 12 * 32 + 3, 'y': 8 * 32 + 6, 'solid': True, 'script': 'teal4_button'},
    # 3) 검은 꽃: 세로 길 왼쪽 주머니, 숲 나무로 둘러싸 음지
    {'type': 'prop', 'id': 'black_flower', 'image': 'assets/props/black_flower.png', 'x': 20 * 32 + 2, 'y': 20 * 32 + 20, 'w': 24, 'h': 10, 'ix': 20 * 32, 'iy': 20 * 32 + 30 - 36, 'solid': True, 'script': 'teal4_flower'},
    # 걸어다니는 CS 둘 (세로 길·아래 길). 잡으면 <맵>_<id>_defeated 로 영구 제거
    {'type': 'enemy', 'id': 'walker1', 'sprite': 'cs_red', 'x': 25 * 32, 'y': 14 * 32, 'facing': 'down', 'wander': 40, 'enemies': ['cs_red'], 'unless': 'teal_east_walker1_defeated'},
    {'type': 'enemy', 'id': 'walker2', 'sprite': 'cs_blue', 'x': 33 * 32, 'y': 34 * 32, 'facing': 'left', 'wander': 40, 'enemies': ['cs_blue'], 'unless': 'teal_east_walker2_defeated'},
]
for j, (c, r) in enumerate([(18, 17), (23, 16), (18, 23), (23, 24)]):   # 검은 꽃 주머니 둘레 숲 나무(음지)
    ents4.append(ftree(f'etree{j + 1}', c * 32 - 12, r * 32 - 40))
for j, (c, r) in enumerate([(3, HR0), (16, HR0), (30, BR0), (38, BR0)]):   # 길가 동상 몇 개
    ents4.append(statue(f'estatue{j + 1}', c * 32 - 6, r * 32 - 30, 'teal2_statue_look'))
me = {'id': 'teal_east', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': [''.join(r) for r in rows],
      'spawns': {'from_left': {'x': 60, 'y': HR0 * 32 + 40, 'facing': 'right'}, 'start': {'x': 60, 'y': HR0 * 32 + 40, 'facing': 'right'}, 'landing': {'x': (W4 - 3) * 32, 'y': BR0 * 32 + 40, 'facing': 'left'}},
      'meta': {'road': [HR0, HR1, VC0, VC1, BR0, BR1]},
      'entities': ents4}
m8 = placeholder('teal8', {'type': 'door', 'x': 32, 'y': 4 * 32, 'w': 8, 'h': 128, 'to': 'teal7', 'spawn': 'landing', 'sfx': False})   # teal5=teal5.py, teal6=teal6.py, teal7=teal7.py
maps = {'teal1': m1, 'teal2': m2, 'teal3': m3, 'teal_east': me, 'teal8': m8}
if '--check' in sys.argv:
    ok = all(json.loads(io.open(f'assets/maps/{k}.json', encoding='utf-8').read()) == v for k, v in maps.items())
    print('teal maps', 'same' if ok else 'DIFFERENT'); sys.exit(0 if ok else 1)
for k, v in maps.items(): io.open(f'assets/maps/{k}.json', 'w', encoding='utf-8').write(json.dumps(v, ensure_ascii=False, indent=1))
print('wrote teal1 (64x12), teal2 (44x26), teal3, teal_east')
