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


def flight_strip(length: int) -> Image.Image:
    """The generated straight staircase (steps + railings + lamps, magenta keyed), tiled to `length` px tall."""
    raw = Image.open(SRC / 'flight-raw.png').convert('RGB').crop((96, 404, 928, 404 + 104 * 8))
    unit = keyed(raw)
    w = STEP_W + 70
    unit = unit.resize((w, round(unit.height * w / unit.width)), Image.BOX)
    strip = Image.new('RGBA', (w, length), (0, 0, 0, 0))
    for y in range(length - unit.height, -unit.height, -unit.height):
        strip.alpha_composite(unit, (0, y))
    return strip


def sheared(strip: Image.Image, dx: float) -> Image.Image:
    """Slant the whole flight: row y shifts by dx*(1 - y/h) so the top is dx to the side (one continuous railing)."""
    h = strip.height
    out = Image.new('RGBA', (strip.width + int(abs(dx)) + 2, h), (0, 0, 0, 0))
    src = np.array(strip); dst = np.array(out)
    base = int(abs(dx)) if dx < 0 else 0
    for y in range(h):
        off = base + int(round(dx * (1 - y / h)))
        dst[y, off:off + strip.width] = src[y]
    return Image.fromarray(dst)


def background() -> Image.Image:
    """Black void with drifting dark smoke baked in (사용자 “배경 그냥 검은색으로 해줘 연기있고”)."""
    rng = np.random.default_rng(334)
    out = Image.new('RGB', (W, H), (3, 3, 8))
    layer = np.zeros((H, W), float)
    yy, xx = np.mgrid[0:H:4, 0:W:4]
    for _ in range(260):
        cx, cy, r = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(40, 140)
        d = ((xx - cx) ** 2 + ((yy - cy) * 1.6) ** 2) / r ** 2
        layer[::4, ::4] += np.clip(1 - d, 0, 1) * rng.uniform(0.15, 0.4)
    small = Image.fromarray((np.clip(layer[::4, ::4], 0, 1) * 255).astype(np.uint8)).resize((W // 4, H // 4))
    mask = np.asarray(small.resize((W, H), Image.NEAREST)).astype(float) / 255
    mask = np.floor(mask * 4) / 4
    col = np.array(out).astype(float)
    tint = np.array([34, 26, 50])
    col = col * (1 - mask[..., None] * 0.9) + tint * mask[..., None] * 0.9
    return Image.fromarray(col.astype(np.uint8))


def landing_art(w: int, h: int) -> Image.Image:
    src = Image.open(SRC / 'landing-raw.png').convert('RGB')
    s = min(src.width / w, src.height / h)
    cw, ch = round(w * s), round(h * s)
    left, top = (src.width - cw) // 2, (src.height - ch) // 2
    return src.crop((left, top, left + cw, top + ch)).resize((w, h), Image.BOX)


def main() -> None:
    full = background()
    for x, y, w, h in LANDINGS:
        full.paste(landing_art(w, h), (x, y))
    for (x0, y0), (x1, y1) in FLIGHTS:
        length = y0 - y1 + 40
        strip = sheared(flight_strip(length), x1 - x0)
        left = int(min(x0, x1) - strip.width // 2 + abs(x1 - x0) // 2 * 0) - (STEP_W + 70) // 2
        left = int(min(x0, x1)) - (STEP_W + 70) // 2
        full.paste(strip, (left, int(y1) - 20), strip)
    for i, top in enumerate(range(0, H, CHUNK)):
        full.crop((0, top, W, min(H, top + CHUNK))).save(f'assets/props/stairs334_chunk_{i}.png')
    full.resize((W // 8, H // 8), Image.BOX).save(SRC / 'overview.png')
    print('chunks', math.ceil(H / CHUNK))


if __name__ == '__main__':
    main()
