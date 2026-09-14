#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# /usr/bin/python3 tools/art/subrio_set.py   (루트에서)
# ──────────────────
"""섭리오(스크린 속 2D 플랫포머) 타일·투사체: 첫 방송 플랫폼 섬(보라 허공)을 단순화한 16px 타일 아틀라스와 창."""
from pathlib import Path
from typing import Final

from painter import Canvas

OUT: Final = (14, 5, 26)
GROUND: Final = (96, 48, 160)
GROUND_DARK: Final = (62, 28, 110)
GROUND_TOP: Final = (170, 110, 235)
BLOCK: Final = (128, 76, 196)
BLOCK_LIGHT: Final = (205, 160, 255)
T: Final = 16
# 아틀라스 열: 0 바닥 윗면, 1 바닥 속, 2 떠 있는 블록, 3 블록 왼쪽 끝, 4 블록 오른쪽 끝, 5 깃발 기둥
atlas: Final = Canvas(T * 6, T)
# 0 바닥 윗면: 위 2px 밝은 풀 띠 + 어두운 외곽
atlas.rect(0, 0, T, T, GROUND); atlas.rect(0, 0, T, 3, GROUND_TOP); atlas.rect(0, 3, T, 1, OUT)
for x in (2, 7, 12): atlas.rect(x, 1, 2, 1, (230, 200, 255))
atlas.rect(4, 9, 3, 2, GROUND_DARK); atlas.rect(11, 12, 3, 2, GROUND_DARK)
# 1 바닥 속: 어두운 보라에 점 무늬
atlas.rect(T, 0, T, T, GROUND_DARK)
for (x, y) in ((3, 4), (9, 2), (13, 9), (6, 12), (1, 10)): atlas.rect(T + x, y, 2, 2, (44, 18, 80))
# 2 떠 있는 블록: 밝은 윗면·어두운 아랫면·외곽
atlas.rrect_outlined(T * 2, 0, T, T, BLOCK, OUT, r=2); atlas.rect(T * 2 + 2, 2, T - 4, 3, BLOCK_LIGHT); atlas.rect(T * 2 + 2, T - 4, T - 4, 2, GROUND_DARK)
# 3·4 블록 끝(같은 모양, 한쪽 외곽만 두껍게)
atlas.rrect_outlined(T * 3, 0, T, T, BLOCK, OUT, r=2); atlas.rect(T * 3 + 2, 2, T - 4, 3, BLOCK_LIGHT); atlas.rect(T * 3, 0, 2, T, OUT)
atlas.rrect_outlined(T * 4, 0, T, T, BLOCK, OUT, r=2); atlas.rect(T * 4 + 2, 2, T - 4, 3, BLOCK_LIGHT); atlas.rect(T * 4 + T - 2, 0, 2, T, OUT)
# 5 기둥
atlas.rect(T * 5 + 6, 0, 4, T, OUT); atlas.rect(T * 5 + 7, 0, 2, T, (200, 200, 220))
atlas.save(Path('assets/props/subrio_tiles.png'))
# 창 투사체 24×6 (오른쪽 향함)
spear: Final = Canvas(24, 6)
spear.rect(0, 2, 18, 2, (120, 80, 40)); spear.rect(0, 2, 18, 1, (170, 120, 70))
spear.rect(16, 1, 6, 4, (210, 170, 90)); spear.rect(20, 2, 4, 2, (240, 220, 150)); spear.rect(0, 1, 3, 4, (190, 40, 40))
spear.save(Path('assets/props/subrio_spear.png'))
print('wrote assets/props/subrio_tiles.png (96x16) and assets/props/subrio_spear.png (24x6)')
