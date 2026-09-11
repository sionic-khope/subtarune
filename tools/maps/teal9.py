# -*- coding: utf-8 -*-
"""청록숲9 고대 사원 길 (사용자 브리핑 2026-09-11): 오른쪽으로 쭉 가는 일직선 길. 청록숲인데 뒤로 갈수록 고대 사원의 돌 바닥(판석)·기둥·석등·돌덩이가 늘고, 끝에 사원 문(아치).
  끝은 세로로 넓은 광장(4~12행): 오른쪽 끝에 거대한 사원 돌문(옆면, 96×288, 닫힘/열림 두 장)이 서 있고 그 앞을 2.6배 크기의 레드·블루(적군이지만 NPC — 말 걸면 대화 연출 뒤 전투, teal9_boss.js)가 위아래로 엇갈려 막는다.
  이기면 둘이 사라지고 닫힌 문도 사라져(unless) 열린 통로로 → teal10 자리표시. (2026-09-11 사용자: "두 배로 크게, 맵을 세로로 늘려, 사원 돌문이 옆면으로 막고 있게")
  레드·블루 스프라이트는 사용자 PR 로 온다 — 그때까지 청록숲3 CS 정면 그림(cs-red/blue-front) 을 쓴다.
실행: /usr/bin/python3 tools/maps/teal9.py  (--check)
"""
import io, json, sys
W, H, T = 56, 18, 32                 # 세로로 늘렸다(사용자 2026-09-11): 끝의 광장에 거대한 문지기 둘이 위아래로 선다
R0, R1 = 6, 8                        # 길 3줄 (y 192~288)
PLAZA_C, PR0, PR1 = 44, 4, 12        # 이 열부터 광장(4~12행, 9줄) — 오른쪽 끝 거대한 사원 돌문(옆면) 앞을 레드·블루가 막는다
STONE_C = 20                         # 이 열부터 판석 바닥(그 앞 4칸은 땅·판석 섞임)
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'w' if (r * 7 + c * 13) % 11 == 0 else ('t' if (r + c) % 2 == 0 else 'u')
def stone(r, c): return 'R' if (r * 5 + c * 11) % 7 == 0 else 'r'
for r in range(R0, R1 + 1):
    for c in range(1, PLAZA_C):
        if c >= STONE_C: rows[r][c] = stone(r, c)
        elif c >= STONE_C - 4: rows[r][c] = stone(r, c) if (r + c) % 3 == 0 else g(r, c)   # 섞이는 구간
        else: rows[r][c] = g(r, c)
for r in range(PR0, PR1 + 1):
    for c in range(PLAZA_C, W - 1): rows[r][c] = stone(r, c)                           # 광장(판석)
for (r, c) in ((7, 5), (6, 11), (8, 14)): rows[r][c] = 'n'                           # 낙엽(숲 구간)
walk = [[rows[r][c] in 'tuwnrR' for c in range(W)] for r in range(H)]
for r in range(1, H - 1):
    for c in range(1, W - 1):
        if rows[r][c] == ' ' and any(walk[r + dr][c + dc] for dr in (-2, -1, 0, 1, 2) for dc in (-2, -1, 0, 1, 2) if 0 <= r + dr < H and 0 <= c + dc < W): rows[r][c] = 'm'
for r in range(1, H):
    for c in range(W):
        if rows[r][c] == ' ' and rows[r - 1][c] in 'tuwnrRm': rows[r][c] = 'v'
rows = [''.join(r) for r in rows]

