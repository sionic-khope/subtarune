"""검은 허공 위의 보라색 땅 세트 — 소용돌이에 빨려 들어가 떨어지는 곳.
실행: /usr/bin/python3 tools/art/void_set.py [preview.png] → assets/tiles/ground_purple*.png, flower_purple.png, cliff_purple.png
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from painter import Canvas, hexc, shade
from PIL import Image

T = 32
G = hexc('#4a2578'); G_D = hexc('#3a1c60'); G_L = hexc('#5e2f98'); G_LL = hexc('#7a44b8')
CLIFF = hexc('#2a1240'); CLIFF_L = hexc('#3a1a58'); CLIFF_D = hexc('#160a24')
PETAL = hexc('#c9a3ff'); PETAL_L = hexc('#e6d3ff'); CORE = hexc('#3b1a5a'); STEM = hexc('#6d4a9a')
OUT = hexc('#1a0c2a')

def tile_ground(variant=0):
    c = Canvas(T, T); c.rect(0, 0, T, T, G)
    specks = [(3, 5), (12, 9), (22, 3), (27, 14), (8, 20), (18, 25), (29, 27), (2, 29)] if variant == 0 else [(6, 2), (15, 14), (25, 7), (9, 26), (20, 20), (30, 30), (1, 15), (13, 30)]
    for i, (x, y) in enumerate(specks):
        col = G_L if i % 3 else G_D
        c.px(x, y, col); c.px(x + 1, y, col)
    for (x, y) in ([(10, 16), (24, 22)] if variant == 0 else [(4, 8), (27, 18)]): c.px(x, y, G_LL)
    # 잔풀 (보라)
    for (x, y) in ([(16, 6), (5, 24)] if variant == 0 else [(22, 12), (11, 21)]):
        c.vline(x, y, 3, G_LL); c.px(x - 1, y + 1, G_L); c.px(x + 1, y, G_L)
    return c

def tile_flower():
    c = tile_ground(1)
    cx, cy = 16, 14
    c.vline(cx, cy + 4, 7, STEM); c.px(cx + 1, cy + 7, STEM); c.px(cx + 2, cy + 6, STEM)   # 줄기·잎
    for (dx, dy) in [(0, -4), (4, 0), (0, 4), (-4, 0), (3, -3), (-3, -3), (3, 3), (-3, 3)]:   # 꽃잎 8장
        c.rrect_outlined(cx + dx - 2, cy + dy - 2, 5, 5, PETAL, OUT, 2)
    c.rrect(cx - 2, cy - 2, 5, 5, CORE, 2); c.px(cx, cy, PETAL_L); c.px(cx - 1, cy - 3, PETAL_L)
    # 작은 꽃 하나 더
    c.vline(6, 25, 3, STEM); c.rrect_outlined(4, 21, 5, 5, PETAL, OUT, 2); c.px(6, 23, CORE)
    return c

def tile_cliff():
    """섬 아래쪽 절벽면: 위 4px 는 땅, 아래는 어두운 절벽이 검정으로 사라진다"""
    c = Canvas(T, T); c.rect(0, 0, T, T, CLIFF)
    c.rect(0, 0, T, 3, G); c.hline(0, 3, T, G_D)
    for x in (4, 11, 19, 26): c.vline(x, 4, 18, CLIFF_L)
    for x in (7, 15, 23, 30): c.vline(x, 6, 12, CLIFF_D)
    for y in range(20, T): c.dither(0, y, T, 1, (0, 0, 0), 2 if y < 26 else 1, y)
    c.rect(0, 28, T, 4, (0, 0, 0))
    return c

def prop_big_door():
    """언더테일 초반 유적 입구 느낌의 거대한 검은 문 112x144: 어두운 보라 돌 아치 + 안은 완전한 검정"""
    w, h = 112, 144; c = Canvas(w, h)
    FR = hexc('#3a1a58'); FR_L = hexc('#4f2a78'); FR_D = hexc('#2a1240')
    # 아치 프레임 (사각 + 반원)
    for y in range(h):
        for x in range(w):
            dx, dy = x - w // 2, y - 56
            inside = (y >= 56 and 0 <= x < w) or (dx * dx + dy * dy <= 56 * 56)
            if inside: c.px(x, y, FR)
    for y in range(h):
        for x in range(w):
            dx, dy = x - w // 2, y - 56
            inner = (y >= 56 and 12 <= x < w - 12) or (dx * dx + dy * dy <= 44 * 44)
            if inner and y >= 12: c.px(x, y, (0, 0, 0))
    # 돌 줄눈
    for y in range(20, h, 16): c.hline(0, y, 12, FR_D); c.hline(w - 12, y, 12, FR_D)
    for y in range(28, h, 32): c.px(6, y, FR_L); c.px(w - 7, y, FR_L)
    for a in range(0, 180, 20):
        import math
        x = int(w // 2 + math.cos(math.radians(a)) * 50); y = int(56 - math.sin(math.radians(a)) * 50)
        c.px(x, y, FR_D); c.px(x + 1, y, FR_D)
    c.hline(0, h - 1, w, FR_D)
    # 문턱
    c.rect(8, h - 6, w - 16, 6, hexc('#4a2578')); c.hline(8, h - 6, w - 16, hexc('#5e2f98'))
    return c

def main():
    out = 'assets/tiles'; os.makedirs(out, exist_ok=True)
    tiles = {'ground_purple': tile_ground(0), 'ground_purple2': tile_ground(1), 'flower_purple': tile_flower(), 'cliff_purple': tile_cliff()}
    for n, c in tiles.items(): c.save(f'{out}/{n}.png')
    os.makedirs('assets/props', exist_ok=True); prop_big_door().save('assets/props/big_door.png')
    W, H = 8 * T, 4 * T; pv = Canvas(W, H)
    for tx in range(8):
        for ty in range(3): pv.blit(tiles['flower_purple' if (tx * 7 + ty * 3) % 5 == 0 else ('ground_purple' if (tx + ty) % 2 else 'ground_purple2')], tx * T, ty * T)
        pv.blit(tiles['cliff_purple'], tx * T, 3 * T)
    pv.image().resize((W * 3, H * 3), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'void_preview.png')
    print('tiles', list(tiles))


# ── 보라맵2: 파란 물길 + 뗏목 ─────────────────────────────────────
WATER = hexc('#2f4fa8'); WATER_D = hexc('#243f8c'); WATER_L = hexc('#4d74d6'); WATER_LL = hexc('#8fb0ff')
RAFT = hexc('#8a6238'); RAFT_D = hexc('#5f4224'); RAFT_L = hexc('#a97c4a'); ROPE = hexc('#c9b58a')

def tile_water(variant=0):
    """물: 그냥 파란색 (흰 하이라이트 없음). 아주 옅은 어두운 잔물결만"""
    c = Canvas(T, T); c.rect(0, 0, T, T, WATER)
    for (x, y) in ([(4, 6), (18, 14), (9, 24), (25, 29)] if variant == 0 else [(13, 3), (27, 11), (6, 19), (20, 27)]):
        c.hline(x, y, 5, WATER_D)
    return c

def prop_raft():
    """뗏목 56x40: 통나무 4개, 단순한 2톤 (보라 세트의 평면 느낌에 맞춤)"""
    w, h = 56, 40; c = Canvas(w, h)
    for i in range(4):
        y = 2 + i * 9
        c.rrect_outlined(2, y, w - 4, 10, RAFT, OUT, 2); c.hline(4, y + 1, w - 8, RAFT_L); c.hline(4, y + 8, w - 8, RAFT_D)
    for x in (12, w - 15): c.rect(x, 1, 3, h - 3, ROPE); c.vline(x + 3, 1, h - 3, OUT)
    return c

def prop_signpost():
    """표지판 26x30: 어두운 보라 나무 기둥 + 판자"""
    w, h = 26, 30; c = Canvas(w, h)
    POST = hexc('#4a2a6a'); POST_L = hexc('#6a3f92'); BOARD = hexc('#5e3a86'); BOARD_L = hexc('#7d54ad')
    c.rect(11, 14, 4, 16, POST); c.outline(10, 13, 6, 17, OUT); c.vline(12, 15, 13, POST_L)
    c.rrect_outlined(0, 0, w, 15, BOARD, OUT, 2); c.hline(2, 2, w - 4, BOARD_L)
    for (x, y, ln) in [(4, 5, 12), (4, 9, 16)]: c.hline(x, y, ln, hexc('#e6d3ff'))
    c.px(2, 12, OUT); c.px(w - 3, 12, OUT)
    return c

_main = main
def main():
    _main()
    out = 'assets/tiles'
    tile_water(0).save(f'{out}/water_blue.png'); tile_water(1).save(f'{out}/water_blue2.png')
    prop_raft().save('assets/props/raft.png'); prop_signpost().save('assets/props/signpost.png')
    print('water/raft ok')

if __name__ == '__main__':
    main()
