#!/usr/bin/env /usr/bin/python3
"""청소부 검은 실루엣 시트(assets/sprites/janitor_shadow.png): 걷기 시트(janitor.png)의 down/up 행 + 지팡이 걷기(shadow-cane-128.png, 2×2 → 4프레임) 를 right 행에, 좌우 반전을 left 행에 놓고 전부 검게(8,8,12).
   사용: /usr/bin/python3 assets/source/janitor-v1/build_shadow.py"""
from pathlib import Path
from PIL import Image, ImageOps
ROOT = Path(__file__).resolve().parent
walk = Image.open(ROOT.parent.parent / 'sprites' / 'janitor.png').convert('RGBA'); cw, ch = walk.width // 4, walk.height // 4
cane = Image.open(ROOT / 'shadow-cane-128.png').convert('RGBA')
frames = [cane.crop(((i % 2) * 128, (i // 2) * 128, (i % 2 + 1) * 128, (i // 2 + 1) * 128)) for i in range(4)]
out = Image.new('RGBA', walk.size)
out.paste(walk.crop((0, 0, walk.width, 2 * ch)), (0, 0))                       # down, up
for i, f in enumerate(frames):
    out.paste(ImageOps.mirror(f), (i * cw, 2 * ch)); out.paste(f, (i * cw, 3 * ch))   # left = 반전, right = 지팡이
px = out.load()
for y in range(out.height):
    for x in range(out.width):
        if px[x, y][3]: px[x, y] = (8, 8, 12, 255)
out.save(ROOT.parent.parent / 'sprites' / 'janitor_shadow.png'); print('janitor_shadow.png', out.size)
