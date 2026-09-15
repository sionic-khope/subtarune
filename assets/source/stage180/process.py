#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/stage180/process.py   (루트에서)
"""무대 생성 자산 가공(BUILD180): ① 리듬 무대 배경(1536×1024 → 4:3 가운데 crop → 480×360, 스크린 사각형 좌표를 재서 rhythm_backdrop.json 에 기록)
② 대기실 소품 시트(2×3, 마젠타 크로마키 → 셀별 bbox crop → 목표 폭으로 NEAREST 축소) ③ 바닥 텍스처(검은 무대 판자·마룬 카펫 512 → 128 타일 → 큰 소품으로 타일링)."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parents[2]
OUT = GAME / 'assets/props'

# ① 배경
b = Image.open(ROOT / 'backdrop/backdrop-raw.png').convert('RGB')
W, H = b.size
cw = int(H * 4 / 3); x0 = (W - cw) // 2
crop = b.crop((x0, 0, x0 + cw, H))
small = crop.resize((480, 360), Image.LANCZOS)
small.save(OUT / 'rhythm_backdrop.png')
# 스크린: 가운데 위쪽의 거의 검은(밝기 < 28) 큰 영역의 바운딩 박스
a = np.array(small).astype(int); lum = a.sum(axis=2) / 3
dark = lum < 28
cols = dark[20:200, 60:420].sum(axis=0); rows = dark[20:200, 60:420].sum(axis=1)
xs = np.where(cols > 60)[0]; ys = np.where(rows > 120)[0]
tv = {'x': int(xs.min() + 60), 'y': int(ys.min() + 20), 'w': int(xs.max() - xs.min() + 1), 'h': int(ys.max() - ys.min() + 1)}
(OUT / 'rhythm_backdrop.json').write_text(json.dumps(tv) + '\n')
print('backdrop 480x360, screen', tv)

# ② 소품
def keyed(img):
    px = np.array(img.convert('RGBA')).astype(np.int16)
    r, g, bl = px[:, :, 0], px[:, :, 1], px[:, :, 2]
    mag = (r > 150) & (bl > 150) & (g < 110) & (np.abs(r - bl) < 90)
    px[mag, 3] = 0
    fringe = (px[:, :, 3] > 0) & (r > g * 1.35 + 8) & (bl > g * 1.35 + 8) & (np.abs(r - bl) < 70)
    px[fringe, 3] = 0
    px[:, :, 3] = np.where(px[:, :, 3] >= 128, 255, 0)
    return px.astype(np.uint8)
p = keyed(Image.open(ROOT / 'props/props-raw.png'))
NAMES = [('backstage_vanity', 96), ('backstage_rack', 96), ('backstage_couch', 96), ('backstage_guitar_case', 44), ('backstage_drum_cases', 72), ('backstage_curtain_door', 112)]
for i, (name, width) in enumerate(NAMES):
    r, c = divmod(i, 2)
    cell = p[r * 512:(r + 1) * 512, c * 512:(c + 1) * 512]
    ys, xs = np.where(cell[:, :, 3] > 0)
    im = Image.fromarray(cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')
    s = width / im.width
    im = im.resize((width, max(1, round(im.height * s))), Image.NEAREST)
    im.save(OUT / f'{name}.png'); print(name, im.size)

# ③ 바닥
f = Image.open(ROOT / 'floor/floor-raw.png').convert('RGB')
wood = f.crop((0, 0, 512, 512)).resize((128, 128), Image.LANCZOS)
carpet = f.crop((512, 0, 1024, 512)).resize((128, 128), Image.LANCZOS)
def tile(tex, w, h, path):
    out = Image.new('RGB', (w, h))
    for y in range(0, h, tex.height):
        for x in range(0, w, tex.width): out.paste(tex, (x, y))
    out.save(OUT / path); print(path, out.size)
tile(wood, 640, 192, 'stage_floor.png'); tile(carpet, 768, 480, 'hall_carpet.png'); tile(carpet, 448, 160, 'backstage_carpet.png')
