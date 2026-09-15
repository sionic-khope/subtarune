#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/stage180/process2.py   (루트에서)
"""2차 가공(BUILD180): ① 관객 띠(1024×1024, 두 줄 = 평소/환호) → 마젠타 크로마키 → 줄마다 0.625 배 NEAREST → 가운데 480 폭·머리 위부터 90px → `rhythm_audience.png`(480×180, 위 평소·아래 환호)
② 억빠맨 보컬 재생성 시트(band178/ppaman2, 입 안 벌림) → band178/process.py 와 같은 규칙(공통 배율, 셀 128, 발 y122) → `band_ppaman.png` 교체."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parents[2]


def keyed(img):
    px = np.array(img.convert('RGBA')).astype(np.int16)
    r, g, b = px[:, :, 0], px[:, :, 1], px[:, :, 2]
    mag = (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)
    px[mag, 3] = 0
    fringe = (px[:, :, 3] > 0) & (r > g * 1.35 + 8) & (b > g * 1.35 + 8) & (np.abs(r - b) < 70)
    px[fringe, 3] = 0
    px[:, :, 3] = np.where(px[:, :, 3] >= 128, 255, 0)
    return px.astype(np.uint8)


# ① 관객
a = keyed(Image.open(ROOT / 'audience/audience-raw.png'))
out = Image.new('RGBA', (480, 180), (0, 0, 0, 0))
for row in range(2):
    cell = a[row * 512:(row + 1) * 512]
    im = Image.fromarray(cell, 'RGBA').resize((640, 320), Image.NEAREST)
    arr = np.array(im); ys = np.where(arr[:, :, 3].sum(axis=1) > 0)[0]
    top = int(ys.min()) if len(ys) else 0
    crop = im.crop((80, top, 560, top + 90))
    out.paste(crop, (0, row * 90), crop)
out.save(GAME / 'assets/props/rhythm_audience.png'); print('rhythm_audience 480x180')

# ② 억빠맨 보컬
CELL_RAW, CELL, FEET, BODY = 512, 128, 122, 104
px = keyed(Image.open(GAME / 'assets/source/band178/ppaman2/ppaman2-raw.png'))
cells = [px[r * CELL_RAW:(r + 1) * CELL_RAW, c * CELL_RAW:(c + 1) * CELL_RAW] for r in range(2) for c in range(2)]
boxes = []
for cell in cells:
    ys, xs = np.where(cell[:, :, 3] > 0); boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
height = max(b[3] - b[1] + 1 for b in boxes); bottom = max(b[3] for b in boxes); scale = BODY / height
sheet = Image.new('RGBA', (CELL * 2, CELL * 2), (0, 0, 0, 0))
for i, cell in enumerate(cells):
    im = Image.fromarray(cell, 'RGBA'); w = max(1, round(CELL_RAW * scale))
    small = im.resize((w, w), Image.NEAREST)
    dx = round(CELL / 2 - (CELL_RAW / 2) * scale); dy = round(FEET - (bottom + 1) * scale)
    sheet.paste(small, ((i % 2) * CELL + dx, (i // 2) * CELL + dy), small)
sheet.save(GAME / 'assets/sprites/band_ppaman.png'); print('band_ppaman replaced (scale', round(scale, 3), ')')