def ftree(id_, x, y):
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/tree_forest.png', 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True}
def pillar(id_, x, base_y):          # pillar.png 24x72, 밑동 히트박스 20x10 (받침)
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/pillar.png', 'x': x + 2, 'y': base_y - 10, 'w': 20, 'h': 10, 'ix': x, 'iy': base_y - 72, 'solid': True}
def pillar_broken(id_, x, base_y):   # 24x40
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/pillar_broken.png', 'x': x + 2, 'y': base_y - 10, 'w': 20, 'h': 10, 'ix': x, 'iy': base_y - 40, 'solid': True}
def lantern(id_, x, base_y):         # 20x44
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/stone_lantern.png', 'x': x + 2, 'y': base_y - 6, 'w': 16, 'h': 6, 'ix': x, 'iy': base_y - 44, 'solid': True, 'script': 'teal9_lantern'}
def block(id_, x, base_y):           # 30x22
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/stone_block.png', 'x': x + 1, 'y': base_y - 8, 'w': 28, 'h': 8, 'ix': x, 'iy': base_y - 22, 'solid': True, 'script': 'teal9_block'}
# 연출 자리(컷신은 meta 로 읽는다): 파티는 광장 입구 길(42열)에서 위에서부터 세로로 정렬(간격 36px). 레드(위·오른쪽)·블루(아래·왼쪽)는 문 앞에 엇갈려 선다 — 그림 2.6배(238px)라 위아래로 벌린다
STAGE = {'h': [42 * T + 4, 6 * T], 'g': [42 * T + 4, 6 * T + 36], 'p': [42 * T + 4, 6 * T + 72],   # 맨 아래(빠맨) 히트박스가 길 아랫줄(8행) 안에 들어와야 freeSpot 이 밀어 올리지 않는다
         'red': [51 * T + 4, 6 * T], 'blue': [47 * T + 4, 9 * T],
         'red_aside': [51 * T + 4, PR0 * T + 4], 'blue_aside': [46 * T + 4, PR0 * T + 4]}   # 승리 뒤 위로 비켜선 자리(광장 맨 윗줄 안 — 히트박스가 걸을 수 있는 칸에 있어야 연결성 감사를 통과, 아래를 본다)
DOOR = {'x': 52 * T + 16, 'y': PR0 * T, 'w': 96, 'h': 288}                                 # 거대한 사원 돌문(옆면) 96×288 — 광장 오른쪽 끝 4~12행
ents = [
    {'type': 'door', 'x': 32, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'teal8', 'spawn': 'landing', 'sfx': False},
    # 출구: 돌문 안 통로(닫힌 문이 있는 동안은 막혀 있다). 이기면 닫힌 문이 사라지고 열린 문(어두운 통로)이 드러난다
    {'type': 'door', 'x': 53 * T + 8, 'y': 7 * T, 'w': 24, 'h': 96, 'to': 'teal10', 'spawn': 'from_left', 'sfx': False},
    # 거대한 사원 돌문(옆면): 열린 문은 항상 뒤에 깔려 있고(충돌 없음), 닫힌 문이 그 위에 덮여 길을 막는다(solid, 이기면 unless 로 사라짐). 둘 다 sortY 0 = 캐릭터 뒤
    {'type': 'prop', 'id': 'door_open', 'image': 'assets/props/temple_door_open.png', 'x': DOOR['x'], 'y': DOOR['y'], 'w': DOOR['w'], 'h': DOOR['h'], 'ix': DOOR['x'], 'iy': DOOR['y'], 'solid': False, 'sortY': 0},
    {'type': 'prop', 'id': 'door_closed', 'image': 'assets/props/temple_door.png', 'x': DOOR['x'], 'y': DOOR['y'], 'w': DOOR['w'], 'h': DOOR['h'], 'ix': DOOR['x'], 'iy': DOOR['y'], 'solid': True, 'sortY': 0, 'unless': 'teal9_boss_won'},
    # 레드·블루(2.6배 거대): 문 앞에 위·아래로 엇갈려 선다. 히트박스 40x40(발 밑). 말 걸면 teal9_boss. 이기면 영구 제거
    {'type': 'npc', 'id': 'red', 'sprite': 'red', 'x': STAGE['red'][0], 'y': STAGE['red'][1], 'w': 40, 'h': 40, 'facing': 'left', 'wander': 0, 'script': 'teal9_boss', 'unless': 'teal9_boss_won'},
    {'type': 'npc', 'id': 'blue', 'sprite': 'blue', 'x': STAGE['blue'][0], 'y': STAGE['blue'][1], 'w': 40, 'h': 40, 'facing': 'left', 'wander': 0, 'script': 'teal9_boss', 'unless': 'teal9_boss_won'},
    # 시험 뒤(다시 들어왔을 때): 둘은 위로 비켜서 아래를 본다 — 연출 끝 자리와 같다(STAGE red_aside/blue_aside)
    {'type': 'npc', 'id': 'red_aside', 'sprite': 'red', 'x': STAGE['red_aside'][0], 'y': STAGE['red_aside'][1], 'w': 40, 'h': 40, 'facing': 'down', 'wander': 0, 'script': 'teal9_red_after', 'requires': 'teal9_boss_won'},
    {'type': 'npc', 'id': 'blue_aside', 'sprite': 'blue', 'x': STAGE['blue_aside'][0], 'y': STAGE['blue_aside'][1], 'w': 40, 'h': 40, 'facing': 'down', 'wander': 0, 'script': 'teal9_blue_after', 'requires': 'teal9_boss_won'},
]
# 사원 소품: 판석 구간 길 양옆(숲 바닥 m 위)에 기둥·부서진 기둥·석등을 번갈아, 길 위에 돌덩이 둘
for i, c in enumerate(range(STONE_C + 2, PLAZA_C - 1, 5)):
    top_y, bot_y = R0 * T - 6, (R1 + 1) * T + 4   # 밑동 히트박스가 길 가장자리에 닿아야 C 프로브(0.6타일)에 잡힌다 — 아랫줄 밑동은 길 아래 4px
    kind = i % 3
    if kind == 0: ents.append(pillar(f'pil_t{i}', c * T + 4, top_y)); ents.append(pillar(f'pil_b{i}', c * T + 4, bot_y))
    elif kind == 1: ents.append(pillar_broken(f'pbk_t{i}', c * T + 4, top_y)); ents.append(pillar(f'pil_b{i}', c * T + 4, bot_y))
    else: ents.append(lantern(f'lan_t{i}', c * T + 6, top_y)); ents.append(lantern(f'lan_b{i}', c * T + 6, bot_y))
