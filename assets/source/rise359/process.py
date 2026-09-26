#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD359 rise/landing sheets + sunset backdrop (gpt-image-2.5-sunburst raws in this folder).

Each 2x2 raw → magenta keyed out, each cell trimmed, the generator's pixel grid (≈ STEP px) collapsed to one pixel,
then laid in a 4-cell strip with every figure's feet on the cell bottom (tumble frames centred).
"""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path('assets/source/rise359')


def grid_step(a: np.ndarray) -> float:
    # 같은 색이 이어지는 길이의 최빈값 ≈ 도트 한 칸 크기
    runs = []
    for row in a[::7]:
        same = np.all(row[1:, :3] == row[:-1, :3], axis=1)
        n = 1
        for s in same:
            if s: n += 1
            else:
                if 4 <= n <= 30: runs.append(n)
                n = 1
    return float(np.median(runs)) if runs else 10.0


def key(img: Image.Image) -> Image.Image:
    a = np.asarray(img.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = (r > 170) & (b > 170) & (g < 110)
    out = np.dstack([a, np.where(mag, 0, 255)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def strip(name: str, out: str, centre: tuple[int, ...] = ()) -> None:
    raw = Image.open(SRC / f'{name}-raw.png').convert('RGB')
    arr = np.asarray(raw)
    step = grid_step(arr)
    cells = []
    for i in range(4):
        cx, cy = (i % 2) * 512, (i // 2) * 512
        c = key(raw.crop((cx, cy, cx + 512, cy + 512)))
        bbox = c.getbbox()
        c = c.crop(bbox)
        w, h = max(1, round(c.width / step)), max(1, round(c.height / step))
        c = c.resize((w, h), Image.NEAREST)
        al = np.asarray(c)[..., 3]
        c.putalpha(Image.fromarray(np.where(al > 127, 255, 0).astype(np.uint8)))
        cells.append(c)
    cw = max(c.width for c in cells) + 2
    ch = max(c.height for c in cells) + 2
    sheet = Image.new('RGBA', (cw * 4, ch), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        y = (ch - c.height) // 2 if i in centre else ch - c.height
        sheet.paste(c, (i * cw + (cw - c.width) // 2, y), c)
    sheet.save(out)
    print(out, sheet.size, 'step', step, [c.size for c in cells])


def backdrop() -> None:
    im = Image.open(SRC / 'sunset-raw.png').convert('RGB')
    step = 2
    im = im.resize((im.width // step, im.height // step), Image.NEAREST)
    im.save('assets/backdrops/castle_sunset359.png')
    print('backdrop', im.size)


if __name__ == '__main__':
    strip('rise', 'assets/sprites/hyungsub-rise.png')
    strip('land2', 'assets/sprites/hyungsub-land.png', centre=(0, 1))
    backdrop()
