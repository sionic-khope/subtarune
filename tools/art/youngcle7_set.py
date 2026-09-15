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

# ── 비데 방 재배치(BUILD167, 사용자 지시): 컨트롤러 아래 눕혀진 토관(왼쪽 입구, 오른쪽으로 거대 스크린에 연결) + 흰 테두리·검은 화면의 거대 스크린 ──
PIPE_H_W: Final = 192
PIPE_H_H: Final = 64
pipe_h: Final = Canvas(PIPE_H_W, PIPE_H_H)
# 몸통(오른쪽으로 길게): 위 밝은 띠·아래 어두운 띠
pipe_h.rect(22, 8, PIPE_H_W - 22, 48, PIPE_DARK)
pipe_h.rect(22, 10, PIPE_H_W - 22, 44, PIPE)
pipe_h.rect(22, 12, PIPE_H_W - 22, 10, PIPE_LIGHT)
pipe_h.rect(22, 44, PIPE_H_W - 22, 8, PIPE_DARK)
# 왼쪽 입구 테두리(위아래로 더 넓음) + 안쪽 어두운 구멍
pipe_h.rrect_outlined(0, 0, 24, PIPE_H_H, PIPE, PIPE_DARK, r=3)
pipe_h.rect(3, 4, 6, PIPE_H_H - 8, PIPE_LIGHT)
pipe_h.rect(9, 4, 9, PIPE_H_H - 8, PIPE)
pipe_h.rect(4, 8, 8, PIPE_H_H - 16, (12, 40, 18))
pipe_h.rect(5, 12, 5, PIPE_H_H - 24, (8, 24, 12))
pipe_h.save(Path('assets/props/mario_pipe_h.png'))
print('wrote assets/props/mario_pipe_h.png', PIPE_H_W, 'x', PIPE_H_H)

SCREEN_W: Final = 576
SCREEN_H: Final = 480
screen: Final = Canvas(SCREEN_W, SCREEN_H)
FRAME_W: Final = 14
screen.rect(0, 0, SCREEN_W, SCREEN_H, (236, 236, 244))
screen.rect(0, 0, SCREEN_W, 3, (255, 255, 255)); screen.rect(0, 0, 3, SCREEN_H, (255, 255, 255))
screen.rect(0, SCREEN_H - 4, SCREEN_W, 4, (176, 176, 198)); screen.rect(SCREEN_W - 4, 0, 4, SCREEN_H, (176, 176, 198))
screen.rect(FRAME_W - 2, FRAME_W - 2, SCREEN_W - FRAME_W * 2 + 4, 2, (140, 140, 166)); screen.rect(FRAME_W - 2, FRAME_W - 2, 2, SCREEN_H - FRAME_W * 2 + 4, (140, 140, 166))
screen.rect(FRAME_W, SCREEN_H - FRAME_W, SCREEN_W - FRAME_W * 2 + 2, 2, (255, 255, 255)); screen.rect(SCREEN_W - FRAME_W, FRAME_W, 2, SCREEN_H - FRAME_W * 2 + 2, (255, 255, 255))
screen.rect(FRAME_W, FRAME_W, SCREEN_W - FRAME_W * 2, SCREEN_H - FRAME_W * 2, (0, 0, 0))
screen.rect(FRAME_W - 1, FRAME_W - 1, SCREEN_W - FRAME_W * 2 + 2, 1, (26, 26, 38)); screen.rect(FRAME_W - 1, FRAME_W - 1, 1, SCREEN_H - FRAME_W * 2 + 2, (26, 26, 38))
screen.save(Path('assets/props/bidet_screen_big.png'))
print('wrote assets/props/bidet_screen_big.png', SCREEN_W, 'x', SCREEN_H)
