#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""가면 쓴 최미스 걷기 시트(BUILD279, 사용자 “최땡땡 가슴에 GAP 있는 스프라이트 있을텐데 왜 재사용 안 한 거지”):
   기존 걷기 시트 assets/sprites/choimis.png(GAP 원본) 16칸 위에 기존 디스코드 가면 조각(assets/props/discord_mask.png 46×35 — 빛 드는 공터에서 승인된
   choimis-masked.png 의 가면과 같은 그림)을 그대로 얹는다. gpt-image 로 다시 그린 시트(choimis-masked-walk-raw.png)는 GAP 이 빠져 폐기.
   - 정면(down) 행: 승인된 정면 가면 자리(머리 상자 가로 중심, 머리 위에서 6px) 그대로 — 칸마다 머리가 1~2px 흔들리므로 칸별 머리 상자에 맞춘다.
   - 옆(left/right) 행: 같은 가면을 가로 65%(30px)로 줄여 얼굴 쪽(머리 상자의 보는 쪽 절반)에.
   - 뒤(up) 행: 가면은 얼굴에 있으니 뒷모습은 원본 그대로.
   사용: /usr/bin/python3 assets/source/sakura6-v1/mask_overlay.py"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
CELL = 128
sheet = Image.open(A / 'sprites' / 'choimis.png').convert('RGBA')
mask = Image.open(A / 'props' / 'discord_mask.png').convert('RGBA')
approved = np.array(Image.open(A / 'sprites' / 'choimis-masked.png').convert('RGBA'))
# 승인된 정면 가면 자리(choimis-masked.png 와 원본 0번 칸의 차이 상자) → 머리 상자 기준 offset
orig0 = np.array(sheet.crop((0, 0, CELL, CELL)))
diff = np.any(orig0 != approved, axis=2); ys, xs = np.where(diff)
mx, my = int(xs.min()), int(ys.min())
assert (xs.max() - xs.min() + 1, ys.max() - ys.min() + 1) == mask.size, '승인 가면 조각 = discord_mask.png'

def head_box(frame):
    a = np.array(frame)[:, :, 3] > 0; rows = np.where(a.any(axis=1))[0]; top, bot = int(rows[0]), int(rows[-1])
    hd = a[top:top + int((bot - top) * 0.4)]; cols = np.where(hd.any(axis=0))[0]
    return top, int(cols[0]), int(cols[-1])

t0, l0, r0 = head_box(sheet.crop((0, 0, CELL, CELL)))
dx_center = mx + mask.width / 2 - (l0 + r0) / 2      # 가면 가로 중심 - 머리 가로 중심 (≈0)
dy_top = my - t0                                       # 머리 위에서 몇 px 아래
side = mask.resize((round(mask.width * 0.65), mask.height), Image.NEAREST)
out = Image.new('RGBA', sheet.size, (0, 0, 0, 0)); out.paste(sheet, (0, 0))
for row, facing in enumerate(('down', 'up', 'left', 'right')):
    for col in range(4):
        box = (col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)
        frame = sheet.crop(box); top, hl, hr = head_box(frame)
        if facing == 'up':
            continue
        layer = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        if facing == 'down':
            x = round((hl + hr) / 2 + dx_center - mask.width / 2); layer.alpha_composite(mask, (x, top + dy_top))
        elif facing == 'left':
            layer.alpha_composite(side, (hl + 1, top + dy_top))
        else:
            layer.alpha_composite(side, (hr - side.width, top + dy_top))
        frame = frame.copy(); frame.alpha_composite(layer); out.paste(frame, box)
out.save(A / 'sprites' / 'choimis-masked-walk.png')
# 검사: 정면 0번 칸이 승인된 choimis-masked.png 와 같다, GAP 글자(어두운 픽셀) 개수가 원본과 같다
got0 = np.array(out.crop((0, 0, CELL, CELL)))
assert np.array_equal(got0, approved), '정면 0번 칸은 승인된 가면 그림과 같아야 한다'
def dark_count(im): a = np.array(im); return int(((a[:, :, 3] > 0) & (a[:, :, :3].sum(axis=2) < 120)).sum())
for col in range(4):
    o, g = sheet.crop((col * CELL, 0, (col + 1) * CELL, CELL)), out.crop((col * CELL, 0, (col + 1) * CELL, CELL))
    assert abs(dark_count(o.crop((0, 70, CELL, CELL))) - dark_count(g.crop((0, 70, CELL, CELL)))) == 0, f'정면 {col}번 칸 몸통(GAP) 은 그대로'
print('ok', out.size, 'mask at', (mx, my), 'offsets', dx_center, dy_top)
