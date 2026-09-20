#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""벚꽃 숲 6(BUILD277) 자산 내보내기 — gpt-image-2.5-sunburst 원본(마젠타 배경) → 색키·축소·자르기만(PIL).
   choimis-masked-walk-raw.png(4×4, 행 down/up/left/right) → assets/sprites/choimis-masked-walk.png(512×512, 128 셀, 발 y=120, 기존 최미스 시트와 같은 키)
   choimis-masked-pick-raw.png / choimis-masked-seup-raw.png(2 칸) → assets/sprites/choimis-masked-pick.png / choimis-masked-seup.png(256×128 띠, 발 y=120)
   flowers-raw.png(2×2) → assets/props/sakura_flowers_1..4.png(폭 약 40px)
   사용: /usr/bin/python3 assets/source/sakura6-v1/export.py"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
CELL = 128; FEET = 120

def keyed(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    key = (r > 190) & (b > 190) & (g < 130)
    alpha = np.where(key, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), alpha]))

def components(mask):
    """8-연결 성분 목록 [(area, x0, y0, x1, y1, pixels)] — 발밑 잔점(몸통과 안 이어진 조각)을 거르려고 쓴다."""
    h, w = mask.shape; seen = np.zeros_like(mask, dtype=bool); out = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]; seen[sy, sx] = True; pts = []
            while stack:
                y, x = stack.pop(); pts.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; stack.append((ny, nx))
            ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
            out.append((len(pts), min(xs), min(ys), max(xs) + 1, max(ys) + 1, pts))
    return sorted(out, key=lambda c: -c[0])

def figure(img, box):
    """칸 안의 그림: 가장 큰 덩어리(몸통) + 몸통 발끝보다 위에서 시작하는 조각(손의 꽃 등)만. 몸통 발끝 아래 잔점은 버린다.
       반환: (그림 RGBA, 몸통 발끝 y — 그림 좌표)"""
    cell = img.crop(box); a = np.array(cell); mask = a[:, :, 3] > 0
    comps = components(mask); main = comps[0]
    keep = [c for c in comps if c is main or (c[0] >= main[0] * 0.01 and c[2] < main[4])]
    keepmask = np.zeros_like(mask)
    for c in keep:
        for y, x in c[5]:
            keepmask[y, x] = True
    a[:, :, 3] = np.where(keepmask, a[:, :, 3], 0)
    x0, y0 = min(c[1] for c in keep), min(c[2] for c in keep); x1, y1 = max(c[3] for c in keep), max(c[4] for c in keep)
    fig = Image.fromarray(a).crop((x0, y0, x1, y1))
    return fig, main[4] - y0

def place(figpair, scale):
    fig, feet = figpair
    w, h = max(1, round(fig.width * scale)), max(1, round(fig.height * scale))
    small = fig.resize((w, h), Image.NEAREST)
    a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); small = Image.fromarray(a)
    frame = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    frame.paste(small, (CELL // 2 - w // 2, FEET - round(feet * scale))); return frame   # 몸통 발끝이 y=120

# 기준: 기존 최미스 시트 정면 0번 칸의 키(발 y 120)
ref = Image.open(A / 'sprites' / 'choimis.png').convert('RGBA').crop((0, 0, 128, 128)); rb = ref.getbbox()
target_h = rb[3] - rb[1]
report = {'reference_stand_height': target_h}

# 1) 가면 걷기 시트 — BUILD279 부터 mask_overlay.py(기존 GAP 시트 + 가면 조각)가 만든다. gpt-image 재생성 시트(choimis-masked-walk-raw.png)는 GAP 이 빠져 폐기(사용자 “왜 재사용 안 한 거지”)
report['walk'] = 'mask_overlay.py'
# 2) 자세 띠(2 칸): 오른쪽(선 자세) 키를 기준 키에 맞추고 같은 배율을 왼쪽에도
for name in ('pick', 'seup'):
    img = keyed(ROOT / f'choimis-masked-{name}-raw.png'); half = img.width // 2
    left, right = figure(img, (0, 0, half, img.height)), figure(img, (half, 0, img.width, img.height))
    s = target_h / right[1]
    strip = Image.new('RGBA', (2 * CELL, CELL), (0, 0, 0, 0))
    strip.paste(place(left, s), (0, 0)); strip.paste(place(right, s), (CELL, 0))
    strip.save(A / 'sprites' / f'choimis-masked-{name}.png'); report[name] = {'scale': round(s, 4), 'left': [round(left[0].width * s), round(left[0].height * s)], 'right': [round(right[0].width * s), round(right[0].height * s)]}

# 3) 꽃 무더기 소품 4개(폭 40 안팎, 오른쪽 아래 칸은 키 큰 줄기라 조금 더)
fl = keyed(ROOT / 'flowers-raw.png'); h = fl.width // 2; sizes = {}
for i, (c, r) in enumerate(((0, 0), (1, 0), (0, 1), (1, 1))):
    fig = figure(fl, (c * h, r * h, (c + 1) * h, (r + 1) * h))[0]
    s = 40 / fig.width
    w, hh = max(1, round(fig.width * s)), max(1, round(fig.height * s))
    small = fig.resize((w, hh), Image.NEAREST); a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    out = Image.fromarray(a); out.save(A / 'props' / f'sakura_flowers_{i + 1}.png'); sizes[f'sakura_flowers_{i + 1}'] = [w, hh]
report['flowers'] = sizes
(ROOT / 'runtime-contract.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
