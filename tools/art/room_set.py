"""형섭의 반지하 방 세트 — 델타룬 스타일(어두운 외곽선 + 2톤 명암 + 둥근 모서리)로 직접 그린 타일/소품.
실행: python3 tools/art/room_set.py  → assets/tiles/*.png (32x32), assets/props/*.png, 미리보기 PNG
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from painter import Canvas, hexc, shade
from PIL import Image

T = 32
# ── 팔레트 (반지하: 누렇게 바랜 벽지, 장판 바닥) ──
OUT   = hexc('#2b1d1e')   # 외곽선
WALL  = hexc('#e9d8a6'); WALL_D = hexc('#d9c58f'); WALL_L = hexc('#f4e7bf')
BASE  = hexc('#8a5a3c'); BASE_D = hexc('#6b4229'); BASE_L = hexc('#a8714b')
FLOOR = hexc('#c9a26a'); FLOOR_D = hexc('#b8905a'); FLOOR_L = hexc('#d7b47c'); FLOOR_LINE = hexc('#a07c4c')
WOOD  = hexc('#a5683f'); WOOD_D = hexc('#7e4d2c'); WOOD_L = hexc('#c2854f')
SHEET = hexc('#f2efe6'); SHEET_D = hexc('#d9d3c4')
BLANK = hexc('#5b7fb5'); BLANK_D = hexc('#46679a'); BLANK_L = hexc('#7797c8')
PILLOW = hexc('#fbf8f0')
SCREEN = hexc('#1c2233'); SCREEN_L = hexc('#3a6fd8'); SCREEN_G = hexc('#79b8ff')
PLASTIC = hexc('#3a3a44'); PLASTIC_L = hexc('#5a5a66')
GLASS = hexc('#a9d3ee'); GLASS_L = hexc('#dff1fb'); NIGHT = hexc('#2b3358')
RUG = hexc('#b34a4a'); RUG_D = hexc('#8f3838'); RUG_L = hexc('#d86a5a'); RUG_G = hexc('#e6c26a')

def tile_wall():
    c = Canvas(T, T); c.rect(0, 0, T, T, WALL)
    # 벽지 무늬: 세로 줄 + 작은 점
    for x in range(0, T, 8): c.vline(x, 0, T, WALL_D)
    for y in range(4, T, 8):
        for x in range(4, T, 8): c.px(x, y, WALL_L); c.px(x + 1, y, WALL_L)
    return c

def tile_wall_base():
    c = tile_wall()
    # 하단 걸레받이
    c.rect(0, 22, T, 10, BASE); c.hline(0, 22, T, BASE_L); c.hline(0, 23, T, BASE_L); c.hline(0, 31, T, BASE_D); c.hline(0, 30, T, BASE_D)
    c.hline(0, 21, T, shade(WALL_D, 0.9))
    return c

def tile_floor(variant=0):
    c = Canvas(T, T); c.rect(0, 0, T, T, FLOOR)
    # 장판: 가로 널 결 (연한 선) + 이음새(진한 선) + 미세 점
    for y in (0, 16): c.hline(0, y, T, FLOOR_LINE)
    for y in (1, 17): c.hline(0, y, T, FLOOR_L)
    c.vline(T // 2 if variant else 8, 0, 16, FLOOR_LINE); c.vline(24 if variant else T // 2 + 4, 16, 16, FLOOR_LINE)
    for (x, y) in [(6, 9), (19, 5), (12, 24), (25, 21)][variant % 2:][:3]:
        c.px(x, y, FLOOR_D); c.px(x + 1, y, FLOOR_D)
    return c

def shadow(c, x, y, w, h):
    """소품 바닥 그림자(디더) — 소품 캔버스 밖으로 나가므로 별도 캔버스에 합성해서 반환"""
    n = Canvas(c.w + 4, c.h + 4)
    n.dither(x + 2, y + 2, w, h, (60, 40, 30), 2)
    n.blit(c, 2, 0)
    return n

def prop_rug(w=96, h=64):
    c = Canvas(w, h)
    c.rrect(0, 0, w, h, OUT, 3); c.rrect(1, 1, w - 2, h - 2, RUG, 3)
    c.rrect(4, 4, w - 8, h - 8, RUG_D, 2); c.rrect(6, 6, w - 12, h - 12, RUG, 2)
    # 가운데 무늬(마름모)
    cx, cy = w // 2, h // 2
    for i in range(10):
        c.hline(cx - i, cy - 9 + i, i * 2 + 1, RUG_G); c.hline(cx - i, cy + 9 - i, i * 2 + 1, RUG_G)
    for i in range(6):
        c.hline(cx - i, cy - 5 + i, i * 2 + 1, RUG_L); c.hline(cx - i, cy + 5 - i, i * 2 + 1, RUG_L)
    c.hline(2, h - 3, w - 4, RUG_D)   # 아래 그림자
    return c

def prop_bed():
    w, h = 64, 96; c = Canvas(w, h)
    # 프레임
    c.rrect(0, 0, w, h, OUT, 3); c.rrect(1, 1, w - 2, h - 2, WOOD, 3)
    c.rect(2, 2, w - 4, 10, WOOD_L)                       # 헤드보드 윗면
    c.rect(2, 12, w - 4, 2, WOOD_D)
    # 매트리스/시트
    c.rect(4, 14, w - 8, h - 22, SHEET); c.rect(4, 14, w - 8, 2, SHEET_D)
    # 베개
    c.rrect_outlined(10, 17, w - 20, 14, PILLOW, OUT, 3); c.hline(13, 29, w - 26, SHEET_D)
    # 이불 (접힌 윗단 + 주름)
    c.rect(4, 36, w - 8, h - 44, BLANK); c.rect(4, 36, w - 8, 5, BLANK_L); c.hline(4, 41, w - 8, BLANK_D)
    for y in (52, 64, 76): c.hline(8, y, w - 16, BLANK_D)
    c.dither(6, 44, 10, h - 54, BLANK_D, 3)
    # 발치 프레임
    c.rect(2, h - 8, w - 4, 6, WOOD_L); c.rect(2, h - 2, w - 4, 1, WOOD_D)
    # 다리
    c.rect(2, h - 1, 5, 1, OUT); c.rect(w - 7, h - 1, 5, 1, OUT)
    # 이불 접힌 부분 그림자 + 베개 그림자
    c.hline(5, 42, w - 10, BLANK_D); c.hline(11, 31, w - 22, SHEET_D)
    return shadow(c, 0, h - 6, w, 6)

def prop_desk_pc():
    w, h = 64, 64; c = Canvas(w, h)
    # 책상 상판
    c.rrect_outlined(0, 30, w, 18, WOOD_L, OUT, 2); c.hline(2, 32, w - 4, shade(WOOD_L, 1.1))
    c.rect(1, 46, w - 2, 12, WOOD); c.outline(0, 45, w, 14, OUT)
    c.rect(6, 49, 22, 7, WOOD_D); c.outline(5, 48, 24, 9, OUT); c.rect(15, 52, 4, 1, WOOD_L)   # 서랍
    c.rect(2, 58, 6, 6, OUT); c.rect(w - 8, 58, 6, 6, OUT)                                    # 다리
    # 모니터
    c.rrect_outlined(14, 4, 34, 26, PLASTIC, OUT, 3); c.rect(17, 7, 28, 19, SCREEN)
    c.rect(19, 9, 24, 15, SCREEN_L); c.rect(21, 11, 20, 3, SCREEN_G); c.rect(21, 16, 12, 2, SCREEN_G); c.rect(21, 20, 16, 2, SCREEN_G)
    c.rect(27, 30, 8, 3, PLASTIC); c.rect(24, 33, 14, 2, OUT)
    # 키보드 / 마우스
    c.rrect_outlined(12, 36, 26, 7, PLASTIC_L, OUT, 1); c.dither(14, 38, 22, 3, OUT, 2)
    c.rrect_outlined(44, 36, 8, 10, PLASTIC_L, OUT, 3); c.px(48, 38, OUT)
    return shadow(c, 0, h - 6, w, 6)

def prop_shelf():
    w, h = 64, 28; c = Canvas(w, h)
    c.rect(0, 18, w, 6, WOOD); c.outline(0, 17, w, 8, OUT); c.hline(1, 18, w - 2, WOOD_L)
    c.rect(6, 25, 4, 3, OUT); c.rect(w - 10, 25, 4, 3, OUT)   # 받침
    # 향수병 2, 약통, 바세린
    c.rrect_outlined(6, 6, 8, 12, hexc('#d9a7e0'), OUT, 2); c.rect(9, 3, 2, 4, OUT)
    c.rrect_outlined(17, 8, 7, 10, hexc('#a7d0e0'), OUT, 2); c.rect(19, 5, 3, 4, OUT)
    c.rrect_outlined(30, 5, 10, 13, hexc('#f4f1e8'), OUT, 2); c.rect(30, 5, 10, 3, hexc('#e06b5a')); c.rect(33, 11, 4, 4, hexc('#e06b5a'))
    c.rrect_outlined(46, 9, 12, 9, hexc('#4a6fd0'), OUT, 3); c.rect(48, 7, 8, 3, hexc('#f0f0f0')); c.outline(47, 6, 10, 4, OUT)
    return c

def prop_door():
    w, h = 40, 52; c = Canvas(w, h)
    c.rrect(0, 0, w, h, OUT, 2); c.rect(2, 2, w - 4, h - 2, WOOD)
    c.rect(4, 4, w - 8, h - 4, WOOD_L)
    c.outline(7, 8, w - 14, 16, WOOD_D); c.outline(7, 28, w - 14, 18, WOOD_D)   # 문짝 패널
    c.rect(w - 11, 26, 4, 2, hexc('#f0d060')); c.px(w - 9, 26, OUT)             # 손잡이
    c.rect(0, h - 2, w, 2, OUT)
    return c

def prop_window():
    w, h = 48, 44; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h, WOOD_L, OUT, 2)
    c.rect(4, 4, w - 8, h - 12, NIGHT)                       # 반지하 밤 창
    c.rect(6, 6, w - 12, 8, shade(NIGHT, 1.3))
    for (x, y) in [(10, 9), (20, 16), (31, 11), (37, 20), (15, 22)]: c.px(x, y, GLASS_L)
    c.rect(w // 2 - 1, 4, 2, h - 12, WOOD_L); c.rect(4, h // 2 - 4, w - 8, 2, WOOD_L)   # 창살
    c.rect(2, h - 8, w - 4, 6, WOOD); c.hline(2, h - 8, w - 4, WOOD_L); c.hline(2, h - 3, w - 4, WOOD_D)   # 창턱
    # 바깥 담장 실루엣 (반지하: 창 위쪽에 땅)
    c.rect(4, 4, w - 8, 3, hexc('#4a4a55'))
    return c

def prop_poster():
    w, h = 24, 30; c = Canvas(w, h)
    c.rrect_outlined(0, 0, w, h, hexc('#f4efe0'), OUT, 1)
    c.rect(4, 5, 16, 12, hexc('#e06b5a')); c.rect(6, 7, 12, 8, hexc('#f0d060')); c.rect(9, 9, 6, 4, OUT)
    c.hline(4, 21, 16, OUT); c.hline(4, 24, 10, OUT)
    return c

def main():
    out_t, out_p = 'assets/tiles', 'assets/props'
    os.makedirs(out_t, exist_ok=True); os.makedirs(out_p, exist_ok=True)
    tiles = {'wallpaper': tile_wall(), 'wallpaper_base': tile_wall_base(), 'floor_vinyl': tile_floor(0), 'floor_vinyl2': tile_floor(1)}
    props = {'rug': prop_rug(), 'bed': prop_bed(), 'desk_pc': prop_desk_pc(), 'shelf': prop_shelf(), 'door': prop_door(), 'window': prop_window(), 'poster': prop_poster()}
    for n, c in tiles.items(): c.save(f'{out_t}/{n}.png')
    for n, c in props.items(): c.save(f'{out_p}/{n}.png')
    # 미리보기: 방 조립 (14x10 타일)
    W, H = 14 * T, 10 * T
    pv = Canvas(W, H)
    for ty in range(10):
        for tx in range(14):
            t = tiles['wallpaper'] if ty < 2 else tiles['wallpaper_base'] if ty == 2 else tiles['floor_vinyl' if (tx + ty) % 2 else 'floor_vinyl2']
            pv.blit(t, tx * T, ty * T)
    pv.blit(props['window'], 200, 12); pv.blit(props['poster'], 60, 20); pv.blit(props['shelf'], 330, 44)
    pv.blit(props['bed'], 336, 84); pv.blit(props['desk_pc'], 24, 70); pv.blit(props['rug'], 160, 150); pv.blit(props['door'], 100, 44)
    pv.image().resize((W * 3, H * 3), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else 'room_preview.png')
    print('tiles', list(tiles), 'props', list(props))

if __name__ == '__main__':
    main()
