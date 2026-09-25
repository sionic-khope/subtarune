#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Run: uv run tools/art/castle334_stairs_set.py
# ──────────────────
"""BUILD334/335 tower staircase, assembled from generated art (사용자 “gpt 로 생성하라고”).

Sources (openai/gpt-image-2.5-sunburst, assets/source/stairs334): `flight-raw.png` (a straight staircase: one step
band and a crystal-lamp railing post are cut from it), `landing-raw.png` (landing floor). The walls reuse the
generated arena shelves (assets/props/arena332_room.png) so the tower reads as the same chamber.
Steps are laid along the slanted flights from tools/maps/gajaeman_stairs.py (single source for the geometry).
"""
from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

SRC = Path('assets/source/stairs334')
spec = importlib.util.spec_from_file_location('stairs_map', Path('tools/maps/gajaeman_stairs.py'))
stairs_map = importlib.util.module_from_spec(spec); spec.loader.exec_module(stairs_map)
W, H, CHUNK = stairs_map.W, stairs_map.H, stairs_map.CHUNK
FLIGHTS, LANDINGS, HALF = stairs_map.FLIGHTS, stairs_map.LANDINGS, stairs_map.HALF
STEP_W = HALF * 2 + 24          # 디딤판 + 양옆 돌 난간턱
LAMP_EVERY = 4


def keyed(im: Image.Image) -> Image.Image:
    a = np.array(im.convert('RGBA'))
    r, g, b = (a[..., i].astype(int) for i in range(3))
    key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
    a[..., 3] = np.where(key, 0, 255).astype(np.uint8)
    return Image.fromarray(a)


def step_unit() -> Image.Image:
    """One step (lip line to lip line) from the middle of the generated staircase, scaled to the band width."""
    raw = Image.open(SRC / 'flight-raw.png').convert('RGB')
    band = raw.crop((258, 508, 766, 612))
    h = round(band.height * STEP_W / band.width)
    return band.resize((STEP_W, h), Image.BOX)


def lamp_post() -> Image.Image:
    post = keyed(Image.open(SRC / 'flight-raw.png').crop((150, 610, 250, 870)))
    return post.resize((round(post.width * 0.3), round(post.height * 0.3)), Image.BOX)


def wall() -> Image.Image:
    room = Image.open('assets/props/arena332_room.png').convert('RGB')
    band = ImageEnhance.Brightness(room.crop((0, 0, room.width, 160))).enhance(0.62)
    out = Image.new('RGB', (W, H))
    for y in range(0, H, band.height):
        for x in range(0, W, band.width):
            out.paste(band, (x - (y // band.height % 2) * 192, y))
    return out


def landing_art(w: int, h: int) -> Image.Image:
    src = Image.open(SRC / 'landing-raw.png').convert('RGB')
    s = min(src.width / w, src.height / h)
    cw, ch = round(w * s), round(h * s)
    left, top = (src.width - cw) // 2, (src.height - ch) // 2
    return src.crop((left, top, left + cw, top + ch)).resize((w, h), Image.BOX)


def main() -> None:
    full = wall()
    shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    step, post = step_unit(), lamp_post()
    pitch = step.height
    # 계단 아래 그림자(벽에 드리운)
    sh = np.array(shade)
    for (x0, y0), (x1, y1) in FLIGHTS:
        n = int((y0 - y1) // pitch)
        for i in range(n):
            t = i / n; x = int(x0 + (x1 - x0) * t); y = int(y0 - i * pitch)
            sh[max(0, y):min(H, y + 70), max(0, x - STEP_W // 2 - 6):min(W, x + STEP_W // 2 + 6)] = (2, 3, 12, 210)
    full.paste(Image.fromarray(sh), (0, 0), Image.fromarray(sh))
    for x, y, w, h in LANDINGS:
        full.paste(landing_art(w, h), (x, y))
    for (x0, y0), (x1, y1) in FLIGHTS:
        n = int((y0 - y1) // pitch)
        for i in range(n + 1):
            t = i / n; x = x0 + (x1 - x0) * t; y = int(y0 - (i + 1) * pitch)
            full.paste(step, (int(x - STEP_W / 2), y))
        for i in range(0, n + 1, LAMP_EVERY):
            t = i / n; x = x0 + (x1 - x0) * t; y = int(y0 - (i + 1) * pitch)
            for side in (-1, 1):
                p = post if side < 0 else post.transpose(Image.FLIP_LEFT_RIGHT)
                full.paste(p, (int(x + side * (STEP_W / 2 + 4) - p.width / 2), y - p.height + pitch), p)
    for i, top in enumerate(range(0, H, CHUNK)):
        full.crop((0, top, W, min(H, top + CHUNK))).save(f'assets/props/stairs334_chunk_{i}.png')
    full.resize((W // 8, H // 8), Image.BOX).save(SRC / 'overview.png')
    print('chunks', math.ceil(H / CHUNK), 'step pitch', pitch)


if __name__ == '__main__':
    main()
