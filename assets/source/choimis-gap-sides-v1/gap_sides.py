#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""최미스 걷기 시트 옆모습에도 가슴 GAP(BUILD279 사용자 “gap 없는 부분 있는 듯 옆모습이랑 등 점검”): 정면 0번 칸의 GAP 글자 픽셀을 그대로 떼어 가로 45% 로 줄여
   옆모습(left/right 행) 셔츠 앞쪽에 얹는다(재사용 — 새로 그리지 않음). 뒷모습(up 행)은 티셔츠 등이라 글자 없음(원본 그대로).
   assets/sprites/choimis.png 를 고치고(원본은 choimis-before.png), 가면 시트는 mask_overlay.py 를 다시 돌려 따라온다.
   사용: /usr/bin/python3 assets/source/choimis-gap-sides-v1/gap_sides.py"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
CELL = 128
src = Image.open(ROOT / 'choimis-before.png').convert('RGBA')
assert src.size == (512, 512)
arr = np.array(src).astype(int)
def shirt_mask(fr):   # 분홍 셔츠 픽셀
    r, g, b, a = fr[:, :, 0], fr[:, :, 1], fr[:, :, 2], fr[:, :, 3]
    return (a > 0) & (r > 200) & (b > 200) & (g < 200) & (g > 120)
def dark_mask(fr):
    return (fr[:, :, 3] > 0) & (fr[:, :, :3].sum(axis=2) < 150)
f0 = arr[0:CELL, 0:CELL]
sm = shirt_mask(f0); ys, xs = np.where(sm); st, sb, sl, sr = ys.min(), ys.max(), xs.min(), xs.max()
inner = np.zeros_like(sm); inner[st + 4:sb - 3, sl + 4:sr - 3] = True
letters = dark_mask(f0) & inner
ly, lx = np.where(letters); lt, lb, ll, lr = ly.min(), ly.max(), lx.min(), lx.max()
patch = np.zeros((lb - lt + 1, lr - ll + 1, 4), dtype=np.uint8)
sub = letters[lt:lb + 1, ll:lr + 1]; patch[sub] = f0[lt:lb + 1, ll:lr + 1][sub].astype(np.uint8)
patch_img = Image.fromarray(patch)
side = patch_img.resize((max(6, round(patch_img.width * 0.45)), patch_img.height), Image.NEAREST)
top_off = lt - st                                       # 셔츠 위에서 글자까지
print('shirt', (sl, st, sr, sb), 'letters', (ll, lt, lr, lb), 'patch', patch_img.size, 'side', side.size, 'top_off', top_off)
out = src.copy()
for row, facing in ((2, 'left'), (3, 'right')):
    for col in range(4):
        box = (col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)
        fr = arr[row * CELL:(row + 1) * CELL, col * CELL:(col + 1) * CELL]
        m = shirt_mask(fr); ys, xs = np.where(m); t, b, l, r = ys.min(), ys.max(), xs.min(), xs.max()
        y = t + top_off
        x = (l + 3) if facing == 'left' else (r - 2 - side.width)
        frame = out.crop(box); frame.alpha_composite(side, (int(x), int(y))); out.paste(frame, box)
out.save(A / 'sprites' / 'choimis.png'); out.save(ROOT / 'choimis-after.png')
print('written', A / 'sprites' / 'choimis.png')
