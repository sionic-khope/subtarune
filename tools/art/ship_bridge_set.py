#!/usr/bin/env python3
"""엄청대박인배 다리길(youngcle19, BUILD201 사용자 브리핑 “위로 쭉 가는 다리길 + 거대한 철문이 앞에 딱 붙어 있는”) 세트.
- tiles/youngcle_bridge_deck.png : 32×32 다리 바닥 타일 'N'(용광로 바닥 + 위아래 쇠 테두리·리벳 — 광장 다리 판 iron_bridge_plank 과 같은 무늬)
- props/ship_rail.png / ship_rail_r.png : 24×768 트러스 난간(왼쪽/오른쪽, 다리 양옆 용암 위에 놓인다). 128px 마다 청록 램프
- props/ship_hull_wall.png : 480×192 다리 끝 선체 벽(강판·배관·경고 띠)
- props/ship_gate.png : 192×160 거대한 철문(두 짝 위에 가로질러 붙은 명판 “엄청대박인배 조종실”·가로대·X 보강재·바퀴 잠금·표시등·경고 띠)
  명판은 철문 위 벽이 아니라 철문 윗부분에 — 철문 앞(y192)에 서면 카메라 위 20px 가 잘려 벽 위쪽은 안 보인다
실행: /usr/bin/python3 tools/art/ship_bridge_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from painter import Canvas, hexc

TILES, PROPS = Path('assets/tiles'), Path('assets/props')
IRON, IRON_D, IRON_L, IRON_HI = hexc('#3a4556'), hexc('#151a22'), hexc('#5c6a7e'), hexc('#8fa0b6')
OUT, NAVY, PANEL, EDGE, STEEL = (10, 19, 35), (21, 43, 72), (29, 66, 105), (63, 108, 150), (111, 146, 174)
GLOW, GLOW_D, GLOW_HI, YEL, RED, BLACK = hexc('#60f4e0'), hexc('#2fb8ad'), hexc('#bffff6'), hexc('#ffd23f'), hexc('#ff4a4a'), (18, 18, 20)
RIM, RIM_L, RIVET, RIVET_D = (21, 26, 34), (125, 142, 166), (170, 184, 204), (60, 70, 86)
DECK_ROWS = 24                     # 난간 길이(다리 rows 수) — youngcle19.py 의 다리 길이와 같게
FONT = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
NAME = '엄청대박인배 조종실'


def deck_tile() -> None:
    t = Canvas(32, 32)
    t.a = np.array(Image.open(TILES / 'youngcle_iron_blue.png').convert('RGBA')).copy()
    t.rect(0, 0, 32, 3, RIM); t.rect(0, 29, 32, 3, RIM)
    t.hline(0, 3, 32, RIM_L); t.hline(0, 28, 32, RIM_L)
    for x in (3, 27):
        for y in (6, 23):
            t.rect(x, y, 2, 2, RIVET); t.px(x + 1, y + 1, RIVET_D)
    t.save(TILES / 'youngcle_bridge_deck.png')


def rails() -> None:
    h = DECK_ROWS * 32
    r = Canvas(24, h)
    for x in (0, 18):                                                     # 바깥·안쪽 세로 현재
        r.rect(x, 0, 6, h, IRON); r.rect(x, 0, 1, h, IRON_L); r.rect(x + 5, 0, 1, h, IRON_D)
    for y in range(0, h, 32):                                             # 가로 이음 + X 보강재
        r.rect(6, y + 14, 12, 3, IRON_D); r.rect(6, y + 14, 12, 1, IRON_L)
        for i in range(12):
            for base in (2, 18):
                r.px(6 + i, y + base + i, IRON_L); r.px(6 + i, y + base + 1 + i, IRON_D)
                r.px(17 - i, y + base + i, IRON_L); r.px(17 - i, y + base + 1 + i, IRON_D)
    for y in range(48, h, 128):                                           # 청록 램프
        r.rrect_outlined(8, y, 8, 12, IRON_L, IRON_D, r=2); r.rect(10, y + 3, 4, 5, GLOW); r.rect(11, y + 4, 2, 2, GLOW_HI)
    r.save(PROPS / 'ship_rail.png'); r.flip().save(PROPS / 'ship_rail_r.png')


def name_plate(canvas: Canvas, x: int, y: int, w: int, h: int, size: int = 16) -> None:
    canvas.rrect_outlined(x, y, w, h, IRON_D, IRON_HI, r=3); canvas.rect(x + 2, y + 2, w - 4, 1, IRON_L)
    font = ImageFont.truetype(FONT, size)
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    tw = d.textlength(NAME, font=font)
    d.text(((w - tw) // 2, 2), NAME, font=font, fill=255)
    m = np.array(mask) > 110                                              # 안티앨리어싱 없이 도트로
    for yy in range(h):
        for xx in range(w):
            if m[yy, xx]:
                canvas.px(x + xx + 1, y + yy + 1, GLOW_D); canvas.px(x + xx, y + yy, GLOW)


def hull_wall() -> None:
    w = Canvas(480, 192)
    w.rect(0, 0, 480, 192, OUT); w.rect(0, 0, 480, 176, NAVY)
    for x in range(8, 472, 96):                                           # 강판 두 줄
        for y in (34, 100):
            w.rect(x, y, 88, 62, OUT); w.rect(x + 2, y + 2, 84, 58, PANEL); w.rect(x + 2, y + 2, 84, 2, EDGE)
            for bx in (x + 7, x + 79):
                for by in (y + 7, y + 51):
                    w.rect(bx, by, 3, 3, STEEL)
    w.rect(0, 92, 480, 10, OUT); w.rect(0, 93, 480, 2, STEEL); w.rect(0, 96, 480, 4, EDGE)   # 가로 배관
    for x in range(24, 480, 64):
        w.rect(x, 90, 6, 14, IRON_L); w.rect(x, 90, 6, 1, IRON_HI)
    w.rect(0, 176, 480, 16, OUT); w.rect(0, 176, 480, 2, STEEL)                             # 아래 문지방
    for x0 in (96, 344):                                                  # 문 양옆 경고 띠
        for x in range(x0, x0 + 40):
            for y in range(181, 190):
                w.px(x, y, YEL if ((x + y) // 4) % 2 == 0 else BLACK)
    w.save(PROPS / 'ship_hull_wall.png')


def gate() -> None:
    g = Canvas(192, 160)
    g.rrect_outlined(0, 0, 192, 160, IRON, IRON_D, r=4); g.rect(3, 2, 186, 3, IRON_HI)
    g.rect(10, 10, 172, 144, IRON_D)
    for lx in (12, 98):                                                   # 문짝 두 개
        g.rect(lx, 12, 82, 140, IRON); g.rect(lx, 12, 82, 2, IRON_L); g.rect(lx, 150, 82, 2, IRON_D)
        g.rect(lx, 12, 2, 140, IRON_L); g.rect(lx + 80, 12, 2, 140, IRON_D)
        for y in (44, 100):                                               # 가로대
            g.rect(lx + 4, y, 74, 6, IRON_D); g.rect(lx + 4, y, 74, 1, IRON_L); g.rect(lx + 4, y + 5, 74, 1, IRON_HI)
        for x in (lx + 6, lx + 73):                                       # 리벳
            for y in range(18, 148, 12):
                g.rect(x, y, 3, 3, IRON_HI); g.px(x + 2, y + 2, IRON_D)
        for i in range(63):                                               # X 보강재
            yy = 50 + round(i * 44 / 62)
            for x, c in ((lx + 10 + i, IRON_L), (lx + 72 - i, IRON_L)):
                g.px(x, yy, c); g.px(x, yy + 1, IRON_D); g.px(x, yy + 2, IRON_D)
        for x in range(lx + 4, lx + 78):                                  # 아래 경고 띠
            for y in range(132, 146):
                g.px(x, y, YEL if ((x + y) // 5) % 2 == 0 else BLACK)
        g.rect(lx + 4, 131, 74, 1, IRON_D); g.rect(lx + 4, 146, 74, 1, IRON_D)
    g.rect(94, 12, 4, 140, IRON_D); g.rect(95, 12, 1, 140, IRON_L)        # 가운데 틈
    for x in range(74, 119):                                              # 바퀴 잠금
        for y in range(58, 103):
            d = ((x - 96) ** 2 + (y - 80) ** 2) ** 0.5
            if 13 <= d <= 17: g.px(x, y, IRON_HI if d < 15.5 else IRON_L)
            elif 17 < d <= 18: g.px(x, y, IRON_D)
            elif d < 4.5: g.px(x, y, IRON_L)
            elif d < 5.5: g.px(x, y, IRON_D)
    g.rect(83, 79, 26, 2, IRON_HI); g.rect(95, 67, 2, 26, IRON_HI)         # 살
    for i in range(10):
        g.px(87 + i, 71 + i, IRON_HI); g.px(105 - i, 71 + i, IRON_HI); g.px(87 + i, 89 - i, IRON_HI); g.px(105 - i, 89 - i, IRON_HI)
    for x, c in ((40, GLOW), (60, GLOW), (120, GLOW), (140, RED)):      # 표시등(경고 띠 위, 문짝마다 둘)
        g.rrect_outlined(x, 118, 12, 8, c, IRON_D, r=2); g.rect(x + 3, 120, 3, 2, GLOW_HI if c is GLOW else hexc('#ffb0b0'))
    name_plate(g, 16, 14, 160, 24, size=15)                                # 명판: 두 짝 위에 가로질러 볼트로 붙은 “엄청대박인배 조종실”
    for x, y in ((20, 18), (170, 18), (20, 33), (170, 33)): g.rect(x, y, 2, 2, IRON_HI)
    g.save(PROPS / 'ship_gate.png')


if __name__ == '__main__':
    deck_tile(); rails(); hull_wall(); gate()
    print('wrote ship bridge set')
