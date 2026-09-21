#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""벚꽃 숲 9 러너 장애물(BUILD282): obstacles-raw.png 2×2(꽃 잎 무더기 / 큰 꽃 / 꽃가지 / 꽃잎 다발) → 마젠타 색키 → 셀 bbox → 폭 기준 NEAREST 축소(run-obstacles-v1 과 같은 폭)
   → assets/props/run_sakura_leaf_1.png(22), run_sakura_leaf_2.png(22), run_sakura_branch.png(64), run_sakura_petals.png(16). 사용: /usr/bin/python3 assets/source/run-obstacles-sakura-v1/export.py"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
im = np.array(Image.open(ROOT / 'obstacles-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 190) & (b > 190) & (g < 130)
full = Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), np.where(key, 0, 255).astype(np.uint8)]))
report = {}
for name, box, width in (('run_sakura_leaf_1', (0, 0, 512, 512), 22), ('run_sakura_leaf_2', (512, 0, 1024, 512), 22), ('run_sakura_branch', (0, 512, 512, 1024), 64), ('run_sakura_petals', (512, 512, 1024, 1024), 16)):
    cell = full.crop(box); fig = cell.crop(cell.getbbox())
    s = width / fig.width; w, h = max(1, round(fig.width * s)), max(1, round(fig.height * s))
    small = fig.resize((w, h), Image.NEAREST); a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    out = Image.fromarray(a); out.save(A / 'props' / f'{name}.png'); report[name] = {'size': [w, h], 'scale': round(s, 4)}
(ROOT / 'runtime-contract.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
