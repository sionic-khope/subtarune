#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run (repo root): uv run assets/source/janitor-hidden/refs.py
"""Edit references for the hidden janitor (Gerson parody) sprites.

kick-anchor.png  : approved attack frame 0 (assets/battle/janitor-hero-attack.png, 320 cell, feet root [164,236]) at 3x
                   NEAREST, repeated in a 2x2 grid of 768x512 cells on a 1536x1024 #FF00FF canvas, feet root at
                   ANCHOR_ROOT in every cell. Identity + pixel density + scale + feet-baseline anchor for the kick raw.
whirl-ref.png    : Gerson teleport whirl frames (ref/frame-whirl-a/b/c.png) keyed onto magenta, side by side. SHAPE only.
slash-ref.png    : Gerson crescent swing (ref/frame-crescent-1.png) keyed (largest light low-saturation component only,
                   Gerson removed) and MIRRORED so the arc bulges to the right. SHAPE only.
star-ref.png     : the three white star bullets of ref/frame-stars.png keyed onto magenta, 3x NEAREST. SHAPE only.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
REF: Final = ROOT / "ref"
MAGENTA: Final = (255, 0, 255)
ATTACK_CELL: Final = 320
ATTACK_PIVOT: Final = (164, 236)
ANCHOR_SCALE: Final = 3
ANCHOR_CELL: Final = (768, 512)
ANCHOR_ROOT: Final = (430, 430)


def largest(mask: np.ndarray) -> np.ndarray:
    """Largest 4-connected component of a boolean mask."""
    seen = np.zeros(mask.shape, bool)
    best: list[tuple[int, int]] = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        queue, pts = deque([(y0, x0)]), []
        seen[y0, x0] = True
        while queue:
            y, x = queue.popleft()
            pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(pts) > len(best):
            best = pts
    out = np.zeros(mask.shape, bool)
    if best:
        ys, xs = zip(*best)
        out[list(ys), list(xs)] = True
    return out


def keyed(path: Path, keep: np.ndarray | None = None) -> Image.Image:
    """Video frame -> RGB on magenta: bright or saturated pixels survive, the dark stage background becomes magenta."""
    with Image.open(path) as image:
        rgb = np.asarray(image.convert("RGB")).astype(int)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    mask = (mx > 80) | ((mx - mn) > 60) if keep is None else keep
    out = np.empty_like(rgb)
    out[:] = MAGENTA
    out[mask] = rgb[mask]
    return Image.fromarray(out.astype(np.uint8))


def kick_anchor() -> None:
    with Image.open(GAME / "assets/battle/janitor-hero-attack.png") as sheet:
        frame = sheet.convert("RGBA").crop((0, 0, ATTACK_CELL, ATTACK_CELL))
    big = frame.resize((ATTACK_CELL * ANCHOR_SCALE, ATTACK_CELL * ANCHOR_SCALE), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (ANCHOR_CELL[0] * 2, ANCHOR_CELL[1] * 2), MAGENTA + (255,))
    for index in range(4):
        cx, cy = (index % 2) * ANCHOR_CELL[0], (index // 2) * ANCHOR_CELL[1]
        dx = cx + ANCHOR_ROOT[0] - ATTACK_PIVOT[0] * ANCHOR_SCALE
        dy = cy + ANCHOR_ROOT[1] - ATTACK_PIVOT[1] * ANCHOR_SCALE
        cell = Image.new("RGBA", canvas.size)
        cell.alpha_composite(big, (dx, dy)) if dx >= 0 and dy >= 0 else cell.paste(big, (dx, dy), big)
        # keep each copy inside its own cell
        mask = Image.new("L", canvas.size, 0)
        mask.paste(255, (cx, cy, cx + ANCHOR_CELL[0], cy + ANCHOR_CELL[1]))
        cell.putalpha(Image.fromarray(np.minimum(np.asarray(cell.getchannel("A")), np.asarray(mask))))
        canvas.alpha_composite(cell)
    out = canvas.convert("RGB")
    bounds = [out.crop((c % 2 * 768, c // 2 * 512, c % 2 * 768 + 768, c // 2 * 512 + 512)) for c in range(4)]
    for crop in bounds:
        rgb = np.asarray(crop).astype(int)
        body = ~((rgb[:, :, 0] == 255) & (rgb[:, :, 1] == 0) & (rgb[:, :, 2] == 255))
        ys, xs = np.nonzero(body)
        assert xs.min() > 0 and ys.min() > 0 and xs.max() < 767 and ys.max() < 511, "anchor touches a cell edge"
    out.save(ROOT / "kick-anchor.png", optimize=True)
    rgb = np.asarray(bounds[0]).astype(int)
    body = ~((rgb[:, :, 0] == 255) & (rgb[:, :, 1] == 0) & (rgb[:, :, 2] == 255))
    ys, xs = np.nonzero(body)
    print("kick-anchor.png", out.size, "cell0 bounds", [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
          (ROOT / "kick-anchor.png").stat().st_size, "bytes")


def side_by_side(images: list[Image.Image], gap: int = 24, scale: int = 1) -> Image.Image:
    images = [im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST) for im in images]
    canvas = Image.new("RGB", (sum(im.width for im in images) + gap * (len(images) + 1),
                               max(im.height for im in images) + gap * 2), MAGENTA)
    x = gap
    for im in images:
        canvas.paste(im, (x, gap))
        x += im.width + gap
    return canvas


def fx_refs() -> None:
    whirl = []
    # boxes (crop coords) that hold the thrown shell / white stars next to the whirl, painted out so only the whirl is left
    erase = {"a": [(0, 100, 75, 180)], "b": [(0, 90, 95, 175)], "c": [(0, 80, 120, 190)]}
    for k in "abc":
        crop = np.asarray(keyed(REF / f"frame-whirl-{k}.png").crop((100, 0, 520, 260))).copy()
        for x0, y0, x1, y1 in erase[k]:
            box = crop[y0:y1, x0:x1]
            r, g, b = (box[:, :, c].astype(int) for c in range(3))
            mx, mn = box.max(axis=2).astype(int), box.min(axis=2).astype(int)
            # whirl band colours only: olive green, pink, mid grey; everything else in the box is shell/star/outline
            olive = (r > 70) & (r < 150) & (g > 130) & (g < 200) & (b < 90)
            pink = (r > 190) & (b > 190) & (g < 180)
            grey = ((mx - mn) < 25) & (mn > 90) & (mn < 215)
            box[~(olive | pink | grey)] = MAGENTA
        whirl.append(Image.fromarray(crop))
    side_by_side(whirl).save(ROOT / "whirl-ref.png", optimize=True)
    with Image.open(REF / "frame-crescent-1.png") as image:
        rgb = np.asarray(image.convert("RGB")).astype(int)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    light_grey = (mn > 110) & ((mx - mn) < 45)
    crescent = keyed(REF / "frame-crescent-1.png", keep=largest(light_grey))
    side_by_side([crescent.transpose(Image.Transpose.FLIP_LEFT_RIGHT)]).save(ROOT / "slash-ref.png", optimize=True)
    stars = keyed(REF / "frame-stars.png").crop((0, 80, 220, 160))
    side_by_side([stars], scale=3).save(ROOT / "star-ref.png", optimize=True)
    for name in ("whirl-ref.png", "slash-ref.png", "star-ref.png"):
        with Image.open(ROOT / name) as image:
            print(name, image.size, (ROOT / name).stat().st_size, "bytes")


if __name__ == "__main__":
    kick_anchor()
    fx_refs()
