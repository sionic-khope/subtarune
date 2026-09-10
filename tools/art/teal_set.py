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

def outline_silhouette(c, col=OUT):
    todo = []
    for y in range(c.h):
        for x in range(c.w):
            if c.a[y, x, 3] == 0 and any(0 <= x + dx < c.w and 0 <= y + dy < c.h and c.a[y + dy, x + dx, 3] != 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): todo.append((x, y))
    for (x, y) in todo: c.px(x, y, col)

def prop_banana():
    """바나나 32x20: 두 원 사이의 초승달(아래로 볼록), 위쪽 하이라이트·아래 그늘, 양 끝 갈색 꼭지, 검은 테두리"""
    import math
    Y = hexc('#f4cf3c'); YL = hexc('#fff2a6'); YD = hexc('#c9a027'); YDD = hexc('#9a7a1a'); B = hexc('#5a3a1a'); GR = hexc('#8aa64a')
    c = Canvas(32, 20)
    ocx, ocy, orad = 16.0, -3.0, 20.0      # 바깥 원(아래 가장자리)
    icx, icy, irad = 16.0, -8.0, 19.5      # 안쪽 원(위 가장자리)
    for y in range(20):
        for x in range(32):
            do = math.hypot(x + 0.5 - ocx, y + 0.5 - ocy); di = math.hypot(x + 0.5 - icx, y + 0.5 - icy)
            if do <= orad and di >= irad and 2 <= x <= 29:
                t = (do - irad) / max(0.01, orad - irad + (irad - di))   # 0 위쪽 → 1 아래쪽
                col = YL if (di - irad) < 1.2 else (YDD if (orad - do) < 1.0 else (YD if (orad - do) < 2.6 else Y))
                c.px(x, y, col)
    outline_silhouette(c)
    c.rect(1, 3, 3, 3, B); c.rect(28, 3, 3, 3, B); c.px(2, 6, GR); c.px(29, 6, GR)   # 꼭지
    return c

def prop_spitter():
    """꽃가루 뿜는 풀 2프레임(각 20x48, 가로로 이어 붙임): 얼굴 없는 길쭉한 흰 줄기 + 꼭대기 솜털, 뿜는 프레임은 솜털이 커지고 꽃가루가 흩어진다. 전부 흰색 계열."""
    W = hexc('#f6f6f6'); WS = hexc('#c9d3d3'); O = hexc('#0a1f1e')
    c = Canvas(40, 48)
    for f in range(2):
        ox = f * 20
        for y in range(12, 47):                                        # 줄기(살짝 휨)
            x = ox + 9 + int(round(1.5 * __import__('math').sin((y - 12) / 35 * 3.14)))
            c.px(x, y, W); c.px(x + 1, y, W); c.px(x + 2, y, WS)
        c.hline(ox + 4, 40, 6, W); c.px(ox + 3, 39, W); c.px(ox + 4, 39, W)          # 잎 2장
        c.hline(ox + 11, 33, 6, W); c.px(ox + 16, 32, W); c.px(ox + 17, 32, W)
        r = 5 if f == 0 else 6                                         # 꼭대기 솜털
        for y in range(48):
            for x in range(20):
                if (x - 10) ** 2 + (y - 9) ** 2 <= r * r: c.px(ox + x, y, W if x < 12 else WS)
        if f == 1:
            for (x, y) in ((2, 3), (17, 2), (1, 12), (18, 14), (9, 0), (15, 17)): c.px(ox + x, y, W)
        for y in range(48):                                            # 검정 테두리(검은 허공 위에서도 보이게)
            for x in range(20):
                if c.a[y, ox + x, 3] == 0 and any(0 <= x + dx < 20 and 0 <= y + dy < 48 and c.a[y + dy, ox + x + dx, 3] != 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): c.px(ox + x, y, O)
    return c

def tile_leaves():
    """낙엽 깔린 땅: 잔풀 땅 위에 연한 잎 조각(밝은 청록·크림색) 6~7개"""
    c = tile_ground(0)
    LF = [hexc('#8fd6c9'), hexc('#e8f0d8'), hexc('#5fb8a8')]
    for i, (x, y) in enumerate([(4, 6), (14, 3), (24, 9), (8, 19), (20, 22), (27, 26), (2, 27)]):
        col = LF[i % 3]
        c.px(x, y, col); c.px(x + 1, y, col); c.px(x + 2, y + 1, col); c.px(x + 1, y + 1, hexc('#3b8f84'))
    return c

