"""prophecy328: six prophecy panels (3x2 sheet) + the navy grand door.
magenta key (all pure-key pixels, incl. enclosed gaps) -> fringe -> tight crop -> one premultiplied BOX scale -> binary alpha.

Run: uv run --with pillow --with numpy python3 assets/source/prophecy328/process.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
PANEL_H = 140
DOOR_H = 264


def key_out(im: np.ndarray) -> np.ndarray:
    r, g, b = (im[..., i].astype(int) for i in range(3))
    key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
    near = np.zeros_like(key)
    near[1:, :] |= key[:-1, :]; near[:-1, :] |= key[1:, :]; near[:, 1:] |= key[:, :-1]; near[:, :-1] |= key[:, 1:]
    pinkish = (r > 120) & (b > 120) & (g < 90) & (r - g > 90)
    im = im.copy()
    im[..., 3] = np.where(key | (near & pinkish), 0, 255).astype(np.uint8)
    return im


def shrink(im: np.ndarray, target_h: int) -> np.ndarray:
    ys, xs = np.nonzero(im[..., 3])
    crop = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(float)
    scale = target_h / crop.shape[0]
    size = (max(1, round(crop.shape[1] * scale)), target_h)
    a = crop[..., 3:4] / 255
    prem = Image.fromarray(np.concatenate([crop[..., :3] * a, crop[..., 3:4]], axis=2).astype(np.uint8))
    small = np.array(prem.resize(size, Image.BOX)).astype(float)
    sa = np.maximum(small[..., 3:4], 1) / 255
    out = np.concatenate([np.clip(small[..., :3] / sa, 0, 255), small[..., 3:4]], axis=2).astype(np.uint8)
    out[..., 3] = np.where(out[..., 3] >= 128, 255, 0)
    return out


def main() -> None:
    sheet = key_out(np.array(Image.open(HERE / 'panels-raw.png').convert('RGBA')))
    outs = []
    for i in range(6):
        row, col = divmod(i, 3)
        cell = sheet[row * 512:(row + 1) * 512, col * 512:(col + 1) * 512]
        arr = shrink(cell, PANEL_H)
        path = Path(f'assets/props/prophecy328_{i + 1}.png')
        Image.fromarray(arr).save(path)
        outs.append(arr)
        print(path, arr.shape[1], 'x', arr.shape[0])
    door = shrink(key_out(np.array(Image.open(HERE / 'door-raw.png').convert('RGBA'))), DOOR_H)
    Image.fromarray(door).save('assets/props/prophecy328_door.png')
    print('assets/props/prophecy328_door.png', door.shape[1], 'x', door.shape[0])
    width = sum(a.shape[1] for a in outs) + door.shape[1] + 16 * 8
    board = Image.new('RGBA', (width * 2, DOOR_H * 2 + 32), (4, 4, 10, 255))
    x = 16
    for a in [*outs, door]:
        img = Image.fromarray(a)
        board.alpha_composite(img.resize((img.width * 2, img.height * 2), Image.NEAREST), (x * 2 // 2, 16))
        x += img.width * 2 + 16
    board.save(HERE / 'preview.png')


if __name__ == '__main__':
    main()
