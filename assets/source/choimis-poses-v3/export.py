#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""최미스 자세 3차(BUILD280, 사용자 “바지 색깔 왜 핑크색 아니냐 / 얼굴도 살짝 다르네”): 걷기 정면 칸(8배)을 그대로 참조로 다시 그린 자세 — 분홍 바지·같은 얼굴.
   seup-raw / pick-raw (맨얼굴) → assets/sprites/choimis-seup.png, choimis-pick.png(256×128 띠, 발 y=120, 선 자세 키 = 걷기 정면 키 96)
   masked-seup-raw / masked-pick-raw (가면) → assets/sprites/choimis-masked-seup.png, choimis-masked-pick.png
   색은 걷기 시트 팔레트로 맞춘다(가장 가까운 색 — 가면 파랑·꽃 분홍·초록만 예외). 사용: /usr/bin/python3 assets/source/choimis-poses-v3/export.py [이름…]"""
from pathlib import Path
import sys, json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
CELL = 128; FEET = 120
def keyed(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int); r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    key = (r > 190) & (b > 190) & (g < 130)
    return Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), np.where(key, 0, 255).astype(np.uint8)]))
def components(mask):
    h, w = mask.shape; seen = np.zeros_like(mask, dtype=bool); out = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]: continue
            stack = [(sy, sx)]; seen[sy, sx] = True; pts = []
            while stack:
                y, x = stack.pop(); pts.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; stack.append((ny, nx))
            ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
            out.append((len(pts), min(xs), min(ys), max(xs) + 1, max(ys) + 1, pts))
    return sorted(out, key=lambda c: -c[0])
def figure(img, box):
    cell = img.crop(box); a = np.array(cell); mask = a[:, :, 3] > 0
    comps = components(mask); main = comps[0]
    keep = [c for c in comps if c is main or (c[0] >= main[0] * 0.01 and c[2] < main[4])]
    keepmask = np.zeros_like(mask)
    for c in keep:
        for y, x in c[5]: keepmask[y, x] = True
    a[:, :, 3] = np.where(keepmask, a[:, :, 3], 0)
    x0, y0 = min(c[1] for c in keep), min(c[2] for c in keep); x1, y1 = max(c[3] for c in keep), max(c[4] for c in keep)
    return Image.fromarray(a).crop((x0, y0, x1, y1)), main[4] - y0
def place(figpair, scale):
    fig, feet = figpair; w, h = max(1, round(fig.width * scale)), max(1, round(fig.height * scale))
    small = fig.resize((w, h), Image.NEAREST); a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); small = Image.fromarray(a)
    frame = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)); frame.paste(small, (CELL // 2 - w // 2, FEET - round(feet * scale))); return frame
# 걷기 시트 팔레트(정면 0번 칸) + 예외색(가면 파랑 계열·꽃·잎)
walk = np.array(Image.open(A / 'sprites' / 'choimis.png').convert('RGBA').crop((0, 0, CELL, CELL)))
pal = np.unique(walk[walk[:, :, 3] > 0][:, :3], axis=0).astype(int)
def snap(frame):
    a = np.array(frame).astype(int); rgb = a[:, :, :3]; al = a[:, :, 3] > 0
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    keep = (b > r + 40) & (b > g + 20) | ((g > r + 30) & (g > b + 30)) | ((r > 200) & (g < 170) & (b > 150) & (r - b < 60) & ((g < 120) | (b < 200)) & False)
    d = ((rgb[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(axis=3); idx = d.argmin(axis=2); snapped = pal[idx]
    out = np.where((al & ~keep)[:, :, None], snapped, rgb); a[:, :, :3] = out; return Image.fromarray(a.astype(np.uint8))
ref = walk; rb = Image.fromarray(ref).getbbox(); target_h = rb[3] - rb[1]
report = {}
names = sys.argv[1:] or ['seup', 'pick', 'masked-seup', 'masked-pick']
for name in names:
    raw = ROOT / f'{name}-raw.png'
    if not raw.exists(): print('skip', name); continue
    img = keyed(raw); half = img.width // 2
    left, right = figure(img, (0, 0, half, img.height)), figure(img, (half, 0, img.width, img.height))
    s = target_h / right[1]                                   # 오른쪽(선 자세) 몸통 키를 걷기 정면 키에 맞추고 같은 배율을 왼쪽에도
    strip = Image.new('RGBA', (2 * CELL, CELL), (0, 0, 0, 0))
    strip.paste(snap(place(left, s)), (0, 0)); strip.paste(snap(place(right, s)), (CELL, 0))
    out = A / 'sprites' / ('choimis-' + name + '.png'); strip.save(out)
    report[name] = {'scale': round(s, 4), 'left': [round(left[0].width * s), round(left[0].height * s)], 'right': [round(right[0].width * s), round(right[0].height * s)]}
    print(name, report[name])
(ROOT / 'runtime-contract.json').write_text(json.dumps({'reference_stand_height': target_h, 'poses': report}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
