# -*- coding: utf-8 -*-
"""보라맵10 미로 생성기 (사용자 브리핑 2026-09-10: "보라색 땅 미로, 대각선 아래가 목표, 걷기만, 중간중간 표지판 5개").
셀 15×11(통로 2타일·벽 1타일 = 46×34 타일), 되돌아가기(recursive backtracker) 미로 — **직진 2셀 이상이면 꺾는 쪽 우선**(사용자: "미로 치고는 길이 그대로 이어져 있다").
시드는 **정답이 꼬인** 것을 고른다(사용자 "오른쪽으로 쭉 가다 내려가면 도착이라 쉽다 → 더 꼬아서 어렵게"): 정답 55~75셀, 최대 직진 3셀, 왼쪽으로 8칸·위로 6칸 이상 되돌아감, 맨 윗줄·맨 오른쪽 열은 5셀 이하, 가운데 구역(3~11열·2~8행)을 12셀 이상 지남.
표지판 5개는 정답 길 옆(그래프 거리 ≤2) 막다른 셀에, 진행 순서대로 1→5 (5번 "나갈 수 없어" 가 출구에 가장 가깝다).
출구 = 오른쪽 아래 셀이 맵 오른쪽 가장자리까지 열려 있고 가장자리를 밟으면 void11 (포탈 그림 없음 — 사용자: "진짜 포탈 UI 를 만들라는 건 아니었다"). 컷신의 쥰희·경섭은 가장자리 밖으로 걸어 나가 사라진다. NPC 는 `unless: void10_intro`.
실행: /usr/bin/python3 tools/maps/void10.py  (--check 는 기존과 동일한지만)
"""
import io, json, sys, random
from collections import deque
CW, CH = 15, 11
W, H = CW * 3 + 1, CH * 3 + 1
EXT = 4                                   # 출구 오른쪽으로 이어지는 바닥(막힌 땅 'Z') — 쥰희·경섭이 화면 밖으로 걸어 나갈 때 공중부양처럼 보이지 않게 (사용자 2026-09-10)
START, GOAL = (0, 0), (CW - 1, CH - 1)

def gen(seed):
    rnd = random.Random(seed)
    seen = {START}; stack = [(START, None, 0)]; adj = {(c, r): set() for c in range(CW) for r in range(CH)}   # (셀, 들어온 방향, 직진 횟수)
    while stack:
        (c, r), d, run = stack[-1]
        nb = [((c + dx, r + dy), (dx, dy)) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= c + dx < CW and 0 <= r + dy < CH and (c + dx, r + dy) not in seen]
        if not nb: stack.pop(); continue
        turns = [n for n in nb if n[1] != d]
        pool = turns if (run >= 2 and turns) else nb                       # 직진 2셀 이상이면 반드시 꺾는다
        if len(pool) > 1 and any(n[1] == d for n in pool) and rnd.random() < 0.6: pool = [n for n in pool if n[1] != d]   # 그 전에도 60% 는 꺾는다
        n, nd = rnd.choice(pool)
        seen.add(n); adj[(c, r)].add(n); adj[n].add((c, r)); stack.append((n, nd, run + 1 if nd == d else 1))
    return adj

def winding_ok(path):
    """정답이 가장자리를 타지 않고 한가운데를 여러 번 오가는가"""
    if not (55 <= len(path) <= 75) or max_straight(path) > 3: return False
    left = sum(1 for a, b in zip(path, path[1:]) if b[0] < a[0]); up = sum(1 for a, b in zip(path, path[1:]) if b[1] < a[1])
    if left < 8 or up < 6: return False
    if sum(1 for c in path if c[1] == 0) > 5 or sum(1 for c in path if c[0] == CW - 1) > 5: return False
    return sum(1 for c in path if 3 <= c[0] <= 11 and 2 <= c[1] <= 8) >= 12

def max_straight(path):
    best = run = 1
    for i in range(2, len(path)):
        d1 = (path[i - 1][0] - path[i - 2][0], path[i - 1][1] - path[i - 2][1]); d2 = (path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
        run = run + 1 if d1 == d2 else 1; best = max(best, run)
    return best

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
    if winding_ok(path):
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

rows = [[' '] * (W + EXT) for _ in range(H)]
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
_gr = CH - 1
for r in (1 + 3 * _gr, 2 + 3 * _gr):
    for c in range(W - 1, W + EXT): rows[r][c] = 'Z'                        # 출구 셀 → 맵 오른쪽 끝까지 땅처럼 보이는 막힌 길
for c in range(W - 1, W + EXT): rows[3 + 3 * _gr][c] = 'y'
rows = [''.join(r) for r in rows] + [' ' * (W + EXT)] * 4   # 아래 여백 4행: 출구 컷신 때 카메라가 더 내려가 두 사람이 대화창 위에 보인다

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
R0, R1 = 1 + 3 * gr, 2 + 3 * gr
# 출구: 셀의 오른쪽 끝(맵 가장자리 열 바로 안쪽)을 밟으면 다음 맵. 가장자리 열은 다른 맵처럼 비워 둔다(맵 규칙 '옆줄')
EDGE = (W - 1) * 32                                   # 걸을 수 있는 오른쪽 끝
ents += [
    {'type': 'door', 'x': EDGE - 10, 'y': R0 * 32, 'w': 10, 'h': 64, 'to': 'void11', 'spawn': 'start', 'sfx': False},
    {'type': 'npc', 'id': 'gyeongsub', 'sprite': 'gyeongsub', 'x': (1 + 3 * gc) * 32 - 28, 'y': R0 * 32 + 14, 'facing': 'right', 'wander': 0, 'unless': 'void10_intro'},   # 쥰희와 중심 거리 ~75px (겹치지 않게), 둘 다 화면 안
    {'type': 'npc', 'id': 'junhee', 'sprite': 'junhee', 'x': (1 + 3 * gc) * 32 + 44, 'y': R1 * 32 + 8, 'facing': 'right', 'wander': 0, 'unless': 'void10_intro'},
    {'type': 'door', 'x': 32, 'y': 32, 'w': 6, 'h': 64, 'to': 'void9', 'spawn': 'landing', 'sfx': False},
]
sx, sy = tile_px(1, 1)
m = {'id': 'void10', 'name': '???', 'bgm': 'scarlet', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'purple_fire',
     'enter': {'script': 'void10_intro', 'flag': 'void10_intro'},
     'rows': rows,
     'spawns': {'from_left': {'x': sx + 8, 'y': sy, 'facing': 'right'}, 'start': {'x': sx + 8, 'y': sy, 'facing': 'right'},
                'goal': {'x': EDGE - 44, 'y': R1 * 32 + 8, 'facing': 'left'}},
     'meta': {'seed': seed, 'pathCells': len(path), 'signs': [list(x) for x in signs], 'startTile': [1, 1], 'goalTile': [W + EXT - 2, R0], 'exitX': (W + EXT) * 32},
     'entities': ents}
path_ = 'assets/maps/void10.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path_, encoding='utf-8').read()); print('void10', 'same' if cur == m else 'DIFFERENT'); sys.exit(0 if cur == m else 1)
io.open(path_, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
print('wrote', path_, W + EXT, 'x', H + 4, 'seed', seed, 'path', len(path), 'cells; signs', signs)
