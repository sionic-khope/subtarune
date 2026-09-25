#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Run: uv run tools/art/castle334_stairs_set.py
# ──────────────────
"""BUILD334 tower staircase: the whole map floor baked into 1536×1024 chunks.

Steps are small (16px treads) along slanted flights so climbing reads as a staircase, not big blocks.
The background is a closed dark tower wall (stone courses, pilasters with sapphire light strips, faint
monitor shelves) so the screen never feels open (사용자 “화면 너무 뚫려있는 기분 주지 말고”).
The path geometry comes from tools/maps/gajaeman_stairs.py (single source: PATH/LANDINGS there).
"""
from __future__ import annotations

import importlib.util
import math
from pathlib import Path

from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('stairs_map', Path('tools/maps/gajaeman_stairs.py'))
stairs_map = importlib.util.module_from_spec(spec); spec.loader.exec_module(stairs_map)
W, H, CHUNK = stairs_map.W, stairs_map.H, stairs_map.CHUNK
FLIGHTS, LANDINGS, HALF = stairs_map.FLIGHTS, stairs_map.LANDINGS, stairs_map.HALF

WALL, WALL2, SEAM, PIL_, GLOW = (11, 15, 44), (14, 20, 54), (6, 8, 26), (18, 24, 62), (79, 134, 255)
TREAD, TREAD_HI, RISER, EDGE, STRINGER, POST = (52, 67, 127), (70, 88, 160), (26, 33, 80), (110, 140, 220), (7, 10, 28), (140, 175, 255)


def wall(draw: ImageDraw.ImageDraw) -> None:
    for y in range(0, H, 24):
        off = 0 if (y // 24) % 2 else 48
        for x in range(-off, W, 96):
            draw.rectangle([x + 1, y + 1, x + 94, y + 22], fill=WALL if (x // 96 + y // 24) % 3 else WALL2)
        draw.line([0, y, W, y], fill=SEAM)
    for px in range(96, W, 384):
        draw.rectangle([px, 0, px + 40, H], fill=PIL_)
        draw.rectangle([px + 18, 0, px + 21, H], fill=(30, 50, 110))
        for y in range(40, H, 320):
            draw.rectangle([px + 17, y, px + 22, y + 90], fill=GLOW)
    # 선반 실루엣: 기둥 사이에 흐릿한 모니터 칸
    for bx in range(150, W - 150, 384):
        for by in range(120, H, 520):
            draw.rectangle([bx, by, bx + 180, by + 260], fill=(9, 12, 34), outline=(22, 30, 70))
            for sy in range(by + 20, by + 250, 60):
                draw.line([bx + 4, sy + 40, bx + 176, sy + 40], fill=(24, 32, 76))
                for sx in range(bx + 14, bx + 170, 56):
                    if (sx * 7 + sy * 3) % 5 < 3:
                        draw.rectangle([sx, sy + 12, sx + 30, sy + 34], fill=(20, 40, 96), outline=(40, 70, 150))


def step_band(draw: ImageDraw.ImageDraw, x: float, y: int) -> None:
    draw.rectangle([x - HALF - 10, y, x + HALF + 10, y + 16], fill=STRINGER)
    draw.rectangle([x - HALF, y, x + HALF, y + 11], fill=TREAD)
    draw.rectangle([x - HALF, y, x + HALF, y + 1], fill=EDGE)
    draw.rectangle([x - HALF, y + 2, x + HALF, y + 3], fill=TREAD_HI)
    draw.rectangle([x - HALF, y + 11, x + HALF, y + 15], fill=RISER)


def shadows(draw: ImageDraw.ImageDraw) -> None:
    """Flight undersides cast onto the wall (drawn before the landings so a landing is never darkened)."""
    for (x0, y0), (x1, y1) in FLIGHTS:
        n = int((y0 - y1) // 16)
        for i in range(1, n):
            t = i / n; x = x0 + (x1 - x0) * t; y = int(y0 - i * 16)
            draw.rectangle([x - HALF - 10, y + 16, x + HALF + 10, y + 60], fill=(4, 5, 16))


def flights(draw: ImageDraw.ImageDraw) -> None:
    for (x0, y0), (x1, y1) in FLIGHTS:
        n = int((y0 - y1) // 16)
        for i in range(n + 1):
            t = i / n; x = x0 + (x1 - x0) * t; y = int(y0 - i * 16)
            step_band(draw, x, y)
            if i % 4 == 0:
                for side in (-1, 1):
                    px = x + side * (HALF + 5)
                    draw.rectangle([px - 2, y - 26, px + 2, y + 4], fill=(30, 40, 90))
                    draw.rectangle([px - 3, y - 30, px + 3, y - 26], fill=POST)


def landings(draw: ImageDraw.ImageDraw) -> None:
    for x, y, w, h in LANDINGS:
        draw.rectangle([x - 10, y + h, x + w + 10, y + h + 40], fill=(4, 5, 16))
        draw.rectangle([x - 10, y - 6, x + w + 10, y + h + 10], fill=STRINGER)
        for yy in range(y, y + h, 32):
            for xx in range(x, x + w, 64):
                draw.rectangle([xx + 1, yy + 1, min(x + w, xx + 64) - 1, min(y + h, yy + 32) - 1], fill=TREAD if (xx // 64 + yy // 32) % 2 else (46, 60, 116))
        draw.rectangle([x, y, x + w, y + 2], fill=EDGE)
        draw.rectangle([x + w // 2 - 20, y + h // 2 - 4, x + w // 2 + 20, y + h // 2 + 4], fill=(40, 70, 170))


def main() -> None:
    out = Path('assets/props')
    full = Image.new('RGB', (W, H), WALL)
    draw = ImageDraw.Draw(full)
    wall(draw); shadows(draw); landings(draw); flights(draw)
    for i, top in enumerate(range(0, H, CHUNK)):
        full.crop((0, top, W, min(H, top + CHUNK))).save(out / f'stairs334_chunk_{i}.png')
    full.resize((W // 8, H // 8), Image.BOX).save('assets/source/stairs334/overview.png')
    print('chunks', math.ceil(H / CHUNK))


if __name__ == '__main__':
    main()
