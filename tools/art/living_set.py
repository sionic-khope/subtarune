"""복도 + 거실/부엌 세트 — room_set.py 와 같은 스타일(1px 외곽선 + 2톤 명암 + 둥근 모서리)로 직접 그린 타일/소품.
실행: python3 tools/art/living_set.py [preview.png]  → assets/tiles/*.png, assets/props/*.png
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from painter import Canvas, hexc, shade
from room_set import (OUT, WOOD, WOOD_D, WOOD_L, BASE, BASE_D, BASE_L, PLASTIC, PLASTIC_L, SCREEN, NIGHT, GLASS_L,
                      tile_wall, tile_wall_base, tile_floor, tile_wall_edge, shadow, prop_window, prop_door)
from PIL import Image

T = 32
# ── 거실 팔레트: 바랜 꽃무늬 벽지, 마루, 부엌 타일 ──
LW  = hexc('#e6d6c4'); LW_D = hexc('#d6c3ae'); LW_L = hexc('#f2e6d6'); LW_F = hexc('#d9a7a0'); LW_G = hexc('#a9bf8f')
PLANK = hexc('#b98c5e'); PLANK_D = hexc('#a0764c'); PLANK_L = hexc('#cc9d6b'); PLANK_LINE = hexc('#7e5a3a')
KT = hexc('#d8d2c4'); KT_D = hexc('#c4bcac'); KT_L = hexc('#e6e1d6'); KT_G = hexc('#a9a294')
IVORY = hexc('#f1eee6'); IVORY_D = hexc('#d5d0c4'); IVORY_L = hexc('#fbfaf6')
STEEL = hexc('#9aa3ad'); STEEL_D = hexc('#6f7882'); STEEL_L = hexc('#c9d0d7')
FABRIC = hexc('#6f7f5a'); FABRIC_D = hexc('#55633f'); FABRIC_L = hexc('#8a9a70')
DARKWOOD = hexc('#5e3a26'); DARKWOOD_D = hexc('#3f2617'); DARKWOOD_L = hexc('#7c4f33')
LEAF = hexc('#4f9a52'); LEAF_D = hexc('#356c38'); LEAF_L = hexc('#7cc47a'); POT = hexc('#b8623f'); POT_D = hexc('#8a4629')
RUG2 = hexc('#4f7f7a'); RUG2_D = hexc('#3b615d'); RUG2_L = hexc('#6fa39c'); RUG2_G = hexc('#e6c26a')
TART = hexc('#f0c24a'); TART_D = hexc('#c9922a'); CRUST = hexc('#c98a3a'); PLATE = hexc('#f4f2ec'); PLATE_D = hexc('#cfcac0')
BLACK = hexc('#120d10')

# ── 타일 ──
def tile_wall2():
    c = Canvas(T, T); c.rect(0, 0, T, T, LW)
    # 잔꽃무늬: 십자 꽃(분홍) + 잎 1px(연두), 16px 격자를 반칸씩 어긋나게
    for gy in range(2):
        for gx in range(2):
            ox, oy = gx * 16 + 6 + (8 if gy else 0), gy * 16 + 6
            ox %= T
            for (dx, dy) in [(0, -1), (-1, 0), (1, 0), (0, 1)]: c.px(ox + dx, oy + dy, LW_F)
            c.px(ox, oy, shade(LW_F, 1.25))
            c.px(ox + 2, oy + 2, LW_G); c.px(ox + 3, oy + 2, LW_G)
    for (x, y) in [(2, 12), (13, 3), (27, 13), (18, 10), (30, 26)]: c.px(x, y, LW_L)
    return c

def tile_wall2_base():
    c = tile_wall2()
    c.rect(0, 22, T, 10, BASE); c.hline(0, 22, T, BASE_L); c.hline(0, 23, T, BASE_L); c.hline(0, 31, T, BASE_D); c.hline(0, 30, T, BASE_D)
    c.hline(0, 21, T, shade(LW_D, 0.9))
    return c

def tile_plank(variant=0):
    c = Canvas(T, T); c.rect(0, 0, T, T, PLANK)
    for y in (0, 16): c.hline(0, y, T, PLANK_LINE)
    for y in (1, 17): c.hline(0, y, T, PLANK_L)
    joints = [(10, 0), (24, 16)] if variant == 0 else [(22, 0), (6, 16)]
    for (x, y) in joints: c.vline(x, y, 16, PLANK_LINE); c.vline(x + 1, y + 1, 14, PLANK_L)
    for (x, y) in [(3, 6), (21, 11), (14, 22), (28, 27)]: c.px(x, y, PLANK_D); c.px(x + 1, y, PLANK_D)
    for (x, y) in [(16, 4), (8, 24)]: c.hline(x, y, 5, shade(PLANK_D, 0.95))
    return c

def tile_kitchen(variant=0):
    c = Canvas(T, T); c.rect(0, 0, T, T, KT)
    for v in (0, 16): c.hline(0, v, T, KT_G); c.vline(v, 0, T, KT_G)
    for v in (1, 17): c.hline(0, v, T, KT_L); c.vline(v, 0, T, KT_L)
    for (x, y) in ([(6, 9), (22, 26)] if variant == 0 else [(24, 6), (8, 24)]): c.px(x, y, KT_D); c.px(x + 1, y + 1, KT_D)
    return c

# ── 소품 ──
def prop_doorway_side(flip=False):
    """측면 벽에 뚫린 출입구(복도 끝/거실 왼쪽). 32x96 벽 위에 얹는다."""
    w, h = 36, 100; c = Canvas(w, h)
    c.rect(0, 0, 32, h, OUT)
    c.rect(2, 2, 28, h - 4, BLACK)
    c.rect(2, 2, 28, 4, shade(BLACK, 2.2))                 # 위쪽 문틀 안쪽 밝은 띠
    c.rect(0, 0, 4, h, DARKWOOD); c.rect(28, 0, 4, h, DARKWOOD)   # 세로 문틀
    c.rect(0, 0, 32, 4, DARKWOOD_L); c.rect(0, h - 4, 32, 4, DARKWOOD_D)
    c.outline(0, 0, 32, h, OUT)
    c.rect(32, 6, 4, h - 12, shade(BLACK, 3.0)); c.dither(32, 6, 4, h - 12, BLACK, 2)   # 문턱 그림자(바닥 쪽)
    return c.flip() if flip else c

def prop_tv():
    w, h = 72, 64; c = Canvas(w, h)
    # 받침장
    c.rrect_outlined(0, 40, w, 22, WOOD, OUT, 2); c.hline(2, 42, w - 4, WOOD_L)
    c.rect(1, 46, w - 2, 12, WOOD_D); c.outline(0, 45, w, 14, OUT)
    c.outline(6, 48, 26, 8, OUT); c.outline(40, 48, 26, 8, OUT); c.rect(17, 51, 4, 2, WOOD_L); c.rect(51, 51, 4, 2, WOOD_L)
    c.rect(3, 62, 5, 2, OUT); c.rect(w - 8, 62, 5, 2, OUT)
    # TV 본체(브라운관 느낌 두꺼운 테두리)
    c.rrect_outlined(8, 2, 56, 38, PLASTIC, OUT, 3); c.rect(10, 4, 52, 2, PLASTIC_L)
    c.rrect(13, 7, 46, 27, SCREEN, 2)
    c.rect(15, 9, 42, 23, hexc('#222a3a')); c.rect(17, 11, 10, 2, hexc('#3a4660')); c.rect(17, 14, 6, 1, hexc('#3a4660'))
    c.dither(15, 20, 42, 12, hexc('#1a2030'), 2)
    c.px(56, 36, hexc('#e04040'))                            # 전원 LED
    c.rect(30, 40, 12, 2, PLASTIC_L); c.rect(26, 42, 20, 2, OUT)   # 받침목
    return shadow(c, 0, h - 6, w, 6)

def prop_sofa():
    w, h = 96, 48; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, 16, FABRIC_L, OUT, 4)        # 등받이
    c.rect(2, 2, w - 4, 3, shade(FABRIC_L, 1.12))
    c.rrect_outlined(0, 12, 12, 30, FABRIC, OUT, 3); c.rrect_outlined(w - 12, 12, 12, 30, FABRIC, OUT, 3)   # 팔걸이
    c.rect(2, 14, 8, 3, FABRIC_L); c.rect(w - 10, 14, 8, 3, FABRIC_L)
    c.rect(11, 14, w - 22, 26, FABRIC); c.outline(11, 14, w - 22, 27, OUT)
    for i in range(2):                                       # 방석 2개
        x = 12 + i * 37
        c.rrect_outlined(x, 16, 35, 20, FABRIC_L, OUT, 3); c.hline(x + 2, 18, 31, shade(FABRIC_L, 1.12)); c.rect(x + 2, 32, 31, 3, FABRIC_D)
    c.rect(11, 38, w - 22, 4, FABRIC_D); c.hline(11, 41, w - 22, OUT)
    c.rect(4, 42, 5, 4, OUT); c.rect(w - 9, 42, 5, 4, OUT); c.rect(30, 42, 4, 3, OUT); c.rect(62, 42, 4, 3, OUT)   # 다리
    return shadow(c, 0, h - 5, w, 5)

def prop_table_low():
    """밥상(교자상) 80x48: 다리 짧은 진한 나무 상"""
    w, h = 80, 48; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, 38, DARKWOOD, OUT, 4)
    c.rrect(3, 3, w - 6, 32, DARKWOOD_L, 3); c.rect(4, 4, w - 8, 2, shade(DARKWOOD_L, 1.15))
    c.outline(6, 7, w - 12, 25, DARKWOOD)                    # 상판 안쪽 테
    c.rect(2, 33, w - 4, 4, DARKWOOD_D); c.hline(2, 37, w - 4, OUT)
    for x in (6, w - 12): c.rect(x, 38, 6, 8, DARKWOOD_D); c.outline(x - 1, 37, 8, 10, OUT)   # 짧은 다리
    c.rect(24, 38, 32, 3, DARKWOOD_D)                        # 가운데 그늘
    return shadow(c, 0, h - 6, w, 6)

def prop_tart():
    """접시 위 에그타르트 24x16 (밥상 위에 별도 소품으로 얹음)"""
    w, h = 24, 16; c = Canvas(w, h)
    c.rrect_outlined(0, 4, w, 11, PLATE, OUT, 4); c.hline(3, 12, w - 6, PLATE_D)
    c.rrect_outlined(6, 2, 12, 9, CRUST, OUT, 3)
    c.rrect(8, 4, 8, 5, TART, 2); c.px(9, 5, shade(TART, 1.2)); c.px(10, 5, shade(TART, 1.2)); c.rect(9, 7, 6, 1, TART_D)
    return c

def prop_cushion():
    w, h = 26, 18; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h - 2, hexc('#b76b6b'), OUT, 4); c.rect(3, 2, w - 6, 3, hexc('#cf8585'))
    c.rect(3, h - 6, w - 6, 2, hexc('#8f4c4c')); c.hline(4, h - 1, w - 8, OUT)
    return c

def prop_fridge():
    w, h = 48, 84; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h - 2, IVORY, OUT, 3)
    c.rect(2, 2, w - 4, 3, IVORY_L); c.rect(2, 30, w - 4, 2, OUT)   # 냉동/냉장 분리선
    c.rect(w - 9, 8, 3, 16, STEEL_D); c.rect(w - 9, 38, 3, 34, STEEL_D); c.rect(w - 9, 8, 1, 16, STEEL_L); c.rect(w - 9, 38, 1, 34, STEEL_L)   # 손잡이
    c.rect(2, h - 12, w - 4, 8, IVORY_D); c.rect(2, h - 6, w - 4, 4, shade(IVORY_D, 0.85))
    # 자석 메모
    c.rect(8, 40, 12, 10, hexc('#f6f0b0')); c.outline(8, 40, 12, 10, hexc('#b8b070')); c.hline(10, 43, 8, hexc('#8a8455')); c.hline(10, 46, 6, hexc('#8a8455'))
    c.rect(24, 12, 6, 6, hexc('#e05050')); c.px(26, 14, hexc('#ffb0b0'))
    c.rect(26, 56, 8, 5, hexc('#5b7fb5')); c.rect(27, 57, 6, 3, hexc('#7797c8'))
    c.rect(4, h - 2, 6, 2, OUT); c.rect(w - 10, h - 2, 6, 2, OUT)
    return shadow(c, 0, h - 6, w, 6)

def prop_counter_sink():
    w, h = 96, 60; c = Canvas(w, h)
    c.rrect_outlined(0, 18, w, 12, STEEL_L, OUT, 2); c.hline(2, 20, w - 4, hexc('#e8edf2'))     # 상판(스테인리스)
    c.rrect_outlined(30, 19, 36, 10, STEEL, OUT, 2); c.rect(33, 21, 30, 6, STEEL_D); c.px(47, 24, OUT)   # 개수대
    c.rect(46, 8, 4, 12, STEEL_D); c.rect(46, 8, 10, 3, STEEL_D); c.rect(47, 9, 8, 1, STEEL_L)     # 수도꼭지
    c.rect(1, 30, w - 2, 26, IVORY); c.outline(0, 29, w, 28, OUT)                                  # 하부장
    for x in (4, 34, 64):
        c.outline(x, 33, 28, 20, IVORY_D); c.rect(x + 12, 41, 4, 2, STEEL_D)
    c.rect(2, 52, w - 4, 3, IVORY_D)
    c.rect(2, 56, w - 4, 3, OUT)
    # 밥솥 + 컵
    c.rrect_outlined(6, 4, 18, 15, hexc('#e9e9ee'), OUT, 4); c.rect(9, 6, 12, 3, hexc('#cfcfd8')); c.px(14, 12, hexc('#e04040')); c.rect(10, 15, 10, 2, hexc('#cfcfd8'))
    c.rrect_outlined(74, 10, 8, 9, hexc('#ffffff'), OUT, 2); c.rect(82, 12, 2, 4, OUT)
    return shadow(c, 0, h - 6, w, 6)

def prop_stove():
    w, h = 48, 60; c = Canvas(w, h)
    c.rrect_outlined(0, 16, w, 12, STEEL, OUT, 2); c.hline(2, 18, w - 4, STEEL_L)
    for x in (7, 27):                                        # 버너 2개
        c.rrect_outlined(x, 17, 14, 10, PLASTIC, OUT, 4); c.rect(x + 4, 20, 6, 4, PLASTIC_L); c.px(x + 6, 21, OUT); c.px(x + 7, 22, OUT)
    c.rect(1, 28, w - 2, 28, IVORY); c.outline(0, 27, w, 30, OUT)
    c.rect(4, 31, w - 8, 3, PLASTIC); c.px(10, 32, STEEL_L); c.px(20, 32, STEEL_L); c.px(30, 32, STEEL_L); c.px(40, 32, STEEL_L)   # 손잡이 노브
    c.outline(4, 37, w - 8, 15, IVORY_D); c.rect(8, 40, w - 16, 8, hexc('#3b3f4a')); c.rect(10, 42, w - 20, 2, hexc('#59606e'))   # 오븐 창
    c.rect(2, 55, w - 4, 3, OUT)
    # 냄비(사골곰탕)
    c.rrect_outlined(26, 6, 18, 12, STEEL, OUT, 3); c.rect(28, 8, 14, 3, STEEL_L); c.rect(22, 10, 5, 2, OUT); c.rect(43, 10, 5, 2, OUT)
    return shadow(c, 0, h - 6, w, 6)

def prop_cabinet_upper():
    w, h = 144, 36; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h, IVORY, OUT, 2); c.rect(2, 2, w - 4, 3, IVORY_L)
    for i in range(4):
        x = 3 + i * 35
        c.outline(x, 5, 33, h - 9, IVORY_D); c.rect(x + 3, 8, 27, 2, IVORY_L)
        c.rect(x + (26 if i % 2 == 0 else 4), 20, 3, 6, STEEL_D)
    c.rect(1, h - 4, w - 2, 3, IVORY_D); c.hline(0, h - 1, w, OUT)
    return c

def prop_plant():
    w, h = 32, 52; c = Canvas(w, h)
    # 화분
    c.rrect_outlined(6, 34, 20, 16, POT, OUT, 3); c.rect(4, 32, 24, 5, POT); c.outline(4, 31, 24, 7, OUT); c.rect(6, 33, 20, 2, shade(POT, 1.2))
    c.rect(8, 44, 16, 4, POT_D)
    # 잎
    for (x, y, wd, ht, col) in [(11, 14, 10, 20, LEAF), (3, 18, 10, 14, LEAF_D), (19, 16, 11, 16, LEAF_D), (13, 4, 8, 14, LEAF_L), (6, 8, 8, 12, LEAF), (18, 6, 9, 12, LEAF)]:
        c.rrect_outlined(x, y, wd, ht, col, OUT, 3)
    c.vline(15, 8, 24, LEAF_D); c.vline(9, 12, 12, LEAF_D); c.vline(22, 10, 12, shade(LEAF_D, 1.1))
    return shadow(c, 4, h - 4, 24, 4)

def prop_clock():
    w, h = 22, 22; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h, hexc('#f4f1e8'), OUT, 6); c.rrect(1, 1, w - 2, 3, hexc('#ffffff'), 3)
    for (x, y) in [(10, 3), (10, 17), (3, 10), (17, 10)]: c.px(x, y, OUT); c.px(x + 1, y, OUT)
    c.vline(11, 5, 6, OUT); c.hline(11, 10, 5, OUT); c.px(11, 10, hexc('#e04040'))     # 8시 35분
    return c

def prop_calendar():
    w, h = 24, 32; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h, hexc('#f8f6ee'), OUT, 1)
    c.rect(1, 1, w - 2, 7, hexc('#e06b5a')); c.rect(6, 3, 12, 2, hexc('#ffd0c8'))
    for y in range(11, 29, 4):
        for x in range(3, 21, 5): c.px(x, y, hexc('#a0a0a0')); c.px(x + 1, y, hexc('#a0a0a0'))
    c.rect(12, 18, 4, 3, hexc('#e04040'))
    c.rect(w // 2 - 1, -1, 2, 3, OUT)
    return c

def prop_rug_living(w=128, h=88):
    c = Canvas(w, h)
    c.rrect(0, 0, w, h, OUT, 3); c.rrect(1, 1, w - 2, h - 2, RUG2, 3)
    c.rrect(5, 5, w - 10, h - 10, RUG2_D, 2); c.rrect(8, 8, w - 16, h - 16, RUG2, 2)
    c.outline(14, 14, w - 28, h - 28, RUG2_L)
    for x in range(20, w - 20, 12): c.px(x, 11, RUG2_G); c.px(x, h - 12, RUG2_G)
    for y in range(20, h - 20, 12): c.px(11, y, RUG2_G); c.px(w - 12, y, RUG2_G)
    c.hline(2, h - 3, w - 4, RUG2_D)
    return c

def prop_side_cabinet():
    """장식장 64x52: 위에 액자/화병"""
    w, h = 64, 52; c = Canvas(w, h)
    c.rrect_outlined(0, 20, w, 30, WOOD, OUT, 2); c.hline(2, 22, w - 4, WOOD_L)
    c.rect(1, 26, w - 2, 22, WOOD_D); c.outline(0, 25, w, 24, OUT)
    c.outline(4, 28, 26, 17, WOOD); c.outline(34, 28, 26, 17, WOOD); c.rect(26, 35, 2, 4, WOOD_L); c.rect(36, 35, 2, 4, WOOD_L)
    c.rect(2, 48, 6, 4, OUT); c.rect(w - 8, 48, 6, 4, OUT)
    c.rrect_outlined(8, 4, 18, 16, hexc('#3a3a44'), OUT, 1); c.rect(10, 6, 14, 12, hexc('#8fb3d9')); c.rect(12, 12, 10, 6, hexc('#7aa05a')); c.rect(15, 9, 4, 3, hexc('#f0d060'))   # 액자(가족사진 느낌)
    c.rrect_outlined(40, 6, 10, 14, hexc('#7fb1c9'), OUT, 3); c.rect(43, 2, 4, 5, OUT); c.rect(44, 3, 2, 3, hexc('#a7d0e0'))   # 화병
    c.px(45, 0, hexc('#e06b5a')); c.px(44, 1, hexc('#e06b5a')); c.px(46, 1, hexc('#e06b5a'))
    return shadow(c, 0, h - 6, w, 6)

def prop_frame():
    """복도 액자 28x22"""
    w, h = 28, 22; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h, DARKWOOD_L, OUT, 1); c.rect(3, 3, w - 6, h - 6, hexc('#cfe3f0'))
    c.rect(3, 12, w - 6, 7, hexc('#6f9a5a')); c.rect(9, 8, 8, 5, hexc('#a8b8c8')); c.px(20, 6, hexc('#ffe066'))
    return c

def main():
    out_t, out_p = 'assets/tiles', 'assets/props'
    os.makedirs(out_t, exist_ok=True); os.makedirs(out_p, exist_ok=True)
    tiles = {'wallpaper2': tile_wall2(), 'wallpaper2_base': tile_wall2_base(), 'floor_plank': tile_plank(0), 'floor_plank2': tile_plank(1),
             'floor_kitchen': tile_kitchen(0), 'floor_kitchen2': tile_kitchen(1)}
    props = {'doorway_left': prop_doorway_side(), 'doorway_right': prop_doorway_side(flip=True), 'tv': prop_tv(), 'sofa': prop_sofa(),
             'table_low': prop_table_low(), 'tart': prop_tart(), 'cushion': prop_cushion(), 'fridge': prop_fridge(),
             'counter_sink': prop_counter_sink(), 'stove': prop_stove(), 'cabinet_upper': prop_cabinet_upper(), 'plant': prop_plant(),
             'clock': prop_clock(), 'calendar': prop_calendar(), 'rug_living': prop_rug_living(), 'side_cabinet': prop_side_cabinet(), 'frame': prop_frame()}
    for n, c in tiles.items(): c.save(f'{out_t}/{n}.png')
    for n, c in props.items(): c.save(f'{out_p}/{n}.png')
    # 미리보기: 거실 26x13 조립 (부엌은 오른쪽 8칸)
    W, H = 26 * T, 13 * T
    pv = Canvas(W, H)
    for ty in range(13):
        for tx in range(26):
            if tx == 0 or tx == 25 or ty == 12: t = tile_wall_edge()
            elif ty < 2: t = tiles['wallpaper2']
            elif ty == 2: t = tiles['wallpaper2_base']
            elif tx >= 17: t = tiles['floor_kitchen' if (tx + ty) % 2 else 'floor_kitchen2']
            else: t = tiles['floor_plank' if (tx + ty) % 2 else 'floor_plank2']
            pv.blit(t, tx * T, ty * T)
    pv.blit(props['doorway_left'], 0, 176)
    pv.blit(props['cabinet_upper'], 572, 6); pv.blit(props['counter_sink'], 572, 60); pv.blit(props['stove'], 676, 60); pv.blit(props['fridge'], 736, 36)
    pv.blit(prop_window(), 420, 12); pv.blit(props['clock'], 300, 22); pv.blit(props['calendar'], 530, 20)
    pv.blit(props['tv'], 120, 52); pv.blit(props['side_cabinet'], 240, 60); pv.blit(props['plant'], 40, 74)
    pv.blit(props['rug_living'], 330, 210); pv.blit(props['sofa'], 110, 200)
    pv.blit(props['cushion'], 330 + 14, 250); pv.blit(props['cushion'], 330 + 90, 250); pv.blit(props['cushion'], 330 + 52, 282)
    pv.blit(props['table_low'], 354, 226); pv.blit(props['tart'], 382, 236)
    pv.image().resize((W * 2, H * 2), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'living_preview.png')
    print('tiles', list(tiles), 'props', list(props))

if __name__ == '__main__':
    main()
