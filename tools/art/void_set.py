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

def prop_big_door_closed():
    """잠긴 큰 문 112x144: 같은 아치 프레임 + 어두운 보라 나무 문짝(세로 널·가운데 이음새·쇠띠 2개). 자물쇠는 별도 소품"""
    c = prop_big_door()
    w, h = c.w, c.h
    DOOR = hexc('#2b1a3f'); DOOR_L = hexc('#3a2554'); DOOR_D = hexc('#1c1029'); IRON = hexc('#5a5a66'); IRON_D = hexc('#3a3a44')
    import math
    for y in range(12, h):
        for x in range(w):
            dx, dy = x - w // 2, y - 56
            inner = (y >= 56 and 12 <= x < w - 12) or (dx * dx + dy * dy <= 44 * 44)
            if inner: c.px(x, y, DOOR)
    for x in range(20, w - 12, 12):
        for y in range(12, h):
            dx, dy = x - w // 2, y - 56
            if (y >= 56 and 12 <= x < w - 12) or (dx * dx + dy * dy <= 44 * 44): c.px(x, y, DOOR_D)
    for y in range(12, h):
        dx, dy = 0, y - 56
        if y >= 56 or dy * dy <= 44 * 44: c.px(w // 2, y, DOOR_D); c.px(w // 2 - 1, y, DOOR_L)
    for by in (70, 112):
        c.rect(14, by, w - 28, 5, IRON); c.hline(14, by, w - 28, hexc('#7a7a88')); c.hline(14, by + 4, w - 28, IRON_D)
        for x in range(18, w - 16, 10): c.px(x, by + 2, IRON_D)
    return c

def prop_door_small():
    """작은 잠긴 문 40x56 (보라맵 큰 아치문은 보라맵1 전용 — 재사용 금지). 어두운 문짝 + 프레임, 자물쇠는 별도 소품"""
    w, h = 40, 56; c = Canvas(w, h)
    FR = hexc('#3a1a58'); FR_L = hexc('#4f2a78'); DOOR = hexc('#2b1a3f'); DOOR_D = hexc('#1c1029'); DOOR_L = hexc('#3a2554')
    c.rrect_outlined(0, 0, w, h, FR, OUT, 6); c.rect(2, 2, w - 4, 3, FR_L)
    c.rrect(5, 6, w - 10, h - 8, DOOR, 4)
    for x in (13, 21, 29): c.vline(x, 8, h - 12, DOOR_D)
    c.vline(w // 2, 8, h - 12, DOOR_L)
    c.hline(5, h - 3, w - 10, OUT)
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
    """물: 그냥 파란색 한 색 (디테일 없음 — 사용자 요구)"""
    c = Canvas(T, T); c.rect(0, 0, T, T, WATER)
    return c

def prop_raft():
    """뗏목 56x40: 델타룬식 최소 도트 — 외곽선 + 한 색 + 통나무 경계선 3개"""
    w, h = 56, 40; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h, RAFT, OUT, 2)
    for y in (10, 20, 30): c.hline(2, y, w - 4, RAFT_D)
    c.hline(2, 1, w - 4, RAFT_L)
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

def prop_pillar():
    """물 위 한 블럭 기둥 32x56 (낮음): 윗면 보라 땅 + 어두운 돌 몸통, 아래는 물에 잠김"""
    w, h = 32, 56; c = Canvas(w, h)
    c.rect(2, 8, w - 4, h - 8, CLIFF); c.outline(1, 7, w - 2, h - 7, OUT)
    for y in (18, 30, 42): c.hline(3, y, w - 6, CLIFF_L)
    c.rrect_outlined(0, 0, w, 12, G, OUT, 2); c.hline(2, 2, w - 4, G_L)
    c.dither(2, h - 8, w - 4, 8, WATER, 2)
    return c

def prop_padlock():
    w, h = 18, 24; c = Canvas(w, h)
    GOLD = hexc('#d9b24a'); GOLD_D = hexc('#a8842e'); GOLD_L = hexc('#f0d27a')
    c.outline(4, 0, 10, 12, OUT); c.outline(5, 1, 8, 10, GOLD_D); c.rect(7, 3, 4, 8, None) if False else None
    c.rrect_outlined(0, 9, w, 15, GOLD, OUT, 3); c.hline(2, 11, w - 4, GOLD_L); c.rect(2, 20, w - 4, 2, GOLD_D)
    c.rect(8, 14, 2, 5, OUT); c.px(7, 14, OUT); c.px(10, 14, OUT)
    return c

def prop_lever(on=False):
    """레버 24x32: 받침 + 손잡이(off: 왼쪽 기울, on: 오른쪽 기울)"""
    w, h = 24, 32; c = Canvas(w, h)
    BASE = hexc('#3a1a58'); BASE_L = hexc('#4f2a78'); STICK = hexc('#c9b58a'); KNOB = hexc('#e04040')
    c.rrect_outlined(2, 22, w - 4, 10, BASE, OUT, 2); c.hline(4, 24, w - 8, BASE_L)
    c.rect(10, 18, 4, 5, BASE_L); c.outline(9, 17, 6, 7, OUT)
    pts = [(12 - i // 2, 20 - i) for i in range(14)] if not on else [(12 + i // 2, 20 - i) for i in range(14)]
    for (x, y) in pts: c.px(x, y, OUT); c.px(x + 1, y, STICK); c.px(x + 2, y, OUT)
    kx, ky = pts[-1]
    c.rrect_outlined(kx - 2, ky - 4, 6, 6, KNOB, OUT, 2)
    return c

def tile_bridge():
    """다리 32x32: 물 위에 걸친 어두운 널판 + 양옆 난간 없음(단순)"""
    c = Canvas(T, T); c.rect(0, 0, T, T, RAFT)
    for x in (0, 8, 16, 24): c.vline(x, 0, T, RAFT_D)
    c.hline(0, 0, T, RAFT_L); c.hline(0, T - 1, T, OUT); c.hline(0, 1, T, OUT)
    return c

def tile_stairs():
    """계단 32x32: 위로 올라가는 단 4개"""
    c = Canvas(T, T); c.rect(0, 0, T, T, G)
    for i in range(4):
        y = i * 8
        c.rect(0, y, T, 8, G_L if i % 2 == 0 else G); c.hline(0, y, T, OUT); c.hline(0, y + 1, T, G_LL)
    c.vline(0, 0, T, OUT); c.vline(T - 1, 0, T, OUT)
    return c

def bridge_span(tiles):
    c = Canvas(tiles * T, T); t = tile_bridge()
    for i in range(tiles): c.blit(t, i * T, 0)
    return c

_main = main
def main():
    _main()
    out = 'assets/tiles'
    tile_water(0).save(f'{out}/water_blue.png'); tile_water(1).save(f'{out}/water_blue2.png')
    prop_raft().save('assets/props/raft.png'); prop_signpost().save('assets/props/signpost.png')
    prop_pillar().save('assets/props/pillar.png'); prop_padlock().save('assets/props/padlock.png')
    prop_lever(False).save('assets/props/lever_off.png'); prop_lever(True).save('assets/props/lever_on.png')
    tile_bridge().save(f'{out}/bridge_purple.png'); tile_stairs().save(f'{out}/stairs_purple.png')
    bridge_span(31).save('assets/props/bridge_span31.png'); prop_door_small().save('assets/props/door_small.png')
    print('water/raft ok')


# ── 낙석 ─────────────────────────────────────────────────────────
ROCK_GRID = [
    "..............############..............",
    "..........####llllllllll####............",
    ".......###llllhhhlllllllllll###.........",
    ".....##llllhhhllllllllllllaaaa##........",
    "....#llllhhlllllllllllllaaaaaaaa#.......",
    "...#lllllhllllllllllllaaaaaaaaaaa#......",
    "..#llllllllllllllllllaaaaaaaaaaaaa#.....",
    "..#lllllllllllllllaaaaaaaaaaaaaaaaa#....",
    ".#llllllllllllllaaaaaaaaaaaaaaaaaaaa#...",
    ".#lllllllllllaaaaaaaaaaaaaaaaaaaaaaad#..",
    "#llllllllllaaaaaaaaaaaaaaaaaaaaaaaaadd#.",
    "#lllllllllaaaaaaaaaaaaaadaaaaaaaaaaddd#.",
    "#llllllllaaaaaaaaaaaaaadaaaaaaaaaadddd#.",
    "#lllllllaaaaaaaaaaaaaadaaaaaaaaaaddddd#.",
    "#llllllaaaaaaaaaaaaaadaaaaaaaaaadddddd#.",
    "#lllllaaaaaaaaaaaaaadaaaaaaaaaaddddddd#.",
    "#llllaaaaaaaaaaaaaadaaaaaaaaaadddddddd#.",
    "#lllaaaaaaaaaaaaaaaaaaaaaaaaadddddddddd#",
    "#llaaaaaaaaaaaaaaaaaaaaaaaaaddddddddddd#",
    ".#aaaaaaaaaaaaaaaaaaaaaaaaadddddddddddd#",
    ".#aaaaaaaaaaaaaaaaaaaaaaaadddddddddddd#.",
    "..#aaaaaaaaaaaaaaaaaaaaaddddddddddddd#..",
    "..#aaaaaaaaaaaaaaaaaadddddddddddddddd#..",
    "...#aaaaaaaaaaaaaaadddddddddddddddd#....",
    "....#aaaaaaaaaaaadddddddddddddddd#......",
    ".....##ddddddddddddddddddddddd##........",
    ".......###dddddddddddddddddd###.........",
    "..........################..............",
]
def prop_rock():
    """낙석 40x28(가로로 넓게 — 2026-09-10 "x 면적 높여"): 손그림 그리드 — 둥근 덩어리, 왼쪽 위 밝음·오른쪽 아래 어두움, 금 한 줄"""
    pal = {'#': OUT, 'a': hexc('#5a4a70'), 'l': hexc('#7d6b96'), 'd': hexc('#3e3050'), 'h': hexc('#a494bd')}
    c = Canvas(len(ROCK_GRID[0]), len(ROCK_GRID))
    for y, row in enumerate(ROCK_GRID):
        for x, ch in enumerate(row):
            if ch != '.': c.px(x, y, pal[ch])
    return c

_main2 = main
def main():
    _main2()
    prop_rock().save('assets/props/rock.png')
    print('rock ok')

if __name__ == '__main__':
    main()

def prop_water_wall():
    """물 위 벽 28x52 (보라맵8 뗏목 점프 장애물): 몸만한 돌 판, 최소 디테일. 2026-09-10"""
    A = hexc('#3b2a55'); L = hexc('#54407a'); D = hexc('#2a1c40'); H = hexc('#7a63a8')
    w, h = 28, 52; c = Canvas(w, h)
    c.rect(0, 0, w, h, OUT); c.rect(1, 1, w - 2, h - 2, A)
    c.rect(1, 1, w - 2, 3, L); c.hline(2, 1, w - 4, H)
    c.rect(w - 6, 4, 5, h - 5, D); c.vline(1, 4, h - 5, L)
    for i in range(4): c.px(6 + i, 14 + i, D)
    for i in range(3): c.px(11 + i, 30 + i, D)
    return c

_main3 = main
def main():
    _main3()
    prop_water_wall().save('assets/props/water_wall.png')
    print('water_wall ok')

def prop_flowers():
    """꽃 무더기 96x26 (낙석 맵 냄새 이벤트): 보라 꽃 7송이가 3타일 폭으로 — 억빠맨이 가운데 들어가도 양옆 꽃이 보인다. 배경 없음. 2026-09-10"""
    c = Canvas(96, 26)
    def flower(cx, cy, r):
        c.vline(cx, cy + r + 1, 26 - (cy + r + 1), STEM)
        for (dx, dy) in [(0, -r), (r, 0), (0, r), (-r, 0)]: c.rrect_outlined(cx + dx - 2, cy + dy - 2, 5, 5, PETAL, OUT, 2)
        if r >= 4:
            for (dx, dy) in [(3, -3), (-3, -3), (3, 3), (-3, 3)]: c.rrect_outlined(cx + dx - 2, cy + dy - 2, 5, 5, PETAL, OUT, 2)
        c.rrect(cx - 2, cy - 2, 5, 5, CORE, 2); c.px(cx, cy, PETAL_L)
    for (x, y, r) in [(8, 12, 4), (22, 7, 4), (36, 14, 3), (50, 9, 4), (63, 15, 3), (76, 8, 4), (89, 13, 3)]: flower(x, y, r)
    for (x, y) in [(2, 22), (3, 21), (43, 23), (58, 22), (93, 23)]: c.px(x, y, STEM)
    return c

_main4 = main
def main():
    _main4()
    prop_flowers().save('assets/props/flowers_purple.png')
    print('flowers ok')
