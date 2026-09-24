"""cathedral323 sword: magenta key -> tight crop -> one BOX scale (premultiplied) -> binary alpha runtime PNG.

Run: /usr/bin/python3 assets/source/cathedral323/process.py
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
RAW = HERE / 'sword-raw.png'
OUT = Path('assets/props/cathedral323_sword.png')
PREVIEW = HERE / 'sword-preview.png'
TARGET_H = 160


def is_key(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    return (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)


def main() -> None:
    im = np.array(Image.open(RAW).convert('RGBA'))
    key = is_key(im[..., :3])
    h, w = key.shape
    bg = np.zeros_like(key)
    queue = deque((y, x) for y in range(h) for x in (0, w - 1) if key[y, x])
    queue.extend((y, x) for x in range(w) for y in (0, h - 1) if key[y, x])
    for y, x in queue:
        bg[y, x] = True
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and key[ny, nx]:
                bg[ny, nx] = True
                queue.append((ny, nx))
    # magenta fringe next to the removed background (anti-aliasing) also goes
    fringe = np.zeros_like(bg)
    fringe[1:, :] |= bg[:-1, :]; fringe[:-1, :] |= bg[1:, :]; fringe[:, 1:] |= bg[:, :-1]; fringe[:, :-1] |= bg[:, 1:]
    r, g, b = (im[..., i].astype(int) for i in range(3))
    pinkish = (r > 120) & (b > 120) & (g < 90) & (r - g > 90)
    # enclosed holes (between arms and body) are the same pure key colour, never part of the sword palette
    alpha = np.where(bg | key | (fringe & pinkish), 0, 255).astype(np.uint8)
    im[..., 3] = alpha
    ys, xs = np.nonzero(alpha)
    crop = Image.fromarray(im[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    scale = TARGET_H / crop.height
    size = (max(1, round(crop.width * scale)), TARGET_H)
    # BOX average of opaque pixels only (premultiplied), then binary alpha: keeps the face readable at game size
    src = np.array(crop).astype(float)
    a = src[..., 3:4] / 255
    prem = Image.fromarray(np.concatenate([src[..., :3] * a, src[..., 3:4]], axis=2).astype(np.uint8))
    small = np.array(prem.resize(size, Image.BOX)).astype(float)
    sa = np.maximum(small[..., 3:4], 1) / 255
    arr = np.concatenate([np.clip(small[..., :3] / sa, 0, 255), small[..., 3:4]], axis=2).astype(np.uint8)
    arr[..., 3] = np.where(arr[..., 3] >= 128, 255, 0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr).save(OUT)
    board = Image.new('RGBA', (size[0] * 4 + 24, TARGET_H * 4 + 16), (40, 22, 60, 255))
    board.alpha_composite(Image.fromarray(arr).resize((size[0] * 4, TARGET_H * 4), Image.NEAREST), (12, 8))
    board.save(PREVIEW)
    print(OUT, size, 'crop', crop.size, 'scale', round(scale, 4))


if __name__ == '__main__':
    main()
