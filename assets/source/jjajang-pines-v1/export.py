#!/usr/bin/env /usr/bin/python3
"""검은 소나무 4종(BUILD226 사용자 “검은 색깔 좀 더 큰 나무, 가지 역동적·꾸불꾸불 소나무”): raw 2×2 → 색키 → 셀 bbox → 배율 하나 NEAREST → 검은 실루엣 톤(렌더 효과: 채널 0.24/0.30/0.26 배, 테두리는 그대로) → assets/props/jjajang_pine_N.png
   사용: /usr/bin/python3 assets/source/jjajang-pines-v1/export.py [scale]"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
scale = float(sys.argv[1]) if len(sys.argv) > 1 else 0.345
im = np.array(Image.open(ROOT / 'pines-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
fringe = (~key) & (r > g + 60) & (b > g + 60)
im[fringe, 0] = im[fringe, 1]; im[fringe, 2] = im[fringe, 1]
alpha = np.where(key, 0, 255).astype(np.uint8)
rgba = np.dstack([im[:, :, :3].astype(np.uint8), alpha])
full = Image.fromarray(rgba); cw, ch = full.width // 2, full.height // 2
contract = {'scale': scale, 'darken': [0.24, 0.30, 0.26], 'pines': []}
for i in range(4):
    cell = full.crop(((i % 2) * cw, (i // 2) * ch, (i % 2 + 1) * cw, (i // 2 + 1) * ch)); bb = cell.getbbox(); fig = cell.crop(bb)
    small = fig.resize((max(1, round(fig.width * scale)), max(1, round(fig.height * scale))), Image.NEAREST)
    a = np.array(small).astype(int); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    lum = a[:, :, :3].sum(axis=2)
    body = (a[:, :, 3] > 0) & (lum > 90)          # 검은 테두리(lum ≤ 90)는 그대로, 몸통만 어둡게
    a[body, 0] = (a[body, 0] * 0.24).astype(int); a[body, 1] = (a[body, 1] * 0.30).astype(int); a[body, 2] = (a[body, 2] * 0.26).astype(int)
    out = Image.fromarray(a.astype(np.uint8)); out.save(ROOT.parent.parent / 'props' / f'jjajang_pine_{i + 1}.png')
    # 밑동: 아래쪽 8px 알파의 가로 중앙
    al = a[:, :, 3]; ys, xs = np.nonzero(al[-8:]); base_x = int(round((xs.min() + xs.max()) / 2))
    contract['pines'].append({'file': f'assets/props/jjajang_pine_{i + 1}.png', 'size': [out.width, out.height], 'baseX': base_x})
(ROOT / 'runtime-contract.json').write_text(json.dumps(contract, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(contract))
