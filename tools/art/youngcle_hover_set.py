#!/usr/bin/env python3
"""영클 비행 장치 시트(BUILD201 사용자 브리핑 “영클 스프라이트 그냥 걸어다니는 거 말고 아래에 소형 이동장치 타고 하늘을 날아다니게, [참고 이미지] 색깔 맞춰서”).
승인 시트 assets/sprites/youngcle.png(256×256, 64 셀, down/up/left/right, 발 y59)의 상체를 그대로 두고 y48 아래(반바지·다리)를 접시형 비행 장치가 가린다.
색은 참고 이미지의 탈것: 회녹 윗판 · 보라 띠 · 연두 사발 · 노란 꼭지 · 금색 로켓 두 개(빨강→노랑 불꽃) · 하늘색 번개.
프레임 4개는 불꽃 길이(3·6·4·7)와 번개 자리가 바뀐다 — 엔진은 CHARACTERS.hover 로 서 있어도 계속 돌린다(world.js Character.animate).
실행: /usr/bin/python3 tools/art/youngcle_hover_set.py  →  assets/sprites/youngcle_hover.png"""
from pathlib import Path
import numpy as np
from PIL import Image

SRC, OUT = Path('assets/sprites/youngcle.png'), Path('assets/sprites/youngcle_hover.png')
C, CUT = 64, 48                                            # 셀 크기 · 몸은 이 y 아래를 자른다(반바지부터 장치 안)
PLATE_L, PLATE, PLATE_D = (196, 204, 178), (146, 158, 132), (86, 96, 78)
SEAT, OUTL = (40, 46, 40), (28, 24, 32)
PURP_L, PURP, PURP_D = (166, 128, 214), (120, 84, 170), (72, 44, 112)
GRN_L, GRN, GRN_D = (176, 222, 96), (128, 180, 52), (78, 116, 34)
YEL, YEL_D = (240, 196, 48), (176, 132, 20)
GOLD_L, GOLD, GOLD_D = (255, 224, 110), (226, 176, 44), (150, 108, 20)
FL_R, FL_O, FL_Y = (240, 64, 36), (255, 140, 40), (255, 228, 96)
BOLT, BOLT_L = (96, 190, 255), (214, 244, 255)
FLAME_LEN = (3, 6, 4, 7)
# 접시 단면: (y, x0, x1, 색) — 위판 뒤쪽(몸 앞에 그림) / 앞쪽(몸 뒤에 그림)
BACK = [(41, 14, 49, OUTL), (42, 10, 53, PLATE_L), (43, 8, 55, PLATE_L), (44, 7, 56, PLATE), (45, 7, 56, PLATE), (46, 7, 56, PLATE), (47, 8, 55, PLATE_D)]
FRONT = [(48, 8, 55, PLATE_D), (49, 9, 54, PURP_L), (50, 9, 54, PURP), (51, 10, 53, PURP), (52, 10, 53, PURP), (53, 11, 52, PURP_D),
         (54, 12, 51, GRN_L), (55, 13, 50, GRN), (56, 15, 48, GRN), (57, 18, 45, GRN), (58, 21, 42, GRN_D), (59, 25, 38, GRN_D),
         (60, 28, 35, YEL), (61, 29, 34, YEL), (62, 30, 33, YEL_D), (63, 31, 32, YEL_D)]


class Cell:
    def __init__(self):
        self.a = np.zeros((C, C, 4), dtype=np.uint8)
    def px(self, x, y, c):
        if 0 <= x < C and 0 <= y < C: self.a[y, x] = (*c, 255)
    def row(self, y, x0, x1, c):
        for x in range(x0, x1 + 1): self.px(x, y, c)
    def rows(self, spec):
        for y, x0, x1, c in spec:
            self.row(y, x0, x1, c); self.px(x0 - 1, y, OUTL); self.px(x1 + 1, y, OUTL)
    def paste(self, img):
        src = np.array(img); h = src.shape[0]; m = src[:, :, 3] > 0; self.a[:h][m] = src[m]


def booster(cell: Cell, x0: int, flame: int) -> None:
    for y in range(45, 56):                                   # 금색 로켓 몸통
        cell.row(y, x0, x0 + 6, GOLD); cell.px(x0 + 1, y, GOLD_L); cell.px(x0 + 5, y, GOLD_D)
        cell.px(x0 - 1, y, OUTL); cell.px(x0 + 7, y, OUTL)
    cell.row(44, x0, x0 + 6, OUTL); cell.row(45, x0 + 1, x0 + 5, GOLD_L)
    cell.row(56, x0 - 1, x0 + 7, OUTL); cell.row(55, x0, x0 + 6, GOLD_D)
    for k in range(flame):                                    # 불꽃: 바깥 빨강 → 주황 → 노랑 심
        w = max(0, 3 - k // 2); y = 57 + k
        cell.row(y, x0 + 3 - w, x0 + 3 + w, FL_R)
        if w >= 1: cell.row(y, x0 + 3 - w + 1, x0 + 3 + w - 1, FL_O)
        if w >= 2 and k < flame - 2: cell.row(y, x0 + 3 - w + 2, x0 + 3 + w - 2, FL_Y)


def bolt(cell: Cell, pts) -> None:
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            cell.px(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), BOLT)
    for x, y in pts[1:-1]: cell.px(x, y, BOLT_L)


def make_cell(body: Image.Image, frame: int) -> Cell:
    cell = Cell()
    cell.rows(BACK); cell.row(42, 22, 41, SEAT); cell.row(43, 22, 41, SEAT); cell.row(44, 23, 40, SEAT); cell.row(45, 23, 40, SEAT); cell.row(46, 24, 39, SEAT); cell.row(47, 24, 39, SEAT)
    cell.paste(body.crop((0, 0, C, CUT)))
    cell.rows(FRONT)
    cell.row(49, 14, 22, PURP_L); cell.row(54, 16, 24, GRN_L)         # 하이라이트
    booster(cell, 1, FLAME_LEN[frame]); booster(cell, 56, FLAME_LEN[frame])
    if frame % 2 == 1:
        bolt(cell, [(2, 33), (6, 36), (3, 39), (7, 42)] if frame == 1 else [(61, 33), (57, 36), (60, 39), (56, 42)])
        cell.px(13 if frame == 1 else 50, 57, BOLT_L); cell.px(12 if frame == 1 else 51, 58, BOLT)
    return cell


def main() -> None:
    src = Image.open(SRC).convert('RGBA')
    out = Image.new('RGBA', (C * 4, C * 4), (0, 0, 0, 0))
    for r in range(4):
        for f in range(4):
            body = src.crop((f * C, r * C, (f + 1) * C, (r + 1) * C))
            out.paste(Image.fromarray(make_cell(body, f).a, 'RGBA'), (f * C, r * C))
    out.save(OUT)
    print('wrote', OUT, out.size)


if __name__ == '__main__':
    main()
