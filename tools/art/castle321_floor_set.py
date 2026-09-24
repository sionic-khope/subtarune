#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run tools/art/castle321_floor_set.py
# ──────────────────
"""Simple native-scale cathedral floor, stair and edging tiles."""
from __future__ import annotations

from pathlib import Path

from painter import Canvas, hexc


def main() -> None:
    """Emit native floor surfaces; architectural props use generated artwork."""
    output = Path('assets/tiles')
    floor = Canvas(32, 32)
    floor.rect(0, 0, 32, 32, hexc('#442052'))
    floor.hline(0, 31, 32, hexc('#3d1c4b'))
    floor.save(output / 'castle321_floor.png')
    steps = Canvas(32, 32)
    steps.rect(0, 0, 32, 32, hexc('#6b2d85'))
    for y in range(0, 32, 8):
        steps.rect(0, y, 32, 2, hexc('#ad69c7'))
        steps.rect(0, y + 5, 32, 3, hexc('#442052'))
    steps.save(output / 'castle321_steps.png')
    edge = Canvas(32, 32)
    edge.rect(8, 0, 24, 32, hexc('#442052'))
    edge.rect(12, 1, 17, 14, hexc('#6b2d85'))
    edge.rect(9, 17, 19, 14, hexc('#6b2d85'))
    edge.rect(28, 0, 4, 32, hexc('#893794'))
    edge.vline(31, 0, 32, hexc('#ad69c7'))
    edge.save(output / 'castle321_edge_left.png')
    edge.flip().save(output / 'castle321_edge_right.png')
    aisle = Canvas(192, 192)
    aisle.rect(0, 0, 192, 192, hexc('#6b2d85'))
    for y in range(48, 144):
        width = int((48 ** 2 - (y - 96) ** 2) ** 0.5)
        aisle.hline(0, y, width, hexc('#893794'))
        aisle.hline(192 - width, y, width, hexc('#893794'))
    for x in (64, 128):
        aisle.vline(x, 0, 192, hexc('#602878'))
        aisle.vline(x + 1, 0, 192, hexc('#74328c'))
    aisle.save(output / 'castle321_aisle.png')


if __name__ == '__main__':
    main()
