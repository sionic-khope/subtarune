#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/band184/process.py   (루트에서)
"""밴드 둥가둥가 시트(BUILD184, 사용자 “가만히 있을 때도 리듬 타듯 둥가둥가 하는 스프라이트”): 새 raw(1024×1024, 2×2 셀 512 = 다운·업·왼쪽·오른쪽)를
마젠타 크로마키 → 기존 시트의 idle(셀 0) 높이에 새 프레임 중간 높이를 맞추는 배율 → 128 셀·발 y122 → 기존 2×2 시트 아래에 붙여 256×512(셀 0~3 기존, 4~7 groove).
런타임(rhythm.js GROOVE): 동작 프레임이 없을 때 반박마다 4,5,6,5,4,5,7,5 순환."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parents[2]
CELL_RAW, CELL, FEET = 512, 128, 122


def keyed(img: Image.Image) -> np.ndarray:
    px = np.array(img.convert('RGBA')).astype(np.int16)
    r, g, b = px[:, :, 0], px[:, :, 1], px[:, :, 2]
    magenta = (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)
    px[magenta, 3] = 0
    fringe = (px[:, :, 3] > 0) & (r > g * 1.35 + 8) & (b > g * 1.35 + 8) & (np.abs(r - b) < 70)
    px[fringe, 3] = 0
    px[:, :, 3] = np.where(px[:, :, 3] >= 128, 255, 0)
    return px.astype(np.uint8)


def bbox(a: np.ndarray):
    ys, xs = np.where(a[:, :, 3] > 0)
    return (xs.min(), ys.min(), xs.max(), ys.max())


for name in ('gyeongsub', 'hyungsub', 'ppaman'):
    base = Image.open(GAME / 'assets/sprites' / f'band_{name}.png').convert('RGBA')
    base_cell = np.array(base)[:CELL, :CELL]
    b0 = bbox(base_cell); base_h = b0[3] - b0[1] + 1
    px = keyed(Image.open(ROOT / name / f'{name}-raw.png'))
    cells = [px[r * CELL_RAW:(r + 1) * CELL_RAW, c * CELL_RAW:(c + 1) * CELL_RAW] for r in range(2) for c in range(2)]
    boxes = [bbox(c) for c in cells]
    heights = sorted(b[3] - b[1] + 1 for b in boxes)
    mid_h = (heights[1] + heights[2]) / 2
    scale = base_h / mid_h
    bottom = max(b[3] for b in boxes)
    out = Image.new('RGBA', (CELL * 2, CELL * 4), (0, 0, 0, 0))
    out.paste(base, (0, 0))
    for i, cell in enumerate(cells):
        im = Image.fromarray(cell, 'RGBA')
        w = h = max(1, round(CELL_RAW * scale))
        small = im.resize((w, h), Image.NEAREST)
        dx = round(CELL / 2 - (CELL_RAW / 2) * scale)
        dy = round(FEET - (bottom + 1) * scale)
        ox, oy = (i % 2) * CELL, (2 + i // 2) * CELL
        out.paste(small, (ox + dx, oy + dy), small)
    dest = GAME / 'assets/sprites' / f'band_{name}.png'
    out.save(dest)
    print(name, 'base idle h', base_h, 'new mid h', round(mid_h), 'scale', round(scale, 3), '->', dest.relative_to(GAME), out.size)
