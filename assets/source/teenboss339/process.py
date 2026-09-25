"""teenboss339: 청소년 battle sheet, dark gajaeman knee sheet, party defend frames.

Run: uv run --with pillow --with numpy python3 assets/source/teenboss339/process.py
"""
import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('ap', HERE.parent / 'arena332' / 'process.py')
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)


def cells(path, cols, rows, size, thicken=0):
    im = Image.open(path).convert('RGB')
    if thicken: im = im.filter(ImageFilter.MaxFilter(thicken))
    a = ap.key_out(np.array(im.convert('RGBA')))
    return [a[r * size:(r + 1) * size, c * size:(c + 1) * size] for r in range(rows) for c in range(cols)]


def sheet(frames, scale, cols, out):
    """One common crop (union bbox) for every frame so the body never jumps; one BOX scale; binary alpha."""
    ys, xs = [], []
    for f in frames:
        yy, xx = np.nonzero(f[..., 3]); ys += [yy.min(), yy.max()]; xs += [xx.min(), xx.max()]
    y0, y1, x0, x1 = min(ys), max(ys) + 1, min(xs), max(xs) + 1
    w, h = round((x1 - x0) * scale), round((y1 - y0) * scale)
    rows = (len(frames) + cols - 1) // cols
    out_im = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        c = f[y0:y1, x0:x1].astype(float); a = c[..., 3:4] / 255
        prem = Image.fromarray(np.concatenate([c[..., :3] * a, c[..., 3:4]], axis=2).astype(np.uint8)).resize((w, h), Image.BOX)
        s = np.array(prem).astype(float); sa = np.maximum(s[..., 3:4], 1) / 255
        o = np.concatenate([np.clip(s[..., :3] / sa, 0, 255), s[..., 3:4]], axis=2).astype(np.uint8)
        o[..., 3] = np.where(o[..., 3] >= 128, 255, 0)
        out_im.paste(Image.fromarray(o), ((i % cols) * w, (i // cols) * h))
    out_im.save(out)
    print(out, 'cell', w, h)
    return w, h


def defend(name):
    idle = np.array(Image.open(f'assets/battle/{name}.png').convert('RGB').crop((0, 0, 384, 512)))
    r, g, b = (idle[..., i].astype(int) for i in range(3))
    bg = (r > 200) & (b > 200) & (g < 80)
    yy, xx = np.nonzero(~bg); ih = yy.max() - yy.min() + 1; feet = yy.max(); cx = (xx.min() + xx.max()) / 2
    raw = ap.key_out(np.array(Image.open(HERE / f'defend-{name}-raw.png').convert('RGBA')))
    small = ap.shrink(raw, int(ih))
    canvas = Image.new('RGBA', (384, 512), (0, 0, 0, 0))
    fr = Image.fromarray(small)
    canvas.paste(fr, (int(cx - fr.width / 2), int(feet - fr.height + 1)), fr)
    canvas.save(f'assets/battle/{name}-defend.png')
    print(name, 'defend', fr.size, 'feet', feet)


def main():
    sheet(cells(HERE / 'teen-sheet-raw.png', 2, 3, 512, thicken=3), 0.5, 3, 'assets/enemies/teenboss339.png')
    sheet(cells(HERE / 'knee-raw.png', 2, 2, 512), 0.27, 4, 'assets/props/teenboss339_knee.png')
    for n in ('hyungsub', 'gyeongsub', 'ppaman'):
        defend(n)
    # BUILD340 청소기 재설계: 컬러 잔해 6종(각 높이 34), 오른쪽에서 뻗는 손바닥(높이 220)
    for i, cell in enumerate(cells(HERE / 'debris-raw.png', 3, 2, 512)):
        Image.fromarray(ap.shrink(cell, 34)).save(f'assets/props/teenboss339_debris_{i}.png')
    palm = ap.shrink(ap.key_out(ap.thicken_lines(HERE / 'palm-raw.png', 5)), 220)
    Image.fromarray(palm).save('assets/props/teenboss339_palm.png')
    print('palm', palm.shape[1], palm.shape[0])


if __name__ == '__main__':
    main()
