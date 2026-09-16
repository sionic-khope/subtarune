#!/usr/bin/env python3
"""조종실 입장 연출(youngcle20, BUILD202~203) 이펙트·장식(캐릭터·대포·철창 같은 그림은 gpt-image-2 생성 — assets/source/ship-cannon-v1, ship-cage-v1).
- props/ship_cannonball.png : 64×64 거대한 검은 포탄(사용자 “동그랗고 거대한 동그라미, 타코(쥰희) 몸보다 커야 해” — 쥰희 46px)
- fx/cannon_smoke.png       : 6프레임 띠 6×(64×64) 발사 연기(회색 뭉게구름이 커지며 옅어짐) — {boom scale 2.2}
- props/ship_floor_logo.png : 128×128 바닥 강철 원판 + 영클 얼굴 양각(사용자 “화면 중앙엔 영클 얼굴로 박혀 있는 철 색깔 로고”) — 걷는 장식
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


def cannonball() -> None:
    D = 64
    b = Canvas(D, D)
    for x in range(D):
        for y in range(D):
            d = ((x - 31.5) ** 2 + (y - 31.5) ** 2) ** 0.5
            if d <= 31: b.px(x, y, (0, 0, 0) if d > 29.5 else BLACK)
    for x in range(D):                                                                     # 왼쪽 위 둥근 하이라이트
        for y in range(D):
            d = ((x - 22) ** 2 + (y - 20) ** 2) ** 0.5
            if 6 <= d <= 9 and x < 26 and y < 24: b.px(x, y, hexc('#5a5a68'))
    b.rect(17, 17, 4, 3, hexc('#6c6c7a')); b.rect(15, 20, 3, 3, hexc('#6c6c7a'))
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


if __name__ == '__main__':
    cannonball(); smoke(); floor_logo()
    print('wrote ship intro set')