ents.append(block('blk1', 27 * T + 2, 8 * T + 24)); ents.append(block('blk2', 39 * T + 2, 6 * T + 24))
for j, (c, r) in enumerate(((45, PR0), (49, PR0), (45, PR1 + 1), (49, PR1 + 1))): ents.append(pillar(f'plz_{j}', c * T + 4, r * T + (10 if r == PR0 else 4)))   # 광장 위·아래 가장자리 기둥
# 숲 나무: 판석 구간 전(숲)에는 빽빽하게, 판석 구간엔 드물게
grid = [list(r) for r in rows]
def ground(r, c): return 0 <= r < H and 0 <= c < W and grid[r][c] in 'tuwnrR'
spots = []
for r in range(1, H - 2):
    for c in range(1, W - 2):
        if grid[r][c] != 'm': continue
        near = any(ground(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
        dense = c < STONE_C
        if near and (r * 5 + c * 3) % (4 if dense else 9) == 0: spots.append((r, c))
        elif not near and (r * 11 + c * 7) % (9 if dense else 17) == 0: spots.append((r, c))
seen = set()
for j, (r, c) in enumerate(spots):
    x, y = c * T - 12, r * T - 40
    if ground(r + 1, c): y -= T                                                       # 밑동 히트박스(그림 y+72 = 한 칸 아래)가 길 위에 떨어지면 한 칸 올린다 — 나무 밑동은 길 밖(2026-09-11 문 구간 2줄 길이 막히던 버그)
    if any(abs(x - sx) < 34 and abs(y - sy) < 30 for (sx, sy) in seen): continue
    if any(abs(x - e.get('ix', -999)) < 40 and abs(y - e.get('iy', -999)) < 60 for e in ents if e['type'] == 'prop' and not e['id'].startswith('jt')): continue   # 사원 소품·문과 겹치지 않게
    seen.add((x, y)); ents.append(ftree(f'jt{j}', x, y))
m = {'id': 'teal9', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': rows,
     'spawns': {'from_left': {'x': 60, 'y': 7 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 7 * T + 8, 'facing': 'right'}, 'landing': {'x': 50 * T, 'y': 8 * T + 8, 'facing': 'left'},
                'gate': {'x': 42 * T, 'y': 7 * T + 8, 'facing': 'right'}},
     'meta': {'connected': True, 'stage': STAGE, 'stone_from': STONE_C, 'plaza': [PLAZA_C, PR0, W - 2, PR1], 'door': DOOR, 'trees': len([e for e in ents if e.get('id', '').startswith('jt')])},
     'entities': ents}
path = 'assets/maps/teal9.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('teal9', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H, 'trees', m['meta']['trees'], 'props', len([e for e in ents if e['type'] == 'prop']))
