#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# uv run tools/art/youngcle7_set.py
# ──────────────────
"""편집노조 무대 추가 소품: 위쪽 통로를 막는 철창(youngcle_grate.png, 128×96). 창살 사이는 투명해 뒤 통로 바닥이 비친다."""
from pathlib import Path
from typing import Final

from painter import Canvas

OUT: Final = (10, 19, 35)
NAVY: Final = (21, 43, 72)
EDGE: Final = (63, 108, 150)
STEEL: Final = (111, 146, 174)
LIGHT: Final = (160, 190, 212)

W: Final = 128
H: Final = 96
grate: Final = Canvas(W, H)
# 위·아래 가로 레일 (두꺼운 강철 띠)
for y in (0, H - 12):
    grate.rect(0, y, W, 12, OUT)
    grate.rect(1, y + 1, W - 2, 10, NAVY)
    grate.rect(1, y + 2, W - 2, 2, LIGHT)
    grate.rect(1, y + 4, W - 2, 5, STEEL)
    for bx in range(6, W - 4, 16):
        grate.rect(bx, y + 4, 3, 3, OUT)
        grate.px(bx + 1, y + 4, LIGHT)
# 가운데 가로 보강 띠
grate.rect(0, 44, W, 8, OUT)
grate.rect(1, 45, W - 2, 6, NAVY)
grate.rect(1, 46, W - 2, 2, EDGE)
# 세로 창살 9개 (사이 간격은 투명)
for i in range(9):
    x = 4 + i * 15
    grate.rect(x, 0, 7, H, OUT)
    grate.rect(x + 1, 1, 5, H - 2, STEEL)
    grate.rect(x + 1, 1, 2, H - 2, LIGHT)
    grate.rect(x + 5, 1, 1, H - 2, EDGE)
# 레일 위에 창살이 겹치는 부분은 레일이 앞에 보이게 다시 그린다
for y in (0, H - 12):
    grate.rect(1, y + 2, W - 2, 2, LIGHT)
    grate.rect(1, y + 4, W - 2, 5, STEEL)
    for bx in range(6, W - 4, 16):
        grate.rect(bx, y + 4, 3, 3, OUT)
        grate.px(bx + 1, y + 4, LIGHT)
grate.save(Path('assets/props/youngcle_grate.png'))
print('wrote assets/props/youngcle_grate.png', W, 'x', H)

# ── 비데 방 소품: 마리오풍 초록 토관 (64×64, 위가 넓은 테두리 + 몸통) ──
PIPE_DARK: Final = (18, 70, 28)
PIPE: Final = (52, 150, 62)
PIPE_LIGHT: Final = (118, 214, 108)
pipe: Final = Canvas(64, 64)
pipe.rrect_outlined(2, 0, 60, 22, PIPE, PIPE_DARK, r=3)
pipe.rect(6, 3, 12, 15, PIPE_LIGHT)
pipe.rect(18, 3, 30, 15, PIPE)
pipe.rect(48, 3, 10, 15, PIPE_DARK)
pipe.rect(8, 22, 48, 42, PIPE_DARK)
pipe.rect(10, 22, 44, 42, PIPE)
pipe.rect(12, 22, 10, 42, PIPE_LIGHT)
pipe.rect(44, 22, 8, 42, PIPE_DARK)
pipe.rect(4, 4, 56, 4, (12, 40, 18))
pipe.rect(10, 6, 44, 2, (8, 24, 12))
pipe.save(Path('assets/props/mario_pipe.png'))
print('wrote assets/props/mario_pipe.png 64 x 64')
