#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""벚꽃 숲 12 제단 소품(BUILD284): stump_altar-raw.png(잘린 나무 그루터기 제단) · dark_jjajang-raw.png(어둠의 짜장면 그릇), gpt-image 마젠타 배경
   → 색키 → 잘라 → 폭 기준 NEAREST 축소 → assets/props/sakura_stump_altar.png(44px) · dark_jjajang.png(26px)
   + stump-contract.json(size·top = 윗면(옅은 나무 단면) 가운데 픽셀 — 그릇이 놓이는 자리), bowl-contract.json(size). 사용: /usr/bin/python3 assets/source/sakura12-v1/export.py"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
def keyed(name):
    im = np.array(Image.open(ROOT / name).convert('RGBA')).astype(int); r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    key = (r > 190) & (b > 190) & (g < 130)
    full = Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), np.where(key, 0, 255).astype(np.uint8)]))
    box = full.getbbox(); return full.crop(box), box
def shrink(fig, width):
    s = width / fig.width; w, h = max(1, round(fig.width * s)), max(1, round(fig.height * s))
    small = fig.resize((w, h), Image.NEAREST); a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(a), s
stump, sbox = keyed('stump_altar-raw.png'); small, s = shrink(stump, 44)
a = np.array(stump).astype(int); r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
top = (al > 0) & (r > 200) & (g > 165) & (b > 130) & ~((r > 225) & (b > 185) & (g < 200))   # 옅은 나무 단면(분홍 꽃잎 제외)
ys, xs = np.nonzero(top); tx, ty = xs.mean() * s, ys.mean() * s
small.save(A / 'props' / 'sakura_stump_altar.png')
(ROOT / 'stump-contract.json').write_text(json.dumps({'file': 'assets/props/sakura_stump_altar.png', 'size': list(small.size), 'scale': round(s, 4), 'top': [round(tx), round(ty)], 'raw': {'bbox': list(sbox), 'top': [round(xs.mean()), round(ys.mean())]}}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
bowl, bbox = keyed('dark_jjajang-raw.png'); bsmall, bs = shrink(bowl, 26)
bsmall.save(A / 'props' / 'dark_jjajang.png')
(ROOT / 'bowl-contract.json').write_text(json.dumps({'file': 'assets/props/dark_jjajang.png', 'size': list(bsmall.size), 'scale': round(bs, 4), 'raw': {'bbox': list(bbox)}}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('stump', small.size, 'top', (round(tx), round(ty)), '| bowl', bsmall.size)
