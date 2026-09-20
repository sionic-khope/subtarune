#!/usr/bin/env /usr/bin/python3
"""거대 벚꽃 sweep 그림(BUILD262 사용자 “딱 바뀔때는 벚꽃이 엄청 크게 화면을 한번 1초동안 대각선부터 쌰아아악”): blossom-raw(왼쪽 꽃 한 송이, 오른쪽 꽃잎 한 장, gpt-image) → 마젠타 색키 → 반씩 잘라 bbox → NEAREST 축소
   → assets/props/sakura_blossom_big.png(320px), sakura_petal_big.png(160px). 사용: /usr/bin/python3 assets/source/jjajang-sakura-v1/export-blossom.py"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
im = np.array(Image.open(ROOT / 'blossom-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 225) & (b > 225) & (g < 70)                    # 순수 마젠타만(분홍 꽃잎·짙은 분홍 테두리는 g 가 높거나 b 가 낮다)
alpha = np.where(key, 0, 255).astype(np.uint8)
full = Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), alpha]))
for name, box, size in (('sakura_blossom_big', (0, 0, 600, 1024), 320), ('sakura_petal_big', (600, 0, 1024, 1024), 160)):
    cell = full.crop(box); bb = cell.getbbox(); fig = cell.crop(bb)
    scale = size / max(fig.width, fig.height)
    small = fig.resize((max(1, round(fig.width * scale)), max(1, round(fig.height * scale))), Image.NEAREST)
    a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    out = Image.fromarray(a); out.save(ROOT.parent.parent / 'props' / f'{name}.png'); print(name, out.size)