def prop_tree_forest():
    """울창한 숲 나무 56x84: 뾰족한 잎 층 3단(어둠→밝음) + 짧은 줄기. 청록숲 3 에 여러 그루 겹쳐 심는다."""
    L = [hexc('#0b3330'), hexc('#124d48'), hexc('#1c6e66'), hexc('#2c9a8f')]; T = [hexc('#2a1e1a'), hexc('#4a3529')]
    c = Canvas(56, 84)
    c.rect(24, 66, 8, 18, T[1]); c.vline(25, 66, 18, T[0]); c.outline(24, 66, 8, 18, OUT)
    for (cy, r, li) in ((58, 24, 0), (44, 22, 1), (30, 18, 2), (18, 13, 3)):           # 잎 층: 아래가 넓고 어둡다
        for y in range(84):
            for x in range(56):
                dx, dy = (x - 28) / r, (y - cy) / (r * 0.7)
                if dx * dx + dy * dy <= 1: c.px(x, y, L[li])
    for (x, y) in ((10, 60), (44, 58), (18, 46), (36, 44), (24, 30), (30, 16), (22, 18), (40, 32)): c.px(x, y, hexc('#7fe0d2'))   # 반짝
    outline_silhouette(c)
    return c

def prop_bush():
    """풀숲 56x40: 둥근 덤불 덩어리 3개, 어두운 청록 + 밝은 잎 점. 미니언이 여기서 튀어나온다."""
    B = [hexc('#0f3a38'), hexc('#175550'), hexc('#2a8a82')]
    c = Canvas(56, 40)
    for (cx, cy, r, li) in ((16, 26, 15, 0), (40, 25, 16, 0), (28, 18, 16, 1), (12, 20, 10, 1), (44, 16, 10, 1), (28, 12, 9, 2)):
        for y in range(40):
            for x in range(56):
                if ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.8)) ** 2 <= 1: c.px(x, y, B[li])
    for (x, y) in ((8, 22), (20, 14), (34, 10), (46, 20), (26, 30), (40, 30), (14, 32)): c.px(x, y, hexc('#7fe0d2'))
    outline_silhouette(c)
    return c

def prop_toolbox():
    """공구상자 36x26: 빨간 철제 상자, 은색 걸쇠·손잡이, 살짝 열린 뚜껑 틈"""
    R = hexc('#b8332f'); RL = hexc('#e0554e'); RD = hexc('#7a1f1c'); S = hexc('#c9d3d3'); SD = hexc('#6f7a7a')
    c = Canvas(36, 26)
    c.rrect_outlined(2, 10, 32, 16, R, OUT, 2); c.hline(4, 12, 28, RL); c.rect(4, 22, 28, 2, RD)
    c.rrect_outlined(4, 4, 28, 8, R, OUT, 2); c.hline(6, 6, 24, RL)                  # 뚜껑
    c.hline(4, 11, 28, hexc('#2a0a0a'))                                             # 뚜껑 틈(살짝 열림)
    c.rrect_outlined(13, 0, 10, 5, S, OUT, 2); c.px(15, 2, SD); c.px(20, 2, SD)      # 손잡이
    c.rect(16, 12, 4, 5, S); c.outline(16, 12, 4, 5, OUT); c.px(17, 14, SD)         # 걸쇠
    c.rect(6, 15, 2, 6, SD); c.rect(28, 15, 2, 6, SD)                                # 모서리 쇠
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
    prop_statue().save('assets/props/statue_junhee.png'); prop_banana().save('assets/props/banana.png'); prop_spitter().save('assets/props/spitter.png')
    tile_leaves().save('assets/tiles/leaves_teal.png'); prop_tree_forest().save('assets/props/tree_forest.png'); prop_bush().save('assets/props/bush_teal.png'); prop_toolbox().save('assets/props/toolbox.png')
    from void10_set import prop_tree_big
    prop_tree_big(trunk=('#241a16', '#43312a', '#63483a', '#866652'), leaves=('#0b3330', '#124d48', '#1c6e66', '#2c9a8f', '#7fe0d2')).save('assets/props/tree_teal.png')
    print('teal set ok (+banana, tree_teal)')
