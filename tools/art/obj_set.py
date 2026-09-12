# -*- coding: utf-8 -*-
"""옵젝영역(obj0~) 타일·소품 (사용자 브리핑 2026-09-11: "물이 깊진 않은데 물이 있는 바닥"(롤 정글 강 참고 이미지 — 청록빛 물, 잔물결, 수련잎) + "더 울창한 초록숲, 보라색도 살짝").
타일 32px: water_shallow / water_shallow2(걸을 수 있는 얕은 물, 바닥이 비쳐 보이는 청록) / water_shallow_pad(수련잎) / forest_floor_obj(막힘, 짙은 초록 + 보라 이끼) / cliff_obj(절벽면).
소품: tree_obj.png 56x84(울창한 초록 나무, 보라 꽃 몇 점) / tree_obj_purple.png(보라 잎 나무 — 넷에 하나꼴로 섞는다).
실행: /usr/bin/python3 tools/art/obj_set.py → assets/tiles/*.png, assets/props/tree_obj*.png
"""
import sys, math
sys.path.insert(0, 'tools/art')
from painter import Canvas, hexc
from teal_set import outline_silhouette
T = 32
W0 = hexc('#1a5561'); W1 = hexc('#1f6169'); W2 = hexc('#164b56'); W3 = hexc('#236b69')       # 물(청록) 기본·조금 밝음(바닥 비침)·어둠·초록끼
RIP = hexc('#3f97a4'); RIP_L = hexc('#6fc7cf'); GLINT = hexc('#b8eef0'); PEB = hexc('#2b6b5c')   # 잔물결·밝은 물결·반짝·바닥 자갈
F0 = hexc('#0f2f18'); F1 = hexc('#143d1f'); F2 = hexc('#0b2411'); FP = hexc('#3a2150'); FP2 = hexc('#52307a'); FL = hexc('#2f6a3a')   # 숲 바닥(초록) + 보라 이끼
OUT = hexc('#04140a')

def tile_water(variant=0):
    """얕은 물: 청록 바탕에 바닥이 비치는 밝은 조각(불규칙 덩어리) + 잔물결 호 2~3개 + 반짝 1~2점"""
    c = Canvas(T, T); c.rect(0, 0, T, T, W0)
    blobs = [(6, 8, 7, 4), (22, 20, 8, 5), (14, 26, 6, 3)] if variant == 0 else [(20, 6, 8, 4), (5, 20, 7, 5), (26, 28, 5, 3)]
    for (cx, cy, rx, ry) in blobs:                                                       # 바닥이 비쳐 보이는 밝은 조각
        for y in range(T):
            for x in range(T):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1: c.px(x, y, W1 if (x + y) % 3 else W3)
    darks = [(28, 4, 3, 2), (2, 30, 4, 2)] if variant == 0 else [(10, 2, 4, 2), (30, 16, 3, 3)]
    for (cx, cy, rx, ry) in darks:
        for y in range(T):
            for x in range(T):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1: c.px(x, y, W2)
    arcs = [(10, 14, 9, 0.9, 2.6), (24, 8, 6, 3.4, 5.2), (20, 25, 7, 3.9, 5.6)] if variant == 0 else [(14, 10, 8, 3.2, 5.0), (8, 24, 6, 0.4, 2.0), (26, 18, 7, 1.1, 2.8)]
    for (cx, cy, r, a0, a1) in arcs:                                                     # 잔물결 호(얇은 곡선)
        a = a0
        while a <= a1:
            x, y = int(round(cx + math.cos(a) * r)), int(round(cy + math.sin(a) * r * 0.55))
            c.px(x, y, RIP_L if abs(a - (a0 + a1) / 2) < 0.35 else RIP); a += 0.12
    for (x, y) in ([(17, 5), (3, 19)] if variant == 0 else [(29, 9), (12, 29)]): c.px(x, y, GLINT)
    for (x, y) in ([(9, 30), (26, 13)] if variant == 0 else [(4, 6), (21, 22)]): c.px(x, y, PEB); c.px(x + 1, y, PEB)
    return c

