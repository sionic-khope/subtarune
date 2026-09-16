#!/usr/bin/env python3
"""벽 대포 raw(gpt-image-2.5-sunburst, 마젠타 배경) → 색키 → bbox → 폭 176 NEAREST 한 번 → assets/props/ship_cannon.png. 포구 가운데 y 를 출력한다(맵 CANNON y = 274 - 그 값).
사용: /usr/bin/python3 assets/source/ship-cannon-v2/export.py"""
import numpy as np
from PIL import Image
im = np.array(Image.open('assets/source/ship-cannon-v2/cannon-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
alpha = np.where(key, 0, 255).astype(np.uint8)
fringe = (~key) & (r > g + 60) & (b > g + 60); im[fringe, 0] = im[fringe, 1]; im[fringe, 2] = im[fringe, 1]
rgba = np.dstack([im[:, :, :3].astype(np.uint8), alpha])
ys, xs = np.where(alpha > 0); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
crop = Image.fromarray(rgba[box[1]:box[3], box[0]:box[2]])
W = 176; scale = W / crop.width; H = round(crop.height * scale)
small = np.array(crop.resize((W, H), Image.NEAREST)); small[:, :, 3] = np.where(small[:, :, 3] >= 128, 255, 0)
Image.fromarray(small).save('assets/props/ship_cannon.png')
a = small[:, :, 3]; mys, mxs = np.where(a[:, -24:] > 0)
print('cannon', (W, H), 'scale', round(scale, 4), 'muzzle centre y', round(float(mys.mean()), 1))
