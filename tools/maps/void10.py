# -*- coding: utf-8 -*-
"""보라맵10 미로 생성기 (사용자 브리핑 2026-09-10: "보라색 땅 미로, 대각선 아래가 목표, 걷기만, 중간중간 표지판 5개").
셀 15×11(통로 2타일·벽 1타일 = 46×34 타일), 되돌아가기(recursive backtracker) 미로. 시드는 정답 길이 30~45셀이 되는 것을 고른다.
표지판 5개는 정답 길 옆(그래프 거리 ≤2) 막다른 셀에, 진행 순서대로 1→5 (5번 "나갈 수 없어" 가 출구에 가장 가깝다).
출구 = 오른쪽 아래 셀의 포탈(그림, 겹쳐 그려짐) + 밟는 문 → void11. 도착 컷신용 쥰희·경섭 NPC 는 `unless: void10_intro`.
실행: /usr/bin/python3 tools/maps/void10.py  (--check 는 기존과 동일한지만)
"""
import io, json, sys, random
from collections import deque
CW, CH = 15, 11
W, H = CW * 3 + 1, CH * 3 + 1
START, GOAL = (0, 0), (CW - 1, CH - 1)

def gen(seed):
    rnd = random.Random(seed)
    seen = {START}; stack = [START]; adj = {(c, r): set() for c in range(CW) for r in range(CH)}
    while stack:
        c, r = stack[-1]
        nb = [(c + dx, r + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= c + dx < CW and 0 <= r + dy < CH and (c + dx, r + dy) not in seen]
        if not nb: stack.pop(); continue
        n = rnd.choice(nb); seen.add(n); adj[(c, r)].add(n); adj[n].add((c, r)); stack.append(n)
    return adj

def bfs(adj, src):
    dist = {src: 0}; prev = {}; q = deque([src])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in dist: dist[v] = dist[u] + 1; prev[v] = u; q.append(v)
    return dist, prev

seed = 1
while True:
    adj = gen(seed); dist, prev = bfs(adj, START)
    path = [GOAL]
    while path[-1] != START: path.append(prev[path[-1]])
    path.reverse()
    if 30 <= len(path) <= 45:
        onpath = {cell: i for i, cell in enumerate(path)}
        dead = [cell for cell, ns in adj.items() if len(ns) == 1 and cell not in (START, GOAL)]
        cands = []
        for d in dead:
            dd, _ = bfs(adj, d)
            near = min(((dd[cell], i) for cell, i in onpath.items()), key=lambda t: (t[0], t[1]))
            if 1 <= near[0] <= 2: cands.append((near[1], d))
        cands.sort()
        # 진행 순서대로 5개: 진행 간격 ≥ 정답길이/7, 서로 맨해튼 거리 ≥ 4 셀 (미로 전체에 흩어지게)
        picks = []
        for prog, d in cands:
            if picks and prog - picks[-1][0] < len(path) / 7: continue
            if any(abs(d[0] - o[0]) + abs(d[1] - o[1]) < 4 for _, o in picks): continue
            picks.append((prog, d))
            if len(picks) == 5: break
        if len(picks) == 5: break
    seed += 1
signs = [d for _, d in picks]

rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'x' if (r + c) % 2 == 0 else 'X'
for (c, r), ns in adj.items():
    for tr in (1 + 3 * r, 2 + 3 * r):
        for tc in (1 + 3 * c, 2 + 3 * c): rows[tr][tc] = g(tr, tc)
    for (nc, nr) in ns:
        if nc == c + 1:
            for tr in (1 + 3 * r, 2 + 3 * r): rows[tr][3 * c + 3] = g(tr, 3 * c + 3)
        if nr == r + 1:
            for tc in (1 + 3 * c, 2 + 3 * c): rows[3 * r + 3][tc] = g(3 * r + 3, tc)
for r in range(1, H):
    for c in range(W):
        if rows[r][c] == ' ' and rows[r - 1][c] != ' ': rows[r][c] = 'y'   # 땅 아래 절벽면
rows = [''.join(r) for r in rows] + [' ' * W] * 4   # 아래 여백 4행: 출구 컷신 때 카메라가 더 내려가 두 사람이 대화창 위에 보인다

def tile_px(tc, tr): return (tc * 32 + 4, tr * 32 + 16)
SIGN_SCRIPTS = ['void10_sign1', 'void10_sign2', 'void10_sign3', 'void10_sign4', 'void10_sign5']
ents = []
for i, (c, r) in enumerate(signs):
    (nc, nr) = next(iter(adj[(c, r)]))
    # 입구 반대쪽 타일에 세운다 (막다른 셀 2×2 중)
    tc = 2 + 3 * c if nc <= c else 1 + 3 * c
    tr = 1 + 3 * r if nr >= r else 2 + 3 * r
    if nc != c: tr = 1 + 3 * r
    ents.append({'type': 'prop', 'id': f'sign{i + 1}', 'image': 'assets/props/signpost.png', 'x': tc * 32 + 3, 'y': tr * 32 + 2, 'solid': True, 'script': SIGN_SCRIPTS[i]})
gc, gr = GOAL
PX, PY = (2 + 3 * gc) * 32 - 4, (1 + 3 * gr) * 32 + 32 - 60     # 포탈 그림 40×60, 셀 오른쪽 위 타일 바닥에 맞춤
ents += [
    {'type': 'prop', 'id': 'portal', 'image': 'assets/props/portal.png', 'x': PX, 'y': PY, 'w': 40, 'h': 60, 'ix': PX, 'iy': PY, 'solid': False, 'sortY': 100000},   # 항상 캐릭터 위에 — 들어가면 가려진다
    {'type': 'door', 'x': PX, 'y': PY + 34, 'w': 40, 'h': 26, 'to': 'void11', 'spawn': 'start', 'sfx': 'whoosh'},
    {'type': 'npc', 'id': 'junhee', 'sprite': 'junhee', 'x': (1 + 3 * gc) * 32 + 2, 'y': (1 + 3 * gr) * 32 + 16, 'facing': 'right', 'wander': 0, 'unless': 'void10_intro'},
    {'type': 'npc', 'id': 'gyeongsub', 'sprite': 'gyeongsub', 'x': (1 + 3 * gc) * 32 - 20, 'y': (2 + 3 * gr) * 32 + 12, 'facing': 'right', 'wander': 0, 'unless': 'void10_intro'},
    {'type': 'door', 'x': 32, 'y': 32, 'w': 6, 'h': 64, 'to': 'void9', 'spawn': 'landing', 'sfx': False},
]
sx, sy = tile_px(1, 1)
m = {'id': 'void10', 'name': '???', 'bgm': 'scarlet', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'purple_fire',
     'enter': {'script': 'void10_intro', 'flag': 'void10_intro'},
     'rows': rows,
     'spawns': {'from_left': {'x': sx + 8, 'y': sy, 'facing': 'right'}, 'start': {'x': sx + 8, 'y': sy, 'facing': 'right'},
                'goal': {'x': (1 + 3 * gc) * 32 + 4, 'y': (2 + 3 * gr) * 32 + 12, 'facing': 'left'}},
     'meta': {'seed': seed, 'pathCells': len(path), 'signs': signs, 'startTile': [1, 1], 'goalTile': [2 + 3 * gc, 1 + 3 * gr]},
     'entities': ents}
path_ = 'assets/maps/void10.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path_, encoding='utf-8').read()); print('void10', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path_, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
print('wrote', path_, W, 'x', H + 4, 'seed', seed, 'path', len(path), 'cells; signs', signs)
