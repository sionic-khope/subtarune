#!/usr/bin/env /usr/bin/python3
"""청소부 검은 실루엣 시트(assets/sprites/janitor_shadow.png) = 지팡이 걷기 시트(assets/sprites/janitor.png, 4방향 모두 지팡이)를 전부 검게(8,8,12).
   사용: /usr/bin/python3 assets/source/janitor-v1/build_shadow.py"""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent
out = Image.open(ROOT.parent.parent / 'sprites' / 'janitor.png').convert('RGBA'); px = out.load()
for y in range(out.height):
    for x in range(out.width):
        if px[x, y][3]: px[x, y] = (8, 8, 12, 255)
out.save(ROOT.parent.parent / 'sprites' / 'janitor_shadow.png'); print('janitor_shadow.png', out.size)
