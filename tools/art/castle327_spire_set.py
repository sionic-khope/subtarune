#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run tools/art/castle327_spire_set.py
# ──────────────────
"""BUILD327 navy spire hall: the cathedral floor set (castle321) repainted navy, same shapes and scale."""
from __future__ import annotations

from pathlib import Path

from painter import Canvas, hexc

BASE, SEAM, PANEL, RIM, LIGHT, ARC, LINE, LINE_HI = (
    '#1b2350', '#161d44', '#27336e', '#34489a', '#5a74c8', '#34449a', '#202a5e', '#2c3a7c')


def main() -> None:
    """Emit the navy floor, edging and 192px aisle carpet."""
    output = Path('assets/tiles')
    floor = Canvas(32, 32)
    floor.rect(0, 0, 32, 32, hexc(BASE))
    floor.hline(0, 31, 32, hexc(SEAM))
    floor.save(output / 'castle327_floor.png')
    edge = Canvas(32, 32)
    edge.rect(8, 0, 24, 32, hexc(BASE))
    edge.rect(12, 1, 17, 14, hexc(PANEL))
    edge.rect(9, 17, 19, 14, hexc(PANEL))
    edge.rect(28, 0, 4, 32, hexc(RIM))
    edge.vline(31, 0, 32, hexc(LIGHT))
    edge.save(output / 'castle327_edge_left.png')
    edge.flip().save(output / 'castle327_edge_right.png')
    aisle = Canvas(192, 192)
    aisle.rect(0, 0, 192, 192, hexc(PANEL))
    for y in range(48, 144):
        width = int((48 ** 2 - (y - 96) ** 2) ** 0.5)
        aisle.hline(0, y, width, hexc(ARC))
        aisle.hline(192 - width, y, width, hexc(ARC))
    for x in (64, 128):
        aisle.vline(x, 0, 192, hexc(LINE))
        aisle.vline(x + 1, 0, 192, hexc(LINE_HI))
    aisle.save(output / 'castle327_aisle.png')
    # BUILD328 prophecy hall: barely-visible dark navy floor on black (colour only, faint seams)
    void_floor = Canvas(32, 32)
    void_floor.rect(0, 0, 32, 32, hexc('#0b0f2a'))
    void_floor.hline(0, 31, 32, hexc('#080b20'))
    void_floor.vline(31, 0, 32, hexc('#080b20'))
    void_floor.rect(2, 2, 2, 2, hexc('#10163a'))
    void_floor.save(output / 'castle328_void_floor.png')


if __name__ == '__main__':
    main()
