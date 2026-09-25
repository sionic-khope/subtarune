"""teen348: 2페이즈 “엄.” 패턴의 엄준식 얼굴 탄(openai/gpt-image-2.5-sunburst, 참조 eom-ref.png).

Run: uv run --with pillow --with numpy python3 assets/source/teen348/process.py
"""
import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('ap', HERE.parent / 'arena332' / 'process.py')
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)
Image.fromarray(ap.shrink(ap.key_out(np.array(Image.open(HERE / 'eom-raw.png').convert('RGBA'))), 28)).save('assets/props/teen348_eom.png')
print('ok')
