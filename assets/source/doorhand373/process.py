#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD373 경섭 문 짚기(뒷모습, 왼손을 왼쪽 문에) doorhand-raw.png(gpt-image-2.5-sunburst) → 4칸 띠 → 첫 칸만 assets/sprites/gyeongsub-doorhand.png
(rise359 처리 재사용, 발 = 칸 아래). 키는 gyeongsub-lookback.png 과 같은 픽셀 밀도."""
import importlib.util
from pathlib import Path
from PIL import Image

spec = importlib.util.spec_from_file_location('rise', Path('assets/source/rise359/process.py'))
rise = importlib.util.module_from_spec(spec); spec.loader.exec_module(rise)
rise.SRC = Path('assets/source/doorhand373')
rise.strip('doorhand', 'assets/source/doorhand373/doorhand-strip.png')
s = Image.open('assets/source/doorhand373/doorhand-strip.png'); cw = s.width // 4
s.crop((0, 0, cw, s.height)).save('assets/sprites/gyeongsub-doorhand.png')
print(s.size, Image.open('assets/sprites/gyeongsub-lookback.png').size)