def tile_water_pad():
    """수련잎이 뜬 얕은 물: 물 타일 위에 초록 둥근 잎(한쪽 V 자 틈) + 작은 보라 꽃 하나"""
    c = tile_water(1)
    P0, P1, P2 = hexc('#2f7a34'), hexc('#3f9a44'), hexc('#1e5a24')
    cx, cy, r = 19, 15, 8
    for y in range(T):
        for x in range(T):
            dx, dy = x - cx, (y - cy) / 0.8
            if dx * dx + dy * dy <= r * r:
                if dx > 0 and abs(dy) < dx * 0.45: continue                                  # 오른쪽 V 자 틈
                c.px(x, y, P1 if (y < cy - 1 and x < cx + 2) else P0)
    for y in range(T):                                                                     # 잎 가장자리 어두운 선
        for x in range(T):
            if tuple(c.a[y, x, :3]) in (P0, P1) and any(0 <= x + dx < T and 0 <= y + dy < T and tuple(c.a[y + dy, x + dx, :3]) not in (P0, P1, P2) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): c.px(x, y, P2)
    c.px(12, 12, hexc('#c07ad8')); c.px(13, 12, hexc('#e6b3f5')); c.px(12, 13, hexc('#9a4fb8')); c.px(13, 13, hexc('#c07ad8'))   # 보라 꽃
    return c

def tile_forest_floor():
    """숲 바닥(막힘): 짙은 초록 + 보라 이끼·꽃 점 — 길 밖에서 나무가 서는 땅"""
    c = Canvas(T, T); c.rect(0, 0, T, T, F0)
    for y in range(T):
        for x in range(T):
            if (x * 7 + y * 13) % 17 == 0: c.px(x, y, F2)
            elif (x * 5 + y * 11) % 23 == 0: c.px(x, y, F1)
    for (x, y) in ((4, 9), (21, 3), (27, 19), (10, 25), (16, 15)): c.px(x, y, FL); c.px(x + 1, y, FL)
    for (x, y) in ((8, 4), (25, 10), (14, 29), (30, 27)): c.px(x, y, FP); c.px(x + 1, y, FP2); c.px(x, y + 1, FP)   # 보라 이끼
    return c

def tile_cliff():
    """절벽면(막힘): 숲 바닥 아래 가장자리 — 초록빛 어둠, 세로 결, 아래는 검정"""
    c = Canvas(T, T); c.rect(0, 0, T, T, hexc('#0b2412'))
    c.rect(0, 0, T, 3, F0); c.hline(0, 3, T, F2)
    for x in (4, 11, 19, 26): c.vline(x, 4, 18, hexc('#123a1c'))
    for x in (7, 15, 23, 30): c.vline(x, 6, 12, hexc('#061a0c'))
    c.px(13, 9, FP2); c.px(24, 14, FP)
    for y in range(20, T): c.dither(0, y, T, 1, (0, 0, 0), 2 if y < 26 else 1, y)
    c.rect(0, 28, T, 4, (0, 0, 0))
    return c

def prop_tree(purple=False):
    """울창한 나무 56x84: 잎 층 4단(어둠→밝음) + 짧은 줄기. 초록 나무엔 보라 꽃 점, 보라 나무는 잎 전체가 보라."""
    if purple: L = [hexc('#1c1030'), hexc('#2e1c4c'), hexc('#46306e'), hexc('#65488f')]; SP = hexc('#c9a6f0'); FLW = hexc('#8fe89a')
    else: L = [hexc('#0a2e14'), hexc('#12482a'), hexc('#1c6a38'), hexc('#2c9048')]; SP = hexc('#8fe89a'); FLW = hexc('#b88ae0')
    TR = [hexc('#2a1a12'), hexc('#4a3020')]
    c = Canvas(56, 84)
    c.rect(24, 66, 8, 18, TR[1]); c.vline(25, 66, 18, TR[0]); c.outline(24, 66, 8, 18, OUT)
    for (cy, r, li) in ((58, 25, 0), (44, 23, 1), (30, 19, 2), (17, 14, 3)):
        for y in range(84):
            for x in range(56):
                dx, dy = (x - 28) / r, (y - cy) / (r * 0.7)
                if dx * dx + dy * dy <= 1: c.px(x, y, L[li])
    for (x, y) in ((10, 60), (44, 58), (18, 46), (36, 44), (24, 30), (30, 16), (22, 18), (40, 32)): c.px(x, y, SP)
    for (x, y) in ((14, 52), (40, 50), (28, 38), (20, 24), (36, 22)): c.px(x, y, FLW); c.px(x + 1, y, FLW); c.px(x, y + 1, FLW)   # 꽃 점
    outline_silhouette(c, OUT)
    return c

