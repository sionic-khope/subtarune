#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD370 경섭 문가에서 뒤돌아보기(lookback3-raw, 채택) → assets/sprites/gyeongsub-lookback.png (4칸: 돌아봄 2 · 다시 앞 · 한 발)."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('rise', Path('assets/source/rise359/process.py'))
rise = importlib.util.module_from_spec(spec); spec.loader.exec_module(rise)
rise.SRC = Path('assets/source/farewell370')
rise.strip('lookback3', 'assets/sprites/gyeongsub-lookback.png')
