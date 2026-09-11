# -*- coding: utf-8 -*-
"""청록숲 고대 사원 세트 (사용자 브리핑 2026-09-11 "고대 사원의 돌 같은 바닥이랑 그런 것들 바이브"). 청록 팔레트 안의 돌: 이끼 낀 판석 바닥 + 기둥·부서진 기둥·석등·떨어진 돌덩이·사원 문(아치).
타일 32px: stone_teal(판석) / stone_teal_moss(이끼·금 간 판석) — 걸을 수 있음.  소품: pillar 24x72, pillar_broken 24x40, stone_lantern 20x44, stone_block 30x22, temple_gate 128x96.
실행: /usr/bin/python3 tools/art/temple_set.py → assets/tiles/stone_teal*.png, assets/props/*.png
"""
import sys
sys.path.insert(0, 'tools/art')
from painter import Canvas, hexc
T = 32
S0, S1, S2, S3 = hexc('#223d3c'), hexc('#3b5957'), hexc('#557675'), hexc('#7a9996')   # 돌: 어둠→밝음(청록 톤)
SEAM = hexc('#16302f'); MOSS = hexc('#2f8a5e'); MOSS_L = hexc('#4fb07a'); OUT = hexc('#061a19'); GLOW = hexc('#ffd98a'); GLOW_D = hexc('#e0a44a')

def tile_stone(variant=0):
    """판석 바닥: 큰 돌판 2×2(어긋난 줄눈) + 밝은 모서리 + 미세한 흠집"""
    c = Canvas(T, T); c.rect(0, 0, T, T, S1)
    off = 0 if variant == 0 else 8
    for y in (0, 16): c.hline(0, y + (0 if y == 0 else 0), T, SEAM)                   # 가로 줄눈
    c.vline((16 + off) % T, 0, 16, SEAM); c.vline((0 + off) % T, 16, 16, SEAM)       # 세로 줄눈(위·아래 줄이 어긋남)
    for (x0, y0, w) in ((1, 1, 14), (17, 1, 14), (1, 17, 14), (17, 17, 14)):        # 돌판 윗변·왼변 하이라이트
        c.hline((x0 + off) % T if y0 == 1 else x0, y0, min(w, T - x0), S2); c.vline((x0 + off) % T if y0 == 1 else x0, y0, 14, S2)
    chips = [(5, 6), (22, 10), (11, 24), (27, 21)] if variant == 0 else [(9, 3), (25, 13), (4, 27), (19, 22)]
    for (x, y) in chips: c.px(x, y, S0); c.px(x + 1, y, S0)
    for (x, y) in ([(13, 9), (28, 26)] if variant == 0 else [(3, 12), (21, 29)]): c.px(x, y, S3)
    return c

