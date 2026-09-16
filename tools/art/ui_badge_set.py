#!/usr/bin/env python3
"""UI 배지(BUILD185, 사용자 참고 이미지: 연한 분홍 알약 모양 + 회색 소용돌이 아이콘 + 빨간 점 + ‘연결 안 됨’): 글자는 씬이 게임 폰트로 얹는다(한글은 painter 로 못 그림).
결과: assets/props/ui_badge_disconnected.png 108×24 — 알약 배경, 왼쪽 아이콘, 빨간 점. 글자 자리는 x30~104(게임 폰트 16px — 작게 쓰면 뭉개져서 BUILD192 에 88×20·11px 에서 키움).
실행: /usr/bin/python3 tools/art/ui_badge_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from painter import Canvas, hexc

W, H = 108, 24
c = Canvas(W, H)
# 알약: 연분홍 바탕 + 살짝 진한 테두리
c.rrect_outlined(0, 0, W, H, hexc('#fbe4e2'), hexc('#f3cdc9'), r=6)
c.px(1, 1, None); c.px(W - 2, 1, None); c.px(1, H - 2, None); c.px(W - 2, H - 2, None)
# 아이콘: 흐린 분홍 링 + 안쪽 소용돌이 조각
cx, cy = 12, 12
ring = hexc('#e8aaa5'); inner = hexc('#f6d6d3')
for x in range(cx - 5, cx + 6):
    for y in range(cy - 5, cy + 6):
        d2 = (x - cx) ** 2 + (y - cy) ** 2
        if 16 <= d2 <= 26: c.px(x, y, ring)
        elif d2 < 16: c.px(x, y, inner)
for x, y in ((cx - 1, cy - 2), (cx, cy - 2), (cx + 1, cy - 1), (cx + 1, cy), (cx, cy + 1), (cx - 1, cy + 1), (cx - 2, cy)):
    c.px(x, y, ring)
# 빨간 점
red = hexc('#d93025')
for x in range(23, 28):
    for y in range(10, 15):
        if (x - 25) ** 2 + (y - 12) ** 2 <= 4.5: c.px(x, y, red)
out = Path('assets/props/ui_badge_disconnected.png'); c.save(out); print('wrote', out, c.w, c.h)
