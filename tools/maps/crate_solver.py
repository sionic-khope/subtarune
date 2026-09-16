#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""상자 밀기 퍼즐 설계 솔버(BUILD193): tests/unit/youngcle-factory.test.mjs 의 minimumPushes 와 같은 규칙으로 최소 밀기 횟수·해법을 구한다.
규칙: 상자는 한 칸씩(플레이어가 반대편에 서서 C), 운반 구역 밖으로는 못 나감, 막힌 칸(벽 타일·격벽·콘솔·안내판·차단문)·다른 상자 위로는 못 밀림. 플레이어는 상자를 못 지나간다.
실행: uv run tools/maps/crate_solver.py assets/maps/youngcle15.json   (맵 JSON)
      python 모듈로: solve_layout(rows) — 설계용 ASCII(아래 형식)"""
from __future__ import annotations

import json
import sys
from collections import deque

DIRS = [(1, 0, 'R'), (-1, 0, 'L'), (0, 1, 'D'), (0, -1, 'U')]


def solve(blocked: set, crates: list, targets: set, can_occupy, start: tuple, limit: int = 600_000):
    """BFS(밀기 횟수 기준). 플레이어 위치는 도달 영역의 대표 칸(최소 좌표)으로 정규화해 상태를 줄인다.
    반환 (최소 밀기, 해법 ['AR', ...], 본 상태 수) 또는 (None, None, 본 상태 수)"""
    names = 'ABCDEFGH'

    def reach_of(player, crate_set):
        reach = {player}; walk = deque([player])
        while walk:
            x, y = walk.popleft()
            for dx, dy, _ in DIRS:
                n = (x + dx, y + dy)
                if n in blocked or n in crate_set or n in reach: continue
                reach.add(n); walk.append(n)
        return reach

    # 죽은 칸 가지치기: 발판이 아닌데 가로·세로 어느 쪽으로도 밀 수 없는 칸(모서리)에 상자가 들어가면 끝
    occ = {}
    def occupiable(c):
        if c not in occ: occ[c] = (c not in blocked) and can_occupy(*c)
        return occ[c]
    dead = set()
    for y in range(-2, 40):
        for x in range(-2, 40):
            c = (x, y)
            if not occupiable(c) or c in targets: continue
            horiz = occupiable((x - 1, y)) and occupiable((x + 1, y))
            vert = occupiable((x, y - 1)) and occupiable((x, y + 1))
            if not horiz and not vert: dead.add(c)
    cr0 = tuple(crates); r0 = reach_of(start, set(cr0))
    first = (min(r0), cr0)
    queue = deque([(first, r0)]); seen = {first: None}; pushes = {first: 0}
    while queue:
        state, reach = queue.popleft()
        if len(seen) > limit: return None, None, len(seen)
        _, cr = state
        crate_set = set(cr)
        if targets <= crate_set:
            moves = []; s = state
            while seen[s] is not None: prev, mv = seen[s]; moves.append(mv); s = prev
            return pushes[state], moves[::-1], len(seen)
        for i, (x, y) in enumerate(cr):
            for dx, dy, d in DIRS:
                stand = (x - dx, y - dy); dest = (x + dx, y + dy)
                if stand not in reach or dest in blocked or dest in crate_set or dest in dead or not can_occupy(*dest): continue
                nc = list(cr); nc[i] = dest; nc_set = set(nc)
                # 2×2 로 뭉친 상자(모두 발판 위가 아닌 한)는 다시 못 움직인다
                dx2, dy2 = dest
                if any(all(((dx2 + ox, dy2 + oy) in nc_set or not occupiable((dx2 + ox, dy2 + oy))) for ox, oy in q) and not all(((dx2 + ox, dy2 + oy) in targets) for ox, oy in q if (dx2 + ox, dy2 + oy) in nc_set)
                       for q in (((0, 0), (1, 0), (0, 1), (1, 1)), ((0, 0), (-1, 0), (0, 1), (-1, 1)), ((0, 0), (1, 0), (0, -1), (1, -1)), ((0, 0), (-1, 0), (0, -1), (-1, -1)))): continue
                nr = reach_of((x, y), nc_set)
                ns = (min(nr), tuple(nc))
                if ns in seen: continue
                seen[ns] = (state, names[i] + d); pushes[ns] = pushes[state] + 1; queue.append((ns, nr))
    return None, None, len(seen)


def solve_layout(rows: list[str]):
    """설계용 ASCII: '#' 막힘, '.' 바닥(운반 구역 밖), ',' 운반 구역, 'X' 발판, 'C' 상자(운반 구역 안), 'P' 플레이어 시작, 'D' 발판+상자"""
    blocked, crates, targets, area = set(), [], set(), set()
    start = None
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '#': blocked.add((x, y))
            if ch in ',XCD': area.add((x, y))
            if ch in 'XD': targets.add((x, y))
            if ch in 'CD': crates.append((x, y))
            if ch == 'P': start = (x, y)
    # 바깥은 전부 막힘
    h, w = len(rows), max(len(r) for r in rows)
    for y in range(-1, h + 1):
        for x in range(-1, w + 1):
            if y < 0 or y >= h or x < 0 or x >= len(rows[y]): blocked.add((x, y))
    return solve(blocked, crates, targets, lambda x, y: (x, y) in area, start)


def solve_map(data: dict):
    rows = data['rows']
    blocked = set()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch not in 'IF': blocked.add((x, y))
    for e in data['entities']:
        if e['type'] in ('factory_bulkhead', 'factory_console', 'factory_sign', 'factory_gate'):
            w, h = e.get('w', 28), e.get('h', 24)
            for y in range(len(rows)):
                for x in range(len(rows[y])):
                    cx, cy = x * 32 + 16, y * 32 + 16
                    if e['x'] <= cx < e['x'] + w and e['y'] <= cy < e['y'] + h: blocked.add((x, y))
    crates = [((e['x'] + 14) // 32, (e['y'] + 14) // 32) for e in data['entities'] if e['type'] == 'factory_crate']
    targets = {((e['x'] + 16) // 32, (e['y'] + 16) // 32) for e in data['entities'] if e['type'] == 'factory_plate'}
    area = next((e for e in data['entities'] if e['type'] == 'factory_move_area'), None)
    def can_occupy(x, y):
        if not area: return True
        l, t = x * 32 + 2, y * 32 + 2
        return l >= area['x'] and t >= area['y'] and l + 28 <= area['x'] + area['w'] and t + 28 <= area['y'] + area['h']
    sp = data['spawns']['left']
    start = ((sp['x'] + 12) // 32, (sp['y'] + 8) // 32)
    return solve(blocked, crates, targets, can_occupy, start)


if __name__ == '__main__':
    for path in sys.argv[1:]:
        n, sol, seen = solve_map(json.load(open(path, encoding='utf-8')))
        print(path, 'pushes', n, 'states', seen); print(' '.join(sol or []))
