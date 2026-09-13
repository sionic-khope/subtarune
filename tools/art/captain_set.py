#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# uv run tools/art/captain_set.py
# ──────────────────
"""Native timber captain cabin furniture; ocean exists inside the window only."""
from pathlib import Path
from typing import Final

from painter import Canvas

OUT: Final = (24, 17, 19)
DARK: Final = (54, 33, 30)
WOOD: Final = (94, 55, 37)
LIGHT: Final = (134, 82, 46)
EDGE: Final = (173, 117, 65)
BRASS: Final = (208, 168, 83)
PAPER: Final = (205, 187, 140)


def walls() -> Canvas:
    """A 27 by 18 tile cabin with solid walls around a transparent floor."""
    art = Canvas(864, 576)
    art.rect(0, 0, 864, 192, OUT)
    art.rect(16, 36, 832, 156, DARK)
    for y in range(44, 182, 18):
        art.rect(24, y, 816, 15, WOOD)
        art.rect(24, y, 816, 2, LIGHT)
        for x in range(24 + (y // 18 % 2) * 68, 840, 136):
            art.rect(x, y, 2, 15, DARK)
    for x in range(24, 864, 136):
        art.rect(x, 30, 14, 162, OUT)
        art.rect(x + 2, 30, 10, 160, DARK)
        art.rect(x + 3, 32, 2, 154, LIGHT)
        for y in (50, 164):
            art.rect(x + 2, y, 10, 7, (60, 58, 58))
            art.rect(x + 5, y + 2, 2, 2, EDGE)
    art.rect(24, 184, 816, 8, OUT)
    art.rect(24, 184, 816, 3, EDGE)
    for x in (0, 832):
        art.rect(x, 192, 32, 320, OUT)
        art.rect(x + 8, 192, 16, 320, DARK)
        art.rect(x + 10, 192, 3, 320, LIGHT)
    art.rect(0, 512, 864, 64, OUT)
    art.rect(24, 512, 816, 3, EDGE)
    art.rect(24, 515, 816, 13, WOOD)
    art.rect(396, 504, 72, 26, OUT)
    art.rect(399, 507, 66, 18, LIGHT)
    art.rect(402, 509, 60, 3, BRASS)
    art.rect(457, 516, 5, 3, BRASS)
    return art


def sea_window() -> Canvas:
    """Wide brass mullions frame a blue horizon and pixel ocean bands."""
    art = Canvas(236, 156)
    art.rrect(0, 0, 236, 156, OUT, 8)
    art.rrect(3, 3, 230, 150, LIGHT, 6)
    art.rrect(7, 7, 222, 139, BRASS, 4)
    art.rect(12, 12, 212, 128, OUT)
    art.rect(15, 15, 206, 54, (107, 168, 187))
    art.rect(15, 59, 206, 10, (148, 191, 194))
    art.rect(15, 69, 206, 71, (37, 93, 115))
    art.rect(15, 69, 206, 3, (176, 201, 188))
    for x, y, width in ((25, 82, 28), (74, 96, 42), (164, 85, 37), (123, 112, 35), (31, 126, 51), (178, 132, 28)):
        art.rect(x, y, width, 2, (83, 142, 157))
        art.rect(x + 4, y + 3, width - 9, 2, (51, 115, 137))
    for x in (80, 151):
        art.rect(x, 10, 7, 134, OUT)
        art.rect(x + 2, 10, 3, 134, BRASS)
    art.rect(15, 103, 206, 5, OUT)
    art.rect(15, 104, 206, 2, LIGHT)
    art.rect(0, 147, 236, 9, OUT)
    art.rect(3, 148, 230, 4, EDGE)
    return art


def chart_desk() -> Canvas:
    """A chart table with substantial legs, rolled maps and a brass compass."""
    art = Canvas(152, 104)
    art.rect(13, 59, 13, 42, OUT)
    art.rect(16, 62, 7, 34, WOOD)
    art.rect(125, 59, 13, 42, OUT)
    art.rect(128, 62, 7, 34, WOOD)
    art.rrect(0, 20, 152, 58, OUT, 4)
    art.rrect(3, 23, 146, 48, WOOD, 3)
    art.rect(5, 24, 142, 3, EDGE)
    art.rect(5, 65, 142, 5, DARK)
    art.rect(18, 29, 88, 31, DARK)
    art.rect(20, 27, 84, 31, PAPER)
    for x, y, width in ((29, 37, 18), (44, 40, 10), (52, 46, 21), (75, 35, 14), (83, 40, 11)):
        art.rect(x, y, width, 3, (120, 139, 115))
    for x, y in ((35, 46), (50, 49), (66, 42), (81, 47)):
        art.rect(x, y, 3, 2, LIGHT)
    art.rect(17, 25, 5, 35, BRASS)
    art.rect(102, 25, 5, 35, BRASS)
    art.rrect(119, 33, 19, 19, OUT, 5)
    art.rrect(122, 36, 13, 13, BRASS, 4)
    art.rect(127, 36, 3, 13, DARK)
    art.rect(123, 41, 11, 3, DARK)
    return art


def helm_console() -> Canvas:
    """A wheel with eight handles rises above the navigation console."""
    art = Canvas(136, 112)
    art.rrect(0, 60, 136, 48, OUT, 4)
    art.rrect(3, 63, 130, 39, WOOD, 3)
    art.rect(5, 63, 126, 3, EDGE)
    art.rect(7, 94, 122, 6, DARK)
    art.rect(55, 46, 26, 40, OUT)
    art.rect(59, 48, 18, 35, LIGHT)
    for x, y, width, height in ((62, 0, 12, 64), (34, 26, 68, 12), (40, 8, 11, 12), (86, 8, 11, 12), (40, 47, 11, 12), (86, 47, 11, 12)):
        art.rrect(x, y, width, height, OUT, 2)
        art.rrect(x + 2, y + 2, width - 4, height - 4, LIGHT, 1)
    art.rrect(43, 7, 50, 50, OUT, 11)
    art.rrect(46, 10, 44, 44, EDGE, 10)
    art.rrect(52, 16, 32, 32, OUT, 7)
    art.rrect(55, 19, 26, 26, DARK, 6)
    art.rect(64, 14, 8, 36, LIGHT)
    art.rect(50, 28, 36, 8, LIGHT)
    art.rrect(60, 24, 16, 16, OUT, 4)
    art.rrect(63, 27, 10, 10, BRASS, 3)
    for x in (12, 103):
        art.rrect(x, 71, 20, 17, OUT, 3)
        art.rect(x + 3, 74, 14, 7, (113, 156, 142))
        art.rect(x + 8, 72, 2, 10, DARK)
        art.rect(x + 3, 91, 4, 3, BRASS)
    return art


def stowage() -> Canvas:
    """Closed timber cupboards with rolled navigation charts on top."""
    art = Canvas(112, 94)
    art.rect(3, 24, 106, 70, OUT)
    art.rect(6, 27, 100, 62, WOOD)
    art.rect(8, 28, 96, 3, EDGE)
    for x in (10, 58):
        art.rect(x, 35, 44, 48, OUT)
        art.rect(x + 2, 37, 40, 44, DARK)
        art.rect(x + 5, 40, 34, 36, WOOD)
        art.rect(x + 31, 56, 4, 5, BRASS)
    for x, height in ((16, 18), (36, 23), (55, 17)):
        art.rect(x, 24 - height, 12, height, OUT)
        art.rect(x + 2, 26 - height, 8, height - 3, PAPER)
        art.rect(x + 2, 18, 8, 3, LIGHT)
    return art


carpet: Final = Canvas(288, 176)
carpet.rrect(0, 0, 288, 176, OUT, 3)
carpet.rect(3, 3, 282, 170, (32, 66, 65))
carpet.outline(5, 5, 278, 166, EDGE, 2)
carpet.outline(12, 12, 264, 152, BRASS, 1)
carpet.rect(16, 16, 256, 144, (27, 57, 57))
for x in (8, 274):
    for y in (8, 162):
        carpet.rect(x, y, 6, 6, BRASS)
for y in range(25, 157, 16):
    for x in range(25, 269, 16):
        carpet.rect(x, y, 2, 1, (34, 65, 64))

for name, canvas in (('walls', walls()), ('window', sea_window()), ('chart', chart_desk()),
                     ('helm', helm_console()), ('stowage', stowage()), ('carpet', carpet)):
    canvas.save(Path(f'assets/props/captain_{name}.png'))
