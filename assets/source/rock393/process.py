#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD394 보라 숲 낙석 바위(rocks-raw.png, gpt-image-2.5-sunburst) → 4칸 띠 assets/props/rock_set.png
(칸 0~2 떨어지는 바위 세 종류, 칸 3 착지해 갈라진 바위). rise359 처리(마젠타 키·격자 접기) 재사용, 발 = 칸 아래."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('rise', Path('assets/source/rise359/process.py'))
rise = importlib.util.module_from_spec(spec); spec.loader.exec_module(rise)
rise.SRC = Path('assets/source/rock393')
rise.strip('rocks', 'assets/props/rock_set.png')