def tile_stone_moss():
    """이끼 낀 판석: 금 + 이끼 덩어리 셋"""
    c = tile_stone(1)
    for i in range(7): c.px(6 + i, 4 + (i // 2), S0)                               # 금
    for i in range(5): c.px(20 + i, 20 + i, S0)
    for (x, y) in ((3, 10), (18, 6), (24, 24)):
        c.rrect(x, y, 6, 4, MOSS, 2); c.px(x + 1, y, MOSS_L); c.px(x + 4, y + 1, MOSS_L); c.px(x + 2, y + 3, MOSS)
    return c

def prop_pillar():
    """돌기둥 24x72: 받침 + 홈 파인 몸통 + 머리(주두), 금 한 줄. 밑동 히트박스 20x10 (맵에서 w/h/ix/iy)"""
    c = Canvas(24, 72)
    c.rrect_outlined(2, 62, 20, 10, S1, OUT, 2); c.hline(4, 64, 16, S2)                      # 받침
    c.rrect_outlined(5, 12, 14, 52, S1, OUT, 2)                                              # 몸통
    for x in (8, 12, 16): c.vline(x, 15, 46, S0)                                             # 세로 홈
    c.vline(6, 14, 48, S2); c.hline(7, 13, 10, S2)
    c.rrect_outlined(1, 4, 22, 10, S1, OUT, 2); c.hline(3, 6, 18, S2); c.rect(3, 11, 18, 2, S0)   # 주두
    for i in range(4): c.px(13 + i, 30 + i, S0)                                              # 금
    c.px(9, 50, MOSS); c.px(10, 51, MOSS_L); c.px(15, 22, MOSS)
    return c

def prop_pillar_broken():
    """부서진 기둥 24x40: 받침 + 몸통 위가 들쭉날쭉하게 깨짐"""
    c = Canvas(24, 40)
    c.rrect_outlined(2, 30, 20, 10, S1, OUT, 2); c.hline(4, 32, 16, S2)
    c.rrect_outlined(5, 10, 14, 22, S1, OUT, 2)
    for x in (8, 12, 16): c.vline(x, 14, 16, S0)
    c.vline(6, 12, 18, S2)
    tops = [10, 7, 9, 5, 8, 6, 10, 8, 7, 9, 6, 8, 10, 9]                                     # 깨진 윗선
    for i, ty in enumerate(tops): c.rect(5 + i, ty, 1, 11 - ty + 1, S1); c.px(5 + i, ty - 1, OUT)
    c.rect(5, 10, 14, 1, S2)
    for (x, y) in ((7, 18), (16, 24)): c.rrect(x, y, 4, 3, MOSS, 1); c.px(x + 1, y, MOSS_L)
    c.rrect_outlined(0, 34, 6, 5, S2, OUT, 1)                                                # 떨어진 조각
    return c

def prop_stone_lantern():
    """석등 20x44: 받침 → 기둥 → 불 집(따뜻한 빛 구멍) → 지붕"""
    c = Canvas(20, 44)
    c.rrect_outlined(2, 38, 16, 6, S1, OUT, 2); c.hline(4, 40, 12, S2)
    c.rrect_outlined(7, 24, 6, 15, S1, OUT, 1); c.vline(8, 25, 13, S2)
    c.rrect_outlined(3, 12, 14, 13, S1, OUT, 2); c.hline(5, 14, 10, S2)
    c.rect(6, 15, 8, 7, GLOW_D); c.rect(7, 16, 6, 5, GLOW); c.px(8, 17, hexc('#fff3c4'))     # 빛
    for i in range(5): c.hline(4 + i, 7 + i, 12 - 2 * i if i < 4 else 4, S1)                 # 지붕(위로 좁아짐)
    for i in range(5): c.px(3 + i, 8 + i, OUT); c.px(16 - i, 8 + i, OUT)
    c.hline(4, 12, 12, OUT); c.rect(9, 4, 2, 3, S2); c.px(9, 3, OUT); c.px(10, 3, OUT)
    return c

def prop_stone_block():
    """떨어진 돌덩이 30x22: 각진 덩어리 + 이끼"""
    c = Canvas(30, 22)
    c.rrect_outlined(1, 4, 28, 18, S1, OUT, 4); c.rrect(4, 6, 12, 6, S2, 2); c.rect(6, 15, 20, 4, S0)
    for i in range(5): c.px(18 + i, 8 + i, S0)
    c.rrect(20, 5, 6, 3, MOSS, 1); c.px(21, 5, MOSS_L); c.px(3, 13, MOSS)
    return c

def prop_temple_gate():
    """사원 문 128x96: 양쪽 굵은 기둥 + 상인방(가로 돌) + 가운데 문양. 길 위를 가로지르는 아치 — 맵에서 sortY 0(항상 뒤), 충돌 없음"""
    c = Canvas(128, 96)
    for x0 in (4, 100):
        c.rrect_outlined(x0, 20, 24, 76, S1, OUT, 3); c.vline(x0 + 4, 24, 68, S2); c.vline(x0 + 12, 24, 68, S0); c.vline(x0 + 18, 24, 68, S0)
        c.rrect_outlined(x0 - 2, 86, 28, 10, S1, OUT, 2); c.hline(x0, 88, 24, S2)
        c.rrect_outlined(x0 - 2, 14, 28, 9, S1, OUT, 2); c.hline(x0, 16, 24, S2)
    c.rrect_outlined(0, 0, 128, 16, S1, OUT, 3); c.hline(2, 2, 124, S2); c.rect(2, 12, 124, 2, S0)   # 상인방
    for x in range(10, 118, 12): c.rect(x, 5, 6, 5, S0); c.px(x + 1, 6, S2)                       # 문양 줄
    c.rrect_outlined(52, 14, 24, 12, S1, OUT, 2); c.rect(58, 17, 12, 6, GLOW_D); c.rect(60, 18, 8, 4, GLOW)   # 가운데 표식(빛)
    for (x, y) in ((8, 60), (108, 40), (112, 70)): c.rrect(x, y, 5, 3, MOSS, 1); c.px(x + 1, y, MOSS_L)
    return c

def prop_temple_door(opened=False):
    """거대한 사원 돌문 96x288(옆면 = 광장 오른쪽 끝을 막는 문의 정면): 굵은 돌 틀 + 두 짝 문(세로 이음새, 징, 가운데 빛나는 표식) + 이끼. opened=True 면 두 짝이 안으로 열려 어두운 통로 + 테두리 빛"""
    W_, H_ = 96, 288
    c = Canvas(W_, H_)
    c.rrect_outlined(0, 0, W_, H_, S1, OUT, 4)                                                   # 틀
    for x in (6, 12): c.vline(x, 6, H_ - 12, S2)
    for x in (W_ - 7, W_ - 13): c.vline(x, 6, H_ - 12, S0)
    c.rect(4, 4, W_ - 8, 10, S2); c.rect(4, 14, W_ - 8, 2, S0)                                   # 상인방
    for x in range(10, W_ - 12, 14): c.rect(x, 6, 6, 5, S0)
    c.rect(4, H_ - 14, W_ - 8, 10, S0); c.hline(6, H_ - 14, W_ - 12, S2)                          # 문턱
    ix, iy, iw, ih = 18, 20, W_ - 36, H_ - 40                                                    # 문 짝 영역
    if not opened:
        c.rrect_outlined(ix, iy, iw, ih, S1, OUT, 3)
        c.vline(ix + iw // 2, iy + 2, ih - 4, OUT); c.vline(ix + iw // 2 - 1, iy + 2, ih - 4, S0)   # 이음새
        for yy in range(iy + 14, iy + ih - 10, 26):                                              # 징
            for xx in (ix + 8, ix + iw // 2 - 12, ix + iw // 2 + 8, ix + iw - 12): c.rrect(xx, yy, 5, 5, S3, 2); c.px(xx + 1, yy + 1, hexc('#b8d0cd'))
        for yy in range(iy + 8, iy + ih - 8, 52): c.hline(ix + 3, yy, iw - 6, S2)                # 가로 판 줄
        ex, ey = ix + iw // 2 - 14, iy + ih // 2 - 18                                            # 가운데 표식(빛)
        c.rrect_outlined(ex, ey, 28, 36, S0, OUT, 4); c.rrect(ex + 6, ey + 8, 16, 20, GLOW_D, 4); c.rrect(ex + 9, ey + 12, 10, 12, GLOW, 3); c.px(ex + 12, ey + 15, hexc('#fff3c4'))
        for (x, y) in ((ix + 4, iy + ih - 30), (ix + iw - 14, iy + 30), (ix + iw - 10, iy + ih - 50)): c.rrect(x, y, 7, 4, MOSS, 1); c.px(x + 2, y, MOSS_L)
    else:
        c.rect(ix, iy, iw, ih, hexc('#050d0c'))                                                  # 어두운 통로
        for k in range(6): c.rect(ix + k, iy + k, iw - 2 * k, 1, S0 if k < 3 else hexc('#0b1a19'))
        c.rect(ix, iy, 8, ih, S1); c.rect(ix + iw - 8, iy, 8, ih, S1)                            # 안으로 열린 두 짝(옆면만 보임)
        c.vline(ix + 2, iy + 4, ih - 8, S2); c.vline(ix + iw - 3, iy + 4, ih - 8, S0)
        for yy in range(iy + 20, iy + ih - 20, 40): c.px(ix + 4, yy, S3); c.px(ix + iw - 5, yy, S3)
        c.rect(ix + 8, iy + ih - 6, iw - 16, 6, S0); c.hline(ix + 8, iy + ih - 6, iw - 16, S2)   # 안쪽 바닥 끝
        c.rrect(ix + iw // 2 - 8, iy + 6, 16, 10, GLOW_D, 3); c.rrect(ix + iw // 2 - 5, iy + 8, 10, 6, GLOW, 2)   # 통로 위 빛
    return c

if __name__ == '__main__':
    prop_temple_door(False).save('assets/props/temple_door.png'); prop_temple_door(True).save('assets/props/temple_door_open.png')
    tile_stone(0).save('assets/tiles/stone_teal.png'); tile_stone_moss().save('assets/tiles/stone_teal_moss.png')
    prop_pillar().save('assets/props/pillar.png'); prop_pillar_broken().save('assets/props/pillar_broken.png'); prop_stone_lantern().save('assets/props/stone_lantern.png')
    prop_stone_block().save('assets/props/stone_block.png'); prop_temple_gate().save('assets/props/temple_gate.png')
    print('temple set ok')
