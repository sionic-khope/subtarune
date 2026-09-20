#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""토마토·계란 얼룩(소품)과 과즙 튀는 이펙트(BUILD279 사용자 “과즙 튀는 것도 구현”): splat-raw.png 2×2 → 색키·연결 성분(작은 방울 유지)·축소.
   위 두 칸(얼룩) → assets/props/splat_tomato.png, splat_egg.png(폭 30)   아래 두 칸(튐) → assets/fx/tomato_burst.png, egg_burst.png(폭 72, 한 장 — boom 노드로 0.35초 커지며 튄다)
   사용: /usr/bin/python3 assets/source/sakura7-v1/export_splat.py"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
def keyed(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    key = (r > 190) & (b > 190) & (g < 130)
    return Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), np.where(key, 0, 255).astype(np.uint8)]))
def shrink(fig, width):
    s = width / fig.width; w, h = max(1, round(fig.width * s)), max(1, round(fig.height * s))
    small = fig.resize((w, h), Image.NEAREST); a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(a)
img = keyed(ROOT / 'splat-raw.png'); h = img.width // 2
for name, (c, r), width, folder in (('splat_tomato', (0, 0), 30, 'props'), ('splat_egg', (1, 0), 30, 'props'), ('tomato_burst', (0, 1), 72, 'fx'), ('egg_burst', (1, 1), 72, 'fx')):
    cell = img.crop((c * h, r * h, (c + 1) * h, (r + 1) * h)); fig = cell.crop(cell.getbbox())
    out = shrink(fig, width); out.save(A / folder / f'{name}.png'); print(name, out.size)
