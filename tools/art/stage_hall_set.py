#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# PYTHONPATH=tools/art /usr/bin/python3 tools/art/stage_hall_set.py   (루트에서)
# ──────────────────
"""무대 홀(youngcle11) 소품: 어두운 무대 앞면, 양옆 계단, 살짝 올라간 빨간 커튼 밸런스, 꺼진 조명 트러스, 무대를 검게 가리는 어둠 막.
2026-09-15 사용자: “맵 상단에 무대가 크게, 올라가는 계단이 사이드에, 조명 다 꺼져 있고 위에 빨간 커튼들이 살짝 올라가 있어 어두워서 검게 가려진 느낌”."""
from pathlib import Path
from typing import Final

import numpy as np
from painter import Canvas

OUT: Final = Path('assets/props')

# 무대 앞면 512×32: 어두운 판자 + 위 밝은 턱 + 세로 이음매
front = Canvas(512, 32)
front.rect(0, 0, 512, 32, (34, 30, 38)); front.rect(0, 0, 512, 4, (92, 84, 96)); front.rect(0, 4, 512, 1, (16, 14, 18))
for x in range(0, 512, 32):
    front.vline(x, 5, 27, (22, 19, 25)); front.vline(x + 1, 5, 27, (48, 43, 52))
for x in range(6, 512, 32):
    front.rect(x, 20, 20, 1, (46, 41, 50))
front.rect(0, 28, 512, 4, (14, 12, 16))
front.save(OUT / 'stage_front.png')

# 계단 64×40: 세 단(위 단이 무대 높이), 앞에서 본 모습이라 좌우 대칭 — 양쪽에 같은 그림
stairs = Canvas(64, 40)
for i, (y, h) in enumerate(((0, 14), (14, 13), (27, 13))):
    top, face, edge = (118, 112, 124), (58, 54, 64), (150, 146, 158)
    stairs.rect(0, y, 64, h, face); stairs.rect(0, y, 64, 3, top); stairs.rect(0, y, 64, 1, edge); stairs.rect(0, y + h - 1, 64, 1, (22, 20, 26))
    stairs.vline(0, y, h, (30, 28, 34)); stairs.vline(63, y, h, (30, 28, 34))
stairs.save(OUT / 'stage_stairs.png')

# 빨간 커튼 밸런스 640×48: 살짝 올라간 커튼 — 주름(세로 명암), 아래 물결 가장자리 + 금술
val = Canvas(640, 48)
DARK, MID, LIGHT, GOLD, GOLD_D = (88, 12, 20), (140, 22, 32), (188, 48, 58), (222, 178, 70), (150, 112, 36)
val.rect(0, 0, 640, 40, MID)
for x in range(0, 640, 20):
    val.rect(x, 0, 6, 40, DARK); val.rect(x + 11, 0, 4, 40, LIGHT)
# 아래 물결: 12px 주기로 3px 씩 파임
for x in range(0, 640):
    dip = (3, 2, 1, 0, 0, 1, 2, 3, 3, 3, 3, 3)[x % 12]
    for y in range(40 - dip, 40):
        val.px(x, y, None)
    val.a[40 - dip - 1, x] = (*GOLD, 255)
    for y in range(40 - dip, 44 - dip):
        val.px(x, y, GOLD_D if x % 3 else GOLD)
val.rect(0, 0, 640, 3, (60, 8, 14))
val.save(OUT / 'stage_valance.png')

# 꺼진 조명 트러스 218×40: 쇠 격자 + 꺼진 램프 머리(검은 렌즈)
truss = Canvas(218, 40)
truss.rect(0, 0, 218, 4, (70, 68, 78)); truss.rect(0, 20, 218, 4, (70, 68, 78))
for x in range(0, 218, 22):
    truss.vline(x, 4, 16, (58, 56, 66)); truss.vline(x + 1, 4, 16, (92, 90, 100))
    for k in range(0, 16, 4):
        truss.px(x + 8 + k // 4 * 3, 4 + k, (92, 90, 100))
for x in range(14, 218, 44):
    truss.rect(x, 24, 14, 12, (44, 42, 50)); truss.rect(x + 2, 26, 10, 8, (18, 18, 22)); truss.rect(x + 4, 28, 3, 2, (36, 36, 44))
    truss.rect(x + 5, 20, 4, 4, (58, 56, 66))
truss.save(OUT / 'stage_truss_off.png')

# 어둠 막 640×232: 무대 전체를 검게(위쪽이 더 어둡고 앞 가장자리는 조금 옅게)
dark = Canvas(640, 232)
for y in range(232):
    alpha = int(205 - 60 * (y / 231))
    dark.a[y, :, :] = (0, 0, 0, alpha)
Path(OUT / 'stage_dark.png').parent.mkdir(exist_ok=True)
dark.save(OUT / 'stage_dark.png')
print('wrote stage_front(512x32) stage_stairs(64x40) stage_valance(640x48) stage_truss_off(218x40) stage_dark(640x232)')

# 관객석 줄(BUILD179): 홀을 가로지르는 붉은 줄 + 검은 기둥 두 조각(왼쪽 352, 오른쪽 384) — 가운데 32px 틈은 관객 하나가 막고 선다(맵 연결 검사는 소품만 본다)
def rope(width: int, path: str) -> None:
    c = Canvas(width, 16)
    for x in range(0, width, 96):
        c.rect(x, 0, 6, 16, (30, 30, 38)); c.rect(x + 1, 0, 2, 16, (70, 70, 84)); c.rect(x, 0, 6, 2, (110, 110, 126))
        span = min(90, width - x - 6)
        for i in range(1, span):
            sag = int(3 * (1 - abs(i - 45) / 45) ** 2 * 2)
            c.rect(x + 6 + i, 4 + sag, 1, 3, (190, 40, 50)); c.px(x + 6 + i, 4 + sag, (230, 90, 100))
    c.rect(width - 6, 0, 6, 16, (30, 30, 38)); c.rect(width - 5, 0, 2, 16, (70, 70, 84))
    c.save(OUT / path)
rope(352, 'stage_rope_l.png'); rope(384, 'stage_rope_r.png')
print('wrote stage_rope_l(352x16) stage_rope_r(384x16)')
