#!/usr/bin/env python3
"""철창(gpt-image-2 raw) → 게임 소품: 색키 → bbox → 폭 100 NEAREST → assets/props/ship_cage.png. 열린 문 버전은 같은 그림에서 가운데 살 셋을 지운 것(기계적 후처리, 새 그림 아님).
사용: /usr/bin/python3 assets/source/ship-cage-v2/export.py (2.5-sunburst raw)"""
import numpy as np
from PIL import Image
raw = np.array(Image.open('assets/source/ship-cage-v2/cage-raw.png').convert('RGBA')).astype(int)
r, g, b = raw[:, :, 0], raw[:, :, 1], raw[:, :, 2]
key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
alpha = np.where(key, 0, 255).astype(np.uint8)
fringe = (~key) & (r > g + 60) & (b > g + 60); raw[fringe, 0] = raw[fringe, 1]; raw[fringe, 2] = raw[fringe, 1]
rgba = np.dstack([raw[:, :, :3].astype(np.uint8), alpha])
ys, xs = np.where(alpha > 0); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
crop = Image.fromarray(rgba[box[1]:box[3], box[0]:box[2]])
W = 100; scale = W / crop.width; H = round(crop.height * scale)
small = np.array(crop.resize((W, H), Image.NEAREST)); small[:, :, 3] = np.where(small[:, :, 3] >= 128, 255, 0)
Image.fromarray(small).save('assets/props/ship_cage.png')
# 열린 문: 청록 살(G>200,B>200,R<140)이 있는 열을 찾아 가운데 셋을 살 구간(위판 아래 ~ 바닥판 위)에서 지운다
cyan = (small[:, :, 3] > 0) & (small[:, :, 1] > 190) & (small[:, :, 2] > 190) & (small[:, :, 0] < 150)
cols = np.where(cyan.sum(axis=0) > H * 0.2)[0]
groups = []
for c in cols:
    if groups and c - groups[-1][-1] <= 4: groups[-1].append(c)
    else: groups.append([c])
rows = np.where(cyan.sum(axis=1) > 0)[0]; top, bot = rows.min(), rows.max()
mid = groups[len(groups) // 2 - 1: len(groups) // 2 + 2] if len(groups) >= 5 else groups[1:-1]
opened = small.copy()
for grp in mid:
    x0, x1 = grp[0] - 2, grp[-1] + 3
    opened[top:bot + 1, x0:x1] = 0
Image.fromarray(opened).save('assets/props/ship_cage_open.png')
print('cage', (W, H), 'scale', round(scale, 4), 'bars', [(gr[0], gr[-1]) for gr in groups], 'bar rows', top, bot, 'opened', [(gr[0], gr[-1]) for gr in mid])
