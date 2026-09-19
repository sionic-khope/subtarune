#!/usr/bin/env /usr/bin/python3
"""석상(BUILD228 사용자 “이 사진 그대로에서 배경만 제거하고 석상 버전으로, 좀 거대함”): raw 1024² → 마젠타 색키 → bbox → 배율 NEAREST → 이진 알파 → assets/props/jjajang_statue.png
   사용: /usr/bin/python3 assets/source/jjajang-statue-v1/export.py [scale]   (기본 0.18 → 높이 약 169px: 대화 중 보이는 230px 안에 석상 전체 + 요플래 머리)"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
scale = float(sys.argv[1]) if len(sys.argv) > 1 else 0.18
im = np.array(Image.open(ROOT / 'statue-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
fringe = (~key) & (r > g + 60) & (b > g + 60)
im[fringe, 0] = im[fringe, 1]; im[fringe, 2] = im[fringe, 1]
alpha = np.where(key, 0, 255).astype(np.uint8)
full = Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), alpha]))
bb = full.getbbox(); fig = full.crop(bb)
small = fig.resize((max(1, round(fig.width * scale)), max(1, round(fig.height * scale))), Image.NEAREST)
a = np.array(small).astype(int); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
out = Image.fromarray(a.astype(np.uint8)); out.save(ROOT.parent.parent / 'props' / 'jjajang_statue.png')
al = a[:, :, 3]; ys, xs = np.nonzero(al[-6:]); base_x = int(round((xs.min() + xs.max()) / 2))
contract = {'scale': scale, 'rawBbox': list(bb), 'file': 'assets/props/jjajang_statue.png', 'size': [out.width, out.height], 'baseX': base_x, 'plinthWidth': int(xs.max() - xs.min() + 1)}
(ROOT / 'runtime-contract.json').write_text(json.dumps(contract, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(contract))
