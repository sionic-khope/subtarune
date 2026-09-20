#!/usr/bin/env /usr/bin/python3
"""벚꽃다리(BUILD264 사용자 “오른쪽으로 이동하면 또 벚꽃다리가 보이는데 거기 가순이들하고 최미스 가면쓰고있고”): bridge-raw(1536×1024, gpt-image) → 마젠타 색키 → bbox → 폭 416px(13칸) NEAREST → assets/props/sakura_bridge.png
   사용: /usr/bin/python3 assets/source/jjajang-sakura-v1/export-bridge.py"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
im = np.array(Image.open(ROOT / 'bridge-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 225) & (b > 225) & (g < 70)
full = Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), np.where(key, 0, 255).astype(np.uint8)]))
fig = full.crop(full.getbbox()); scale = 416 / fig.width
small = fig.resize((416, max(1, round(fig.height * scale))), Image.NEAREST)
a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
out = Image.fromarray(a); out.save(ROOT.parent.parent / 'props' / 'sakura_bridge.png'); print('sakura_bridge', out.size)
