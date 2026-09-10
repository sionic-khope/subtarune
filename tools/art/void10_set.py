# -*- coding: utf-8 -*-
"""보라맵10·11 소품: 포탈(40x60) · 거대 나무(240x264, 잎 뭉치 원 12개 + 좌상단 광원 4단 명암 + 겹침 스캘럽 + 뿌리) · 통나무(36x22).
실행: /usr/bin/python3 tools/art/void10_set.py   → assets/props/portal.png, tree_big.png, logs.png   (2026-09-10)
"""
import sys, math, random
sys.path.insert(0, 'tools/art')
from painter import Canvas, hexc
OUT = hexc('#12081f')

def filled(c, x, y): return 0 <= x < c.w and 0 <= y < c.h and c.a[y, x, 3] != 0
def outline_silhouette(c, col=OUT):
    """비어 있는 픽셀 중 채워진 픽셀과 4방향으로 닿는 것을 테두리색으로."""
    todo = []
    for y in range(c.h):
        for x in range(c.w):
            if c.a[y, x, 3] == 0 and any(filled(c, x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): todo.append((x, y))
    for (x, y) in todo: c.px(x, y, col)

def prop_portal():
    c = Canvas(40, 60)
    P = [hexc('#2a0f5a'), hexc('#5a2fb0'), hexc('#8b5cf6'), hexc('#c4b5fd'), hexc('#f5f3ff')]
    for y in range(60):
        for x in range(40):
            nx, ny = (x - 19.5) / 18.5, (y - 29.5) / 28.5
            d = math.hypot(nx, ny)
            if d > 1: continue
            ang = math.atan2(ny, nx); band = int((math.sin(ang * 1.3 + d * 7.5) + 1) * 1.49)   # 나선 0..2
            col = P[0] if d > 0.88 else ([P[1], P[2], P[3]][band] if d > 0.24 else (P[4] if d < 0.11 else P[3]))
            c.px(x, y, col)
    outline_silhouette(c)
    for (x, y) in ((3, 8), (36, 12), (2, 44), (37, 46), (19, 1), (20, 58)): c.px(x, y, P[3])   # 주변 반짝임
    return c

def prop_tree_big():
    W, H = 240, 264
    c = Canvas(W, H)
    T = [hexc('#2a1830'), hexc('#48294a'), hexc('#6a4266'), hexc('#8d5f86')]          # 줄기 어둠→밝음
    L = [hexc('#1c144d'), hexc('#2d2172'), hexc('#4536a0'), hexc('#6b5ccc'), hexc('#a89bf2')]   # 잎 어둠→밝음, 반짝
    cx, top, base = 120, 128, 252
    def half(y):
        k = (y - top) / (base - top); hw = 17 + 10 * k
        if y > base - 18: hw += (y - (base - 18)) * 1.1   # 밑동 벌어짐
        return hw
    # ── 줄기 ──
    for y in range(top, base + 1):
        hw = half(y); wob = math.sin(y * 0.09) * 1.6
        x0 = int(round(cx - hw + wob)); x1 = int(round(cx + hw + wob))
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            col = T[2] if u < 0.2 else (T[1] if u < 0.6 else T[0])
            if u > 0.1 and (x + int(math.sin(y * 0.22 + x * 0.6) * 1.5)) % 9 == 0: col = T[0]      # 껍질 세로 물결선
            if u < 0.1 and y % 7 in (0, 1): col = T[3]                                            # 왼쪽 하이라이트 점
            c.px(x, y, col)
        c.px(x0 - 1, y, OUT); c.px(x1 + 1, y, OUT)
    # ── 뿌리(양쪽 2개씩): 줄기 가장자리에서 바깥으로 낮아지는 혹 ──
    for sgn, length, h, y0 in ((-1, 34, 9, base), (1, 30, 9, base), (-1, 20, 13, base - 2), (1, 24, 12, base - 2)):
        for y in range(y0 - h, y0 + 1):
            k = (y0 - y) / h; ext = int(length * math.sqrt(max(0.0, 1 - k * k)))
            edge = int(round(cx + sgn * (half(y) + 1)))
            xs = range(edge, edge + sgn * ext, sgn) if ext else []
            for x in xs:
                c.px(x, y, T[0] if y >= y0 - 1 else (T[2] if sgn < 0 else T[1]))
            if ext: c.px(edge + sgn * ext, y, OUT)
            if y == y0 - h:
                for x in xs: c.px(x, y, OUT)
    for x in range(cx - 60, cx + 61): c.px(x, base + 1, OUT) if filled(c, x, base) else None
    # ── 잎 뭉치(원) — 뒤에서 앞 순서 ──
    circles = [(120, 108, 84), (60, 124, 56), (180, 122, 58), (86, 62, 52), (154, 58, 54), (120, 34, 44),
               (40, 90, 42), (200, 88, 44), (26, 140, 32), (214, 142, 32), (74, 152, 38), (166, 154, 38),
               (110, 176, 24), (148, 178, 22), (46, 168, 18), (196, 170, 18)]
    owner = {}
    for i, (ccx, ccy, r) in enumerate(circles):
        for y in range(max(0, ccy - r), min(H, ccy + r + 1)):
            for x in range(max(0, ccx - r), min(W, ccx + r + 1)):
                if (x - ccx) ** 2 + (y - ccy) ** 2 <= r * r: owner[(x, y)] = i
    rnd = random.Random(7)
    TH = (-0.55, -0.05, 0.45)
    for (x, y), i in owner.items():
        ccx, ccy, r = circles[i]
        nx, ny = (x - ccx) / r, (y - ccy) / r
        light = 0.95 - math.hypot(nx + 0.32, ny + 0.42) * 1.15   # 좌상단 광원에서 멀수록 어둡게(구 느낌)
        band = sum(1 for t in TH if light > t)
        if band < 3 and light > TH[band] - 0.09 and (x + y) % 2 == 0: band += 1    # 경계 디더
        col = L[band]
        if band == 3 and rnd.random() < 0.05: col = L[4]
        c.px(x, y, col)
    # 겹침 스캘럽: 앞 원의 아래쪽 가장자리가 뒤 원 위에 놓이면 어두운 선
    for i, (ccx, ccy, r) in enumerate(circles):
        for y in range(max(0, ccy - r - 2), min(H, ccy + r + 3)):
            for x in range(max(0, ccx - r - 2), min(W, ccx + r + 3)):
                d = math.hypot(x - ccx, y - ccy)
                if r < d <= r + 1.4 and (y - ccy) / r > -0.3 and owner.get((x, y), 99) < i: c.px(x, y, L[0])
    outline_silhouette(c)
    return c

def prop_logs():
    c = Canvas(36, 22)
    B = [hexc('#4e2e18'), hexc('#7a4a2a'), hexc('#a06a3a')]; G = [hexc('#c9a06a'), hexc('#8a5a30')]
    def log(x, y):
        c.rrect_outlined(x, y, 17, 11, B[1], OUT, 3); c.hline(x + 2, y + 2, 12, B[2]); c.hline(x + 2, y + 8, 12, B[0])
        c.rrect_outlined(x + 11, y + 1, 6, 9, G[0], OUT, 3); c.px(x + 13, y + 4, G[1]); c.px(x + 14, y + 5, G[1]); c.px(x + 13, y + 6, G[1])
    log(0, 10); log(18, 10); log(9, 0)
    return c

if __name__ == '__main__':
    prop_tree_big().save('assets/props/tree_big.png'); prop_logs().save('assets/props/logs.png')   # 포탈은 안 쓴다(사용자: 진짜 포탈 UI 를 원한 게 아님) — 함수만 남김
    print('void10 props ok')
