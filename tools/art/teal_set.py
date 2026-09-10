# -*- coding: utf-8 -*-
"""청록숲 타일·소품 (사용자 브리핑 2026-09-10 "청록색 느낌의 타일, 검은 배경, 수풀 같은 배경").
타일 32px: ground_teal / ground_teal2 / grass_teal(잔풀 많은 변형) / cliff_teal — 보라 땅(void_set.py)과 같은 문법(점·잔풀·절벽면).
소품: statue_junhee.png 44x60 — 쥰희(돼지)를 닮은 나무 동상, 돌 받침.
실행: /usr/bin/python3 tools/art/teal_set.py → assets/tiles/*.png, assets/props/statue_junhee.png
"""
import sys
sys.path.insert(0, 'tools/art')
from painter import Canvas, hexc
T = 32
G = hexc('#1f6b66'); G_D = hexc('#175550'); G_L = hexc('#2a8a82'); G_LL = hexc('#3fb0a5')
CLIFF = hexc('#0f3a38'); CLIFF_L = hexc('#16514d'); CLIFF_D = hexc('#082220')
OUT = hexc('#061a19')

def tile_ground(variant=0):
    c = Canvas(T, T); c.rect(0, 0, T, T, G)
    specks = [(3, 5), (12, 9), (22, 3), (27, 14), (8, 20), (18, 25), (29, 27), (2, 29)] if variant == 0 else [(6, 2), (15, 14), (25, 7), (9, 26), (20, 20), (30, 30), (1, 15), (13, 30)]
    for i, (x, y) in enumerate(specks):
        col = G_L if i % 3 else G_D
        c.px(x, y, col); c.px(x + 1, y, col)
    for (x, y) in ([(10, 16), (24, 22)] if variant == 0 else [(4, 8), (27, 18)]): c.px(x, y, G_LL)
    for (x, y) in ([(16, 6), (5, 24)] if variant == 0 else [(22, 12), (11, 21)]):     # 잔풀
        c.vline(x, y, 3, G_LL); c.px(x - 1, y + 1, G_L); c.px(x + 1, y, G_L)
    return c

def tile_grass():
    """잔풀이 많은 땅: 풀 포기 4개 + 밝은 점"""
    c = tile_ground(1)
    for (x, y) in [(6, 6), (20, 4), (12, 18), (26, 22)]:
        c.vline(x, y, 5, G_LL); c.vline(x - 2, y + 2, 3, G_L); c.vline(x + 2, y + 1, 4, G_L); c.px(x + 1, y - 1, G_LL)
    return c

def tile_cliff():
    c = Canvas(T, T); c.rect(0, 0, T, T, CLIFF)
    c.rect(0, 0, T, 3, G); c.hline(0, 3, T, G_D)
    for x in (4, 11, 19, 26): c.vline(x, 4, 18, CLIFF_L)
    for x in (7, 15, 23, 30): c.vline(x, 6, 12, CLIFF_D)
    for y in range(20, T): c.dither(0, y, T, 1, (0, 0, 0), 2 if y < 26 else 1, y)
    c.rect(0, 28, T, 4, (0, 0, 0))
    return c

def prop_statue():
    """쥰희를 닮은 나무 동상 44x60: 돌 받침(아래 12px) + 나무 조각(둥근 머리·세모 귀·큰 코·땅딸막한 몸), 나뭇결·금."""
    W0 = [hexc('#3a2314'), hexc('#5a3a22'), hexc('#7a4f2e'), hexc('#a0703f')]   # 어둠→밝음
    S0 = [hexc('#0e2a29'), hexc('#1c4a47'), hexc('#2c6b66')]
    c = Canvas(44, 60)
    # 받침
    c.rrect_outlined(2, 48, 40, 12, S0[1], OUT, 3); c.hline(4, 50, 36, S0[2]); c.rect(4, 56, 36, 2, S0[0])
    # 몸통(타원 느낌의 둥근 사각)
    c.rrect_outlined(9, 26, 26, 24, W0[2], OUT, 8); c.rrect(12, 29, 10, 14, W0[3], 5); c.rect(24, 31, 8, 16, W0[1])
    # 팔
    c.rrect_outlined(4, 32, 8, 12, W0[2], OUT, 3); c.rrect_outlined(32, 32, 8, 12, W0[1], OUT, 3)
    # 머리
    c.rrect_outlined(8, 6, 28, 24, W0[2], OUT, 10); c.rrect(11, 9, 12, 10, W0[3], 5)
    # 귀(세모)
    for (x0, d) in ((9, 1), (34, -1)):
        for i in range(6): c.hline(x0 + (0 if d > 0 else -i), 2 + i, i + 1, W0[1])
        for i in range(6): c.px(x0 + d * i if d > 0 else x0 - i, 2 + i, OUT)
    c.hline(9, 8, 6, OUT); c.hline(29, 8, 6, OUT)
    # 코(큰 타원) + 콧구멍, 눈
    c.rrect_outlined(15, 17, 14, 9, W0[3], OUT, 4); c.px(18, 21, W0[0]); c.px(19, 21, W0[0]); c.px(24, 21, W0[0]); c.px(25, 21, W0[0])
    c.rect(13, 12, 2, 3, OUT); c.rect(29, 12, 2, 3, OUT)
    # 나뭇결·금
    for (x, y, h) in ((16, 30, 10), (30, 34, 8), (20, 10, 4)): c.vline(x, y, h, W0[1])
    for i in range(5): c.px(26 + i, 40 + i, W0[0])
    for i in range(3): c.px(12 + i, 22 + i, W0[0])
    return c

if __name__ == '__main__':
    tile_ground(0).save('assets/tiles/ground_teal.png'); tile_ground(1).save('assets/tiles/ground_teal2.png'); tile_grass().save('assets/tiles/grass_teal.png'); tile_cliff().save('assets/tiles/cliff_teal.png')
    prop_statue().save('assets/props/statue_junhee.png')
    print('teal set ok')
