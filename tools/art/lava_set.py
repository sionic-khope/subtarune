#!/usr/bin/env python3
"""용광로 구역 세트(BUILD188, 사용자 2026-09-15: “엄창배 배경에 용광로마냥 용암 느낌, 발판은 차콜 철 + 파란색이 공존”):
- tiles/youngcle_iron_blue.png : 기존 youngcle_iron 타일을 차콜로 눌러 밝은 픽셀(리벳·모서리)에 파란 기운 — 바닥(F)
- tiles/youngcle_iron_blue_solid.png : 가장자리 출입구 칸(H) — 바닥과 같은 그림, 막힘(BUILD192)
- tiles/youngcle_iron_blue_wall.png : 벽(G) — 훨씬 어둡고 위 테두리가 밝은 판(길처럼 안 보이게)
- tiles/lava.png               : 용암(뗏목으로만 건넘) — 검붉은 바탕에 주황 균열·노란 불씨
- props/plasma_beam_v.png      : 낮은 플라즈마 빔(하늘색, C 한 번) 40×96 3프레임 가로 시트 (anim cols 3)
- props/plasma_beam_high.png   : 높은 빔 = 같은 유닛을 위로 한 층 더 쌓은 2층 게이트 40×160(붉은) → 2단 점프, 3프레임
- props/lava_wall.png          : 높은 돌 = 덩어리 둘을 쌓음 40×76(위는 달아오름) → 2단 점프, props/lava_wall_low.png 낮은 돌 = 덩어리 하나 40×36 → 한 번
실행: /usr/bin/python3 tools/art/lava_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from PIL import Image
import numpy as np
from painter import Canvas, hexc, shade

OUT_T, OUT_P = Path('assets/tiles'), Path('assets/props')

# 1) 차콜 + 파랑 철 타일: 밝기를 0.55 배로 눌러 차콜, 원본 밝기 상위 30% 픽셀은 파란 쪽으로 기운다
src = np.array(Image.open(OUT_T / 'youngcle_iron.png').convert('RGBA')).astype(np.float32)
lum = src[:, :, :3].mean(axis=2)
thr = np.percentile(lum, 86)
dark = src.copy(); dark[:, :, :3] *= 0.55
blue = dark.copy(); blue[:, :, 0] *= 0.75; blue[:, :, 2] = np.minimum(255, blue[:, :, 2] * 1.35 + 30)
mask = (lum >= thr)[:, :, None]
out = np.where(mask, blue, dark); out[:, :, 3] = src[:, :, 3]
_floor = Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA'); _floor.save(OUT_T / 'youngcle_iron_blue.png')
# 가장자리 출입구 칸(H): 같은 그림, 막힘(BUILD192)
_floor.save(OUT_T / 'youngcle_iron_blue_solid.png')

# 1b) 벽 타일(G): 바닥(F)과 같은 그림을 쓰면 용암 위아래 띠가 길처럼 보인다(사용자 “밑길은 왜 있는 거고”) → 훨씬 어두운 판 + 위쪽 밝은 테두리 + 가운데 격자
wall = out.copy(); wall[:, :, :3] *= 0.42
wall[0:2, :, :3] = np.minimum(255, wall[0:2, :, :3] * 2.2 + 30)
wall[2:3, :, :3] = np.minimum(255, wall[2:3, :, :3] * 1.4 + 10)
for yy in range(8, 32, 8):
    wall[yy, 2:30, :3] = np.minimum(255, wall[yy, 2:30, :3] * 0.7)
for xx in range(8, 32, 8):
    wall[4:32, xx, :3] = np.minimum(255, wall[4:32, xx, :3] * 0.7)
Image.fromarray(wall.clip(0, 255).astype(np.uint8), 'RGBA').save(OUT_T / 'youngcle_iron_blue_wall.png')

# 2) 용암 타일 32×32
c = Canvas(32, 32)
c.rect(0, 0, 32, 32, hexc('#7a1a08'))
rng = np.random.default_rng(3)
for _ in range(40):
    x, y = int(rng.integers(0, 32)), int(rng.integers(0, 32)); c.rect(x, y, int(rng.integers(2, 6)), 1, hexc('#9c2a0c'))
for _ in range(9):
    x, y = int(rng.integers(0, 28)), int(rng.integers(0, 28)); L = int(rng.integers(4, 10))
    for i in range(L):
        c.px(x + i, y + (i // 3) % 2, hexc('#ff7a1a')); c.px(x + i, y + 1 + (i // 3) % 2, hexc('#d94a0e'))
for _ in range(6):
    x, y = int(rng.integers(0, 31)), int(rng.integers(0, 31)); c.px(x, y, hexc('#ffd24a')); c.px(x + 1, y, hexc('#ffb02a'))
c.save(OUT_T / 'lava.png')

# 3) 플라즈마 빔 — 디자인 규칙(사용자: 색만으론 2단 점프인지 모른다 → 층 수로): 낮은 빔 = 발전기 한 쌍 + 빔 한 줄(한 층, 96),
#    높은 빔 = 같은 유닛을 위로 한 층 더 쌓은 2층 게이트(160: 위층 64 + 아래층 96). 붉은색은 덤.
def beam_unit(b: Canvas, y0: int, h: int, frame: int, high: bool) -> None:
    post = hexc('#3a3f4a'); rim = hexc('#7d8798')
    lamp = hexc('#ff5a8a') if high else hexc('#8fe3ff')
    for y in (y0, y0 + h - 12):
        b.rrect_outlined(6, y, 28, 12, post, rim, r=3); b.rect(14, y + 4, 12, 4, lamp)
    core = ([hexc('#ffe1ec'), hexc('#ff7ab0'), hexc('#ff3d7a')] if high else [hexc('#dff9ff'), hexc('#8fe3ff'), hexc('#4fc3ff')])[frame]
    glow = ([hexc('#ff3d7a'), hexc('#c4104c'), hexc('#ff7ab0')] if high else [hexc('#4fc3ff'), hexc('#2f8fd6'), hexc('#8fe3ff')])[frame]
    for y in range(y0 + 12, y0 + h - 12):
        wob = 1 if ((y // 6) + frame) % 3 == 0 else 0
        b.rect(16 + wob, y, 8 - wob, 1, glow); b.rect(19, y, 2, 1, core)
        if (y + frame * 5) % 14 == 0: b.rect(12 + wob, y, 16, 1, glow)
def beam_v(frame: int, high: bool) -> Canvas:
    if not high:
        b = Canvas(40, 96); beam_unit(b, 0, 96, frame, False); return b
    b = Canvas(40, 160); beam_unit(b, 64, 96, frame, True); beam_unit(b, 0, 64, frame, True)
    b.rect(4, 62, 32, 4, hexc('#4e5a6b'))   # 층 사이 받침(두 층이 쌓인 게 보이게)
    return b
for name, high in (('plasma_beam_v', False), ('plasma_beam_high', True)):
    h = 160 if high else 96
    sheet = Image.new('RGBA', (120, h), (0, 0, 0, 0))
    for i in range(3): sheet.paste(beam_v(i, high).image(), (i * 40, 0))
    sheet.save(OUT_P / f'{name}.png')

# 5) 굳은 용암 돌 — 같은 규칙: 낮은 돌 = 덩어리 하나(40×36), 높은 돌 = 덩어리 둘을 쌓음(40×76, 위 덩어리는 벌겋게 달아오름)
def tier(b: Canvas, y0: int, seed: int, hot: bool) -> None:
    r = np.random.default_rng(seed)
    base = hexc('#5a1a10') if hot else hexc('#2b2226'); line = hexc('#120d10')
    b.rrect_outlined(0, y0, 40, 36, base, line, r=4)
    for _ in range(26):
        x, y = int(r.integers(1, 37)), int(r.integers(y0 + 4, y0 + 34)); b.rect(x, y, int(r.integers(1, 4)), 1, hexc('#8a2a14') if hot else hexc('#3d3236'))
    for _ in range(5 if hot else 2):
        x, y = int(r.integers(2, 32)), int(r.integers(y0 + 6, y0 + 30)); L = int(r.integers(3, 7))
        for i in range(L): b.px(x + i, y + (i % 2), hexc('#ffb02a') if hot else hexc('#ff7a1a')); b.px(x + i, y + 1 + (i % 2), hexc('#ff7a1a') if hot else hexc('#c93f0c'))
    b.rect(2, y0 + 2, 36, 3, hexc('#7a3a2a') if hot else hexc('#4a3c41'))
low = Canvas(40, 36); tier(low, 0, 2, False); low.save(OUT_P / 'lava_wall_low.png')
high = Canvas(40, 76); tier(high, 40, 1, False); tier(high, 4, 3, True); high.rect(0, 0, 40, 4, hexc('#ff7a1a')); high.save(OUT_P / 'lava_wall.png')

# (잠긴 철문은 사용자가 거부해 삭제 — 2026-09-16 “만들라고 요청한 적도 없는데”. 다음 맵이 없으면 통로를 열어 두고 소품을 지어내지 않는다)
print('wrote lava set')
