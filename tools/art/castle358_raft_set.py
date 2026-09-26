#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# Run: uv run tools/art/castle358_raft_set.py
# ──────────────────
"""BUILD358 raft room: the colossal wall beside the raft pool (assets/source/raft358/wall-raw.png, gpt-image-2.5-sunburst).

The generated slab (x 196..828 of 1024) is scaled by half; above it the stone course between the two iron bands
(raw y 380..850) repeats upward so the wall climbs HEIGHT px from the pool to the ledge on top.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path('assets/source/raft358/wall-raw.png')
OUT = Path('assets/props/raft358_wall.png')
X0, X1 = 196, 828
PERIOD = (380, 850)
SCALE = 0.5
HEIGHT = 1068


def main() -> None:
    raw = Image.open(SRC).convert('RGB').crop((X0, 0, X1, 1536))
    w = round(raw.width * SCALE)
    base = raw.resize((w, round(1536 * SCALE)), Image.NEAREST)
    seg = raw.crop((0, PERIOD[0], raw.width, PERIOD[1])).resize((w, round((PERIOD[1] - PERIOD[0]) * SCALE)), Image.NEAREST)
    out = Image.new('RGB', (w, HEIGHT))
    out.paste(base, (0, HEIGHT - base.height))
    # 위로 같은 돌 층을 이어 붙인다(철띠가 맞물리게 base 의 첫 철띠 위치에서 시작)
    y = HEIGHT - base.height + round(PERIOD[0] * SCALE)
    while y > 0:
        y -= seg.height
        out.paste(seg, (0, y))
    out.paste(base.crop((0, round(PERIOD[0] * SCALE), w, base.height)), (0, HEIGHT - base.height + round(PERIOD[0] * SCALE)))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)
    print(OUT, out.size)


if __name__ == '__main__':
    main()
