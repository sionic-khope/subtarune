#!/usr/bin/env python3
"""엄청대박인배 라운지 분수 버튼 함정(BUILD468 청소부 히든 보스): 경섭·요플래 발밑 바닥이 검게 꺼지는 구멍.
- props/floor_pit.png : 48×20 검은 타원 구멍(가장자리 한 줄은 바닥보다 어두운 남색 테두리, 안쪽은 완전 검정 — 아래로 떨어질 깊이)
실행: /usr/bin/python3 tools/art/floor_pit_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from painter import Canvas, hexc

PROPS = Path('assets/props')
RIM, EDGE, HOLE = hexc('#1c1f2a'), hexc('#0b0c12'), (0, 0, 0)


def pit() -> None:
    W, H = 48, 20
    c = Canvas(W, H)
    cx, cy, rx, ry = (W - 1) / 2, (H - 1) / 2, W / 2 - 0.5, H / 2 - 0.5
    for x in range(W):
        for y in range(H):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1: c.px(x, y, RIM if d > 0.72 else EDGE if d > 0.5 else HOLE)
    c.save(PROPS / 'floor_pit.png')


if __name__ == '__main__':
    pit()
    print('wrote', PROPS / 'floor_pit.png')
