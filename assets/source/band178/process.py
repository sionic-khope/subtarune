#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/band178/process.py   (루트에서)
"""무대 밴드 시트 3장(OG edits 1024×1024, 2×2 셀 512): 마젠타 크로마키 → 시트마다 공통 배율(가장 큰 프레임 높이 = 104px) → 128×128 셀, 셀 가로 중심 유지, 공통 바닥선을 y122 에.
결과: assets/sprites/band_{gyeongsub,hyungsub,ppaman}.png (2×2, 셀 128, 발 y122). 런타임 프레임: 0 idle, 1~3 연주 동작."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parents[2]
CELL_RAW, CELL, FEET, BODY = 512, 128, 122, 104


def keyed(img: Image.Image) -> np.ndarray:
    px = np.array(img.convert('RGBA')).astype(np.int16)
    r, g, b = px[:, :, 0], px[:, :, 1], px[:, :, 2]
    magenta = (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)
    px[magenta, 3] = 0
    fringe = (px[:, :, 3] > 0) & (r > g * 1.35 + 8) & (b > g * 1.35 + 8) & (np.abs(r - b) < 70)
    px[fringe, 3] = 0
    px[:, :, 3] = np.where(px[:, :, 3] >= 128, 255, 0)
    return px.astype(np.uint8)


for name in ('gyeongsub', 'hyungsub', 'ppaman'):
    px = keyed(Image.open(ROOT / name / f'{name}-raw.png'))
    cells = [px[r * CELL_RAW:(r + 1) * CELL_RAW, c * CELL_RAW:(c + 1) * CELL_RAW] for r in range(2) for c in range(2)]
    boxes = []
    for cell in cells:
        ys, xs = np.where(cell[:, :, 3] > 0)
        boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    height = max(b[3] - b[1] + 1 for b in boxes)
    bottom = max(b[3] for b in boxes)
    scale = BODY / height
    out = Image.new('RGBA', (CELL * 2, CELL * 2), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        im = Image.fromarray(cell, 'RGBA')
        w, h = max(1, round(CELL_RAW * scale)), max(1, round(CELL_RAW * scale))
        small = im.resize((w, h), Image.NEAREST)
        # 원본 셀 중심 x(256) → 64, 공통 바닥선 → 122
        dx = round(CELL / 2 - (CELL_RAW / 2) * scale)
        dy = round(FEET - (bottom + 1) * scale)
        ox, oy = (i % 2) * CELL, (i // 2) * CELL
        out.paste(small, (ox + dx, oy + dy), small)
    dest = GAME / 'assets/sprites' / f'band_{name}.png'
    out.save(dest)
    print(name, 'height', height, 'scale', round(scale, 3), '->', dest.relative_to(GAME))
