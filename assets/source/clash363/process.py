#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD363 blade-lock / after-slash poses (poses2-raw.png, gpt-image-2.5-sunburst) → assets/sprites/hyungsub-clash.png
(4-cell strip, feet on the cell bottom). Same keying/grid collapse as assets/source/rise359/process.py."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('rise', Path('assets/source/rise359/process.py'))
rise = importlib.util.module_from_spec(spec); spec.loader.exec_module(rise)
rise.SRC = Path('assets/source/clash363')
rise.strip('poses2', 'assets/sprites/hyungsub-clash.png')
