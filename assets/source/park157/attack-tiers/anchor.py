#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# How to run: uv run assets/source/park157/attack-tiers/anchor.py
"""Pad accepted attack frames into six fixed generation anchor cells."""
from pathlib import Path
from typing import Final
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[3]
with Image.open(GAME / "assets/enemies/park-guardian-attack.png") as source:
    anchor = Image.new("RGBA", (256, 384), (255, 0, 255, 255))
    for index in range(6):
        col, row = index % 2, index // 2
        frame = source.crop((col * 96, row * 96, col * 96 + 96, row * 96 + 96))
        anchor.alpha_composite(frame, (col * 128 + 16, row * 128 + 16))
    anchor.resize((1024, 1536), Image.Resampling.NEAREST).convert("RGB").save(ROOT / "references/attack-anchor.png")
