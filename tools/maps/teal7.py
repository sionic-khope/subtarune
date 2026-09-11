# -*- coding: utf-8 -*-
"""청록숲7 (사용자 브리핑 2026-09-11): 일직선 길 + 길 중간 위쪽에 나무에 둘러싸인 어두운 은신처(주머니). 입구에서 3초쯤 걸으면 쥰희·경섭·용준 연출(teal7_hide).
은신처: 바닥은 거의 검은 그늘 땅(d) + 그 위를 shade 엔티티가 반투명 검정으로 덮어 안에 선 캐릭터가 어둠 속에 흐릿하게 보인다(델타룬 2장 어두운 문틈 참고).
  뒷벽 두 줄(11그루)·양옆 기둥(3+3그루)이 감싸고 아래(길 쪽)만 열려 있다 — 2026-09-11 사용자 "그림자 완전 어둡게, 나무가 둘러싸여 은폐하는 것처럼".
  2차 수정(같은 날 "그림자 퀄 구리고 나무를 뚫고 들어가는 것 같다"): 세 줄로 낮추고(5~7행) 숨는 줄을 뒷벽 나무 앞(y 200)으로, 트리거를 입구 앞(26열)으로, 그림자는 나무를 건드리지 않는 바닥 영역만 세로 그라데이션으로.
실행: /usr/bin/python3 tools/maps/teal7.py  (--check)
"""
import io, json, sys
W, H, T = 48, 14, 32
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'w' if (r * 7 + c * 13) % 11 == 0 else ('t' if (r + c) % 2 == 0 else 'u')
R0, R1 = 8, 10                       # 길 3줄 (256~352)
for r in range(R0, R1 + 1):
    for c in range(1, W - 1): rows[r][c] = g(r, c)
PC0, PC1, PR0, PR1 = 25, 29, 5, 7    # 은신처 바닥(d): 25~29열, 5~7행(세 줄 — 네 줄은 "세로로 너무 높다", 2026-09-11 사용자). 7행이 길과 닿는다 = 입구. 양옆 24·30열은 숲 바닥(m)에 나무 기둥이 선다
for r in range(PR0, PR1 + 1):
    for c in range(PC0, PC1 + 1): rows[r][c] = 'd'    # 그늘 땅(걸을 수 있음, 거의 검정)
    rows[r][PC0 - 1] = 'm'; rows[r][PC1 + 1] = 'm'
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
HIDE_Y = 6 * T + 8                    # 숨는 줄(y 200): 뒷벽 나무 바로 앞(밑동 172 보다 아래 → 나무 앞에 선다), 입구에서 한 줄 위
HIDE = {'left': [26 * T + 4, HIDE_Y], 'center': [27 * T + 4, HIDE_Y], 'right': [28 * T + 4, HIDE_Y], 'left_wide': [25 * T + 22, HIDE_Y], 'right_wide': [28 * T + 18, HIDE_Y]}
STAGE = {'gyeongsub': [27 * T + 4, 9 * T + 8], 'guest': [30 * T + 4, 9 * T + 8], 'edge': [(W - 1) * T + 4, 9 * T + 8],
         'back_h': [25 * T + 4, 9 * T + 8], 'back_p': [23 * T + 4, 9 * T + 28],   # 마지막 대화 자리: 경섭(27열) ← 64px → 형섭 ← 64px → 빠맨(한 단 아래, 느슨한 삼각) — 32px 간격은 "너무 붙어 있다"(2026-09-11 사용자)
         'gate_l': [26 * T + 4, 8 * T + 8], 'gate_r': [28 * T + 4, 8 * T + 8]}   # 입구 앞(길 윗줄): 먼저 여기로 온 뒤 곧장 위로 — 옆 나무를 대각선으로 뚫고 들어가지 않는다
ents = [
    {'type': 'door', 'x': 32, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'teal6', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'teal8', 'spawn': 'from_left', 'sfx': False},
    # 은신처 입구 바로 앞(26열)에 닿으면 연출 1회 — 입구에서 3.5초쯤(걷기 218px/s). "이벤트 발생 지점을 그림자 나무 앞으로"(2026-09-11 사용자)
    {'type': 'trigger', 'id': 'hide_trig', 'x': 26 * T, 'y': R0 * T, 'w': 16, 'h': 96, 'once': True, 'flag': 'teal7_hide_seen', 'script': 'teal7_hide'},
]
# 은신처를 감싸는 나무 고리 (tree_forest.png 56x84: 밑동 히트박스 y+72~84, x+16~40 → 밑동 y 로 놓는다). y 정렬은 밑동 기준: 숨는 줄(y 168, 히트박스 아래 ~184)보다 밑동이 위면 셋의 뒤, 아래면 앞에 그려진다
TREE_H = 84
def tree_base(id_, x, base_y): return ftree(id_, x, base_y - TREE_H)
ring = []
for i, x in enumerate(range(24 * T - 4, 30 * T + 5, 40)): ring.append(tree_base(f'ring_b{i}', x, 5 * T + 12))     # 뒷벽 6그루(밑동 172) — 숨는 줄(200) 바로 뒤, 화면에 다 보인다
for i, x in enumerate(range(24 * T + 16, 30 * T - 3, 40)): ring.append(tree_base(f'ring_c{i}', x, 5 * T - 8))     # 뒷벽 사이사이 5그루(한 단 위) — 빽빽하게
for i, by in enumerate((5 * T + 24, 6 * T + 28, 7 * T + 28)):                                                      # 양옆 기둥 3+3그루 — 아래 둘은 셋보다 앞이라 옆을 가린다
    ring.append(tree_base(f'ring_l{i}', 24 * T - 8, by)); ring.append(tree_base(f'ring_r{i}', 30 * T + 8, by))
# 안을 덮는 어둠(엔티티 위, src/world/world.js Shade): 뒷벽 밑동(172) 아래·양옆 나무 잎 안쪽(816~968)만 — 나무는 절대 어두워지지 않고 바닥과 숨은 사람만. 위(뒤)가 짙고 입구 쪽으로 옅어진다
SHADE = {'type': 'shade', 'id': 'hide_shade', 'x': 24 * T + 48, 'y': 5 * T + 12, 'w': 30 * T + 8 - (24 * T + 48), 'h': (PR1 + 1) * T - (5 * T + 12), 'alpha': 0.7, 'fade': 0.3}
ents += ring + [SHADE]
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
        if ground(r + 1, c): y -= T                                                   # 밑동이 길 위에 떨어지면 한 칸 올린다(레이아웃 감사)
        if any(abs(x - sx) < 34 and abs(y - sy) < 30 for (sx, sy) in seen): continue
        seen.add((x, y)); ents.append(ftree(f'st{k}', x, y)); k += 1
m = {'id': 'teal7', 'name': '청록숲', 'bgm': 'hopes', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'teal_bush', 'battleBg': 'teal', 'rows': rows,
     'preload': ['assets/sprites/junhee.png'],
     'spawns': {'from_left': {'x': 60, 'y': 9 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 9 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 9 * T + 8, 'facing': 'left'}},
     'meta': {'connected': True, 'hide': HIDE, 'stage': STAGE, 'trigger': 22 * T + 16, 'shade': [SHADE['x'], SHADE['y'], SHADE['w'], SHADE['h']], 'ring': len(ring)},
     'entities': ents}
path = 'assets/maps/teal7.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('teal7', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1)); print('wrote', path, W, 'x', H, 'trees', k + len(ring), 'ring', len(ring))
