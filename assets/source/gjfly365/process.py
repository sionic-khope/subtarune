#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD365 gajaeman flying horizontally (head left, face to the viewer; bottom row with purple aura) → assets/sprites/gajaeman-fly.png."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('rise', Path('assets/source/rise359/process.py'))
rise = importlib.util.module_from_spec(spec); spec.loader.exec_module(rise)
rise.SRC = Path('assets/source/gjfly365')
rise.strip('fly', 'assets/sprites/gajaeman-fly.png', centre=(0, 1, 2, 3))
