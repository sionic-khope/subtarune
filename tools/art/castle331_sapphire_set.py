#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Run: uv run tools/art/castle331_sapphire_set.py
# ──────────────────
"""BUILD331 sapphire floors (user: "사파이어같은 느낌", "발광석", "그림자도 조금 지고").

Source texture: assets/source/sapphire331/floor-raw.png (gpt-image-2.5-sunburst). It is made exactly seamless,
BOX-downscaled once to a 192px period and darkened per map. The spire keeps its tile keys (castle327_*) and gets
aligned floor props; the prophecy hall gets a much darker strip. Shadow strips are separate props along walls.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path('assets/source/sapphire331/floor-raw.png')
TILES = Path('assets/tiles')
PROPS = Path('assets/props')
PERIOD = 192
SPIRE_AISLE_X = 288
SHADOW = (2, 4, 16)


def save(arr: np.ndarray, path: Path) -> None:
    Image.fromarray(arr, 'RGBA').save(path)


def texture(k: float) -> np.ndarray:
    """Seamless 192px texture darkened by k (edges cross-faded with the opposite edge before the one downscale)."""
    src = np.asarray(Image.open(RAW).convert('RGB')).astype(float)
    n, band = src.shape[0], 48
    for axis in (0, 1):
        s2 = np.swapaxes(src, 0, axis)
        for i in range(band):
            w = 0.5 * (1 - i / band)
            a, b = s2[i].copy(), s2[n - 1 - i].copy()
            s2[i] = a * (1 - w) + b * w
            s2[n - 1 - i] = b * (1 - w) + a * w
    small = np.asarray(Image.fromarray(np.clip(src, 0, 255).astype(np.uint8)).resize((PERIOD, PERIOD), Image.BOX)).astype(float)
    out = np.clip(small * k, 0, 255).astype(np.uint8)
    return np.dstack([out, np.full(out.shape[:2], 255, np.uint8)])


def world_tiled(tex: np.ndarray, x0: int, y0: int, w: int, h: int, ox: int = 0, oy: int = 0) -> np.ndarray:
    """Crop of the infinite texture for a world rectangle, phase-aligned so neighbouring props meet without a seam."""
    rows = (np.arange(h) + y0 - oy) % PERIOD
    cols = (np.arange(w) + x0 - ox) % PERIOD
    return tex[rows][:, cols].copy()


def shadow(length: int, width: int = 28, horizontal: bool = False) -> np.ndarray:
    fade = (np.linspace(0.62, 0.0, width) ** 1.4 * 255).astype(np.uint8)
    if horizontal:
        a = np.zeros((width, length, 4), np.uint8); a[..., :3] = SHADOW; a[..., 3] = fade[:, None]
    else:
        a = np.zeros((length, width, 4), np.uint8); a[..., :3] = SHADOW; a[..., 3] = fade[None, :]
    return a


def main() -> None:
    spire = texture(0.72)
    save(spire, TILES / 'castle327_aisle.png')
    save(spire[:32, :32].copy(), TILES / 'castle327_floor.png')
    # 샘 방 바닥(128..640 × 128..576) — 통로 카펫과 같은 위상
    save(world_tiled(spire, 128, 128, 512, 448, ox=SPIRE_AISLE_X), PROPS / 'castle331_spire_room.png')
    edge = np.zeros((32, 32, 4), np.uint8)
    edge[:, 8:] = (5, 9, 34, 255)
    edge[1:15, 12:29] = (13, 31, 92, 255)
    edge[17:31, 9:28] = (13, 31, 92, 255)
    edge[1:3, 12:29] = (34, 65, 160, 255)
    edge[17:19, 9:28] = (34, 65, 160, 255)
    edge[:, 28:31] = (24, 48, 130, 255)
    edge[:, 31] = (111, 170, 255, 255)
    save(edge, TILES / 'castle327_edge_left.png')
    save(edge[:, ::-1].copy(), TILES / 'castle327_edge_right.png')
    dark = texture(0.34)
    save(dark[:32, :32].copy(), TILES / 'castle328_void_floor.png')
    save(dark[:64].copy(), PROPS / 'castle331_prophecy_strip.png')
    save(dark[:, :64].copy(), PROPS / 'castle331_prophecy_strip_v.png')
    left = shadow(PERIOD)
    save(left, PROPS / 'castle331_shadow_left.png')
    save(left[:, ::-1].copy(), PROPS / 'castle331_shadow_right.png')
    save(shadow(160, horizontal=True), PROPS / 'castle331_shadow_top.png')
    save(shadow(PERIOD, width=20, horizontal=True), PROPS / 'castle331_shadow_top_long.png')


if __name__ == '__main__':
    main()
