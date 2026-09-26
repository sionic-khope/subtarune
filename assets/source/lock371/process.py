#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD371 세로 칼 경합 자세(lock-raw.png, gpt-image-2.5-sunburst) → 4칸 띠(lock-strip.png, rise359 처리 재사용)
→ assets/sprites/hyungsub-clash.png 의 0·1칸(경합)을 위 두 칸으로 바꾸고 2·3칸(벤 뒤)은 기존 그대로. 칸 높이는 칼끝까지 들어가게 키우고 발은 칸 아래."""
import importlib.util
from pathlib import Path
from PIL import Image

spec = importlib.util.spec_from_file_location('rise', Path('assets/source/rise359/process.py'))
rise = importlib.util.module_from_spec(spec); spec.loader.exec_module(rise)
rise.SRC = Path('assets/source/lock371')
rise.strip('lock', 'assets/source/lock371/lock-strip.png')

old = Image.open('assets/source/clash363/sheet-363.png').convert('RGBA')
new = Image.open('assets/source/lock371/lock-strip.png').convert('RGBA')
ow, nw = old.width // 4, new.width // 4
cw, ch = max(ow, nw), max(old.height, new.height)
out = Image.new('RGBA', (cw * 4, ch))
cells = [new.crop((0, 0, nw, new.height)), new.crop((nw, 0, 2 * nw, new.height)),
         old.crop((2 * ow, 0, 3 * ow, old.height)), old.crop((3 * ow, 0, 4 * ow, old.height))]
for i, c in enumerate(cells):
    out.alpha_composite(c, (i * cw + (cw - c.width) // 2, ch - c.height))
out.save('assets/sprites/hyungsub-clash.png')
print(old.size, new.size, out.size)