def prop_recall_pad():
    """귀환 발판 3프레임 띠 (각 56x28): 바닥에 그려진 파란 마법진 — 두 겹 타원 + 룬 네 개, 프레임마다 반짝임이 돈다. anim {cols:3, fps:4}"""
    import math
    B, BL, BD, R = hexc('#3b7fe0'), hexc('#9fe0ff'), hexc('#1f4da8'), hexc('#c9a6f0')
    strip = Canvas(168, 28)
    for f in range(3):
        c = Canvas(56, 28)
        for (rx, ry, col) in ((25, 12, BD), (24, 11, B), (16, 7, BD), (15, 6, B)):
            for ang in range(0, 360, 3):
                x = int(round(28 + math.cos(math.radians(ang)) * rx)); y = int(round(14 + math.sin(math.radians(ang)) * ry))
                c.px(x, y, col)
        for k, ang in enumerate((45, 135, 225, 315)):                      # 룬 네 개
            x = int(round(28 + math.cos(math.radians(ang)) * 20)); y = int(round(14 + math.sin(math.radians(ang)) * 9))
            col = BL if (k + f) % 3 == 0 else R
            c.px(x, y, col); c.px(x + 1, y, col); c.px(x, y + 1, col)
        for (x, y) in (((10, 14), (46, 14), (28, 4))[f],):                  # 도는 반짝임
            c.px(x, y, BL); c.px(x + 1, y, BL); c.px(x, y + 1, BL); c.px(x + 1, y + 1, BL)
        strip.blit(c, f * 56, 0)
    return strip

def _egg_body(c, ox=0, crack=False):
    SH, S0, S1, SP = hexc('#d8cfe6'), hexc('#efe9f6'), hexc('#b9adcf'), hexc('#7a5a9a')
    for y in range(30):
        for x in range(24):
            dx = (x - 12) / (9.5 - 1.5 * (y / 30)); dy = (y - 17) / 13.0
            if dx * dx + dy * dy <= 1: c.px(ox + x, y, S0 if (x < 12 and y < 18) else SH)
    for y in range(30):
        for x in range(24):
            if c.a[y, ox + x, 3] and x > 16 and y > 14: c.px(ox + x, y, S1)
    for (x, y) in ((8, 9), (14, 20), (6, 18), (17, 11)): c.px(ox + x, y, SP)     # 보라 반점
    if crack:                                                                  # 위에서 아래로 지그재그로 갈라진 금(두 갈래)
        K = hexc('#241830')
        for (x, y) in ((12, 4), (12, 5), (11, 6), (11, 7), (12, 8), (13, 9), (13, 10), (12, 11), (12, 12), (13, 13), (14, 14), (14, 15), (13, 16), (13, 17), (14, 18)):
            c.px(ox + x, y, K); c.px(ox + x, y + 1, K)
        for (x, y) in ((13, 9), (15, 10), (16, 11), (17, 12), (11, 12), (9, 13), (8, 14)): c.px(ox + x, y, K)
    return c

def prop_egg(crack=False):
    """오브젝트 알 24x30: 연보라 알 + 보라 반점 (깨진 판은 금이 간다)"""
    c = Canvas(24, 30); _egg_body(c, 0, crack); outline_silhouette(c, hexc('#241830'))
    return c

def prop_egg_legs():
    """다리 달린 알 껍데기 28x34: 깨진 알에서 가느다란 다리 두 개가 나와 도망간다(옆모습)"""
    c = Canvas(28, 34); _egg_body(c, 2, True)
    L = hexc('#e8b06a'); LD = hexc('#a06a2a')
    for (x0, d) in ((9, -1), (17, 1)):
        c.vline(x0, 28, 4, L); c.px(x0 + d, 32, L); c.px(x0 + d * 2, 32, LD)
    outline_silhouette(c, hexc('#241830'))
    return c

if __name__ == '__main__':
    tile_water(0).save('assets/tiles/water_shallow.png'); tile_water(1).save('assets/tiles/water_shallow2.png'); tile_water_pad().save('assets/tiles/water_shallow_pad.png'); tile_water(0).save('assets/tiles/water_shallow_edge.png')   # Y: 막힌 물(가장자리)
    tile_forest_floor().save('assets/tiles/forest_floor_obj.png'); tile_cliff().save('assets/tiles/cliff_obj.png')
    prop_tree().save('assets/props/tree_obj.png'); prop_tree(True).save('assets/props/tree_obj_purple.png')
    prop_recall_pad().save('assets/props/recall_pad.png')                                   # 옵젝영역2 귀환 발판(애니 띠 3프레임)
    prop_egg().save('assets/props/obj_egg.png'); prop_egg(True).save('assets/props/obj_egg_cracked.png'); prop_egg_legs().save('assets/props/obj_egg_legs.png')
    print('obj set ok')
