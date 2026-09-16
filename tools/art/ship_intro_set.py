#!/usr/bin/env python3
"""조종실 입장 연출(youngcle20, BUILD202 사용자 브리핑) 소품·이펙트.
- props/ship_cannon.png     : 96×48 벽에서 드르르륵 나오는 강철 대포(오른쪽을 향함, 포구 오른쪽 끝)
- props/ship_cannonball.png : 28×28 큰 검은 포탄(사용자 “포탄 좀 크게 검은 동그라미”)
- fx/cannon_smoke.png       : 6프레임 띠 6×(64×64) 발사 연기(회색 뭉게구름이 커지며 옅어짐) — {boom} 노드
- props/ship_floor_logo.png : 128×128 바닥 강철 원판 + 영클 얼굴 양각(사용자 “화면 중앙엔 영클 얼굴로 박혀 있는 철 색깔 로고”) — 걷는 장식
- props/lava_cage_open.png  : 136×360 밧줄 철창의 문 열린 그림(가운데 살 두 개가 위로 올라감)
실행: /usr/bin/python3 tools/art/ship_intro_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np
from PIL import Image
from painter import Canvas, hexc

PROPS, FX = Path('assets/props'), Path('assets/fx')
IRON, IRON_D, IRON_L, IRON_HI = hexc('#3a4556'), hexc('#151a22'), hexc('#5c6a7e'), hexc('#8fa0b6')
GLOW, RED, YEL, BLACK = hexc('#60f4e0'), hexc('#ff4a4a'), hexc('#ffd23f'), (14, 14, 18)


def cannon() -> None:
    c = Canvas(96, 48)
    c.rrect_outlined(0, 8, 40, 40, IRON, IRON_D, r=4); c.rect(2, 10, 36, 2, IRON_HI)          # 벽 쪽 받침(궤도 상자)
    for y in (20, 30, 40): c.rect(4, y, 32, 2, IRON_D)
    c.rrect_outlined(28, 14, 64, 26, IRON_L, IRON_D, r=6); c.rect(32, 16, 56, 3, IRON_HI)       # 포신
    c.rect(32, 34, 56, 3, IRON_D)
    for x in (44, 62): c.rect(x, 14, 4, 26, IRON_D); c.rect(x + 1, 15, 2, 24, IRON)              # 포신 띠
    c.rrect_outlined(82, 10, 14, 34, IRON, IRON_D, r=4); c.rect(88, 16, 6, 22, BLACK)            # 포구
    c.rrect_outlined(36, 4, 18, 12, IRON, IRON_D, r=3); c.rect(40, 7, 10, 3, RED); c.rect(42, 8, 3, 1, hexc('#ffb0b0'))   # 위 표시등
    c.rect(20, 38, 12, 10, IRON_D); c.rect(22, 40, 8, 6, IRON_L)                                  # 바퀴
    c.save(PROPS / 'ship_cannon.png')


def cannonball() -> None:
    b = Canvas(28, 28)
    for x in range(28):
        for y in range(28):
            d = ((x - 13.5) ** 2 + (y - 13.5) ** 2) ** 0.5
            if d <= 13: b.px(x, y, BLACK if d > 4.5 or x > 12 or y > 12 else hexc('#3d3d48'))
            if d <= 13 and d > 12: b.px(x, y, (0, 0, 0))
    b.rect(8, 7, 3, 2, hexc('#5a5a68')); b.rect(7, 9, 2, 2, hexc('#5a5a68'))                    # 하이라이트
    b.save(PROPS / 'ship_cannonball.png')


def smoke() -> None:
    frames = []
    greys = [hexc('#f2f2f2'), hexc('#c9ccd2'), hexc('#9aa0aa'), hexc('#6b7280')]
    for k in range(6):
        f = Canvas(64, 64)
        r = 8 + k * 5                                                                         # 커지며
        blobs = [(32, 32, r), (32 - r // 2, 34, r * 2 // 3), (32 + r // 2, 30, r * 2 // 3), (32, 32 - r // 2, r // 2)]
        for x in range(64):
            for y in range(64):
                inside = [((x - bx) ** 2 + (y - by) ** 2) ** 0.5 / max(1, br) for bx, by, br in blobs]
                m = min(inside)
                if m <= 1.0:
                    tone = 0 if m < 0.45 else 1 if m < 0.75 else 2
                    if k >= 4 and (x + y + k) % 2: continue                                    # 옅어짐(디더)
                    f.px(x, y, greys[min(3, tone + (1 if k >= 3 else 0))])
        frames.append(f)
    s = Canvas(64 * 6, 64)
    for i, f in enumerate(frames): s.blit(f, i * 64, 0)
    FX.mkdir(parents=True, exist_ok=True); s.save(FX / 'cannon_smoke.png')


def floor_logo() -> None:
    c = Canvas(128, 128)
    for x in range(128):                                                                      # 강철 원판
        for y in range(128):
            d = ((x - 64) ** 2 + (y - 64) ** 2) ** 0.5
            if d <= 63: c.px(x, y, IRON_D if d > 61 else IRON_L if d > 57 else IRON_HI if d > 55 else IRON)
    for a in range(0, 360, 30):                                                                # 테두리 볼트
        import math
        x, y = int(64 + 59 * math.cos(math.radians(a))), int(64 + 59 * math.sin(math.radians(a)))
        c.rect(x - 1, y - 1, 3, 3, IRON_HI); c.px(x + 1, y + 1, IRON_D)
    # 영클 얼굴 양각: 승인 걷기 시트 정면 0번 프레임의 머리(y 0~30)를 3배로, 밝기에 따라 강철 3톤
    sh = Image.open('assets/sprites/youngcle.png').convert('RGBA').crop((16, 0, 48, 32))
    big = np.array(sh.resize((96, 96), Image.NEAREST))
    for y in range(96):
        for x in range(96):
            r, g, b, a = big[y, x]
            if a == 0: continue
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            tone = IRON_D if lum < 70 else IRON_L if lum < 150 else IRON_HI
            c.px(16 + x, 18 + y, tone)
    for y in range(96):                                                                       # 양각 그림자(오른쪽 아래 1px)
        for x in range(96):
            if big[y, x, 3] and (x + 1 >= 96 or big[y, x + 1, 3] == 0): c.px(17 + x, 18 + y, IRON_D)
    c.save(PROPS / 'ship_floor_logo.png')


def cage_open() -> None:
    src = np.array(Image.open(PROPS / 'lava_cage.png').convert('RGBA'))
    im = src.copy()
    top, bot = 200, 360
    # 가운데 살 둘(x 66·98)을 지우고(문이 열림) 위로 올린 짧은 살을 윗판 아래에 남긴다
    for x0 in (66, 98):
        im[top + 12:bot - 16, x0:x0 + 5] = (0, 0, 0, 0)
        im[top + 12:top + 30, x0:x0 + 5] = src[top + 12:top + 30, x0:x0 + 5]
    Image.fromarray(im, 'RGBA').save(PROPS / 'lava_cage_open.png')


if __name__ == '__main__':
    cannon(); cannonball(); smoke(); floor_logo(); cage_open()
    print('wrote ship intro set')
