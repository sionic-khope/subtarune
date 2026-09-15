#!/usr/bin/env python3
"""용광로 구역 세트(BUILD188, 사용자 2026-09-15: “엄창배 배경에 용광로마냥 용암 느낌, 발판은 차콜 철 + 파란색이 공존”):
- tiles/youngcle_iron_blue.png : 기존 youngcle_iron 타일을 차콜로 눌러 밝은 픽셀(리벳·모서리)에 파란 기운 — 바닥·벽 공용(맵 글자 'k' 바닥 / 'K' 는 desk 라 벽은 'X')
- tiles/lava.png               : 용암(뗏목으로만 건넘) — 검붉은 바탕에 주황 균열·노란 불씨
- props/plasma_beam_v.png      : 세로 플라즈마 빔(뗏목 물길을 가로지름), 3프레임 가로 시트 40×160 (anim cols 3)
- props/plasma_beam_h.png      : 가로 플라즈마 빔, 3프레임 세로 시트 160×40 → 가로로 이어 붙여 480×40 (cols 3)
- props/lava_wall.png          : 굳은 용암 벽(2단 점프로만 넘음) 40×64, props/lava_wall_low.png 낮은 벽 28×36
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
Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').save(OUT_T / 'youngcle_iron_blue.png')

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

# 3) 플라즈마 빔 세로(40×160, 3프레임 → 120×160)
def beam_v(frame: int) -> Canvas:
    b = Canvas(40, 160)
    post = hexc('#3a3f4a'); rim = hexc('#7d8798')
    for y in (0, 148):
        b.rrect_outlined(8, y, 24, 12, post, rim, r=3); b.rect(14, y + 4, 12, 4, hexc('#8fe3ff'))
    core = [hexc('#dff9ff'), hexc('#8fe3ff'), hexc('#4fc3ff')][frame]
    glow = [hexc('#4fc3ff'), hexc('#2f8fd6'), hexc('#8fe3ff')][frame]
    for y in range(12, 148):
        wob = 1 if ((y // 6) + frame) % 3 == 0 else 0
        b.rect(17 + wob, y, 6 - wob, 1, glow); b.rect(19, y, 2, 1, core)
        if (y + frame * 5) % 14 == 0: b.rect(13 + wob, y, 14, 1, glow)
    return b
sheet = Image.new('RGBA', (120, 160), (0, 0, 0, 0))
for i in range(3): sheet.paste(beam_v(i).image(), (i * 40, 0))
sheet.save(OUT_P / 'plasma_beam_v.png')

# 4) 플라즈마 빔 가로(160×40, 3프레임 → 480×40)
def beam_h(frame: int) -> Canvas:
    b = Canvas(160, 40)
    post = hexc('#3a3f4a'); rim = hexc('#7d8798')
    for x in (0, 148):
        b.rrect_outlined(x, 8, 12, 24, post, rim, r=3); b.rect(x + 4, 14, 4, 12, hexc('#8fe3ff'))
    core = [hexc('#dff9ff'), hexc('#8fe3ff'), hexc('#4fc3ff')][frame]
    glow = [hexc('#4fc3ff'), hexc('#2f8fd6'), hexc('#8fe3ff')][frame]
    for x in range(12, 148):
        wob = 1 if ((x // 6) + frame) % 3 == 0 else 0
        b.rect(x, 17 + wob, 1, 6 - wob, glow); b.rect(x, 19, 1, 2, core)
        if (x + frame * 5) % 14 == 0: b.rect(x, 13 + wob, 1, 14, glow)
    return b
sheet = Image.new('RGBA', (480, 40), (0, 0, 0, 0))
for i in range(3): sheet.paste(beam_h(i).image(), (i * 160, 0))
sheet.save(OUT_P / 'plasma_beam_h.png')

# 5) 굳은 용암 벽(높음 40×64, 낮음 28×36): 검은 현무암 덩어리 + 주황 균열
def wall(w: int, h: int, seed: int) -> Canvas:
    b = Canvas(w, h); r = np.random.default_rng(seed)
    b.rrect_outlined(0, 4, w, h - 4, hexc('#2b2226'), hexc('#120d10'), r=4)
    for _ in range(w * h // 40):
        x, y = int(r.integers(1, w - 3)), int(r.integers(6, h - 2)); b.rect(x, y, int(r.integers(1, 4)), 1, hexc('#3d3236'))
    for _ in range(max(3, w // 8)):
        x, y = int(r.integers(2, w - 6)), int(r.integers(8, h - 6)); L = int(r.integers(3, 7))
        for i in range(L): b.px(x + i, y + (i % 2), hexc('#ff7a1a')); b.px(x + i, y + 1 + (i % 2), hexc('#c93f0c'))
    b.rect(2, 2, w - 4, 3, hexc('#4a3c41'))
    return b
wall(40, 64, 1).save(OUT_P / 'lava_wall.png'); wall(28, 36, 2).save(OUT_P / 'lava_wall_low.png')
print('wrote lava set')
