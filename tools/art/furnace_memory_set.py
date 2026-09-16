#!/usr/bin/env python3
"""색깔 기억 게임(BUILD198) 1인칭 화면 소품: 형섭 손(사용자 “누를 때 형섭 손 같은 게 눌러지는 것”).
- props/hand_point.png : 44×56 검지로 가리키는 손(손등이 보이는 1인칭, 아래는 남색 소매) — 마우스를 따라다닌다
- props/hand_press.png : 같은 손, 검지가 굽혀 눌린 프레임(클릭 순간)
실행: /usr/bin/python3 tools/art/furnace_memory_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from painter import Canvas, hexc

OUT = Path('assets/props')
LINE, SKIN, SKIN_D, SKIN_L = hexc('#1e1a2a'), hexc('#f2cfa8'), hexc('#d3a67c'), hexc('#fbe6cc')
SLEEVE, SLEEVE_D, CUFF = hexc('#2c3d6e'), hexc('#1c2848'), hexc('#e9e9f2')


def hand(pressed: bool) -> Canvas:
    c = Canvas(44, 56)
    # 소매(남색) + 커프
    c.rrect_outlined(4, 44, 36, 12, SLEEVE, LINE, r=3); c.rect(6, 46, 32, 2, CUFF); c.rect(6, 52, 32, 2, SLEEVE_D)
    # 주먹(손등): 둥근 덩어리 + 오른쪽에 말린 손가락 마디 셋
    c.rrect_outlined(6, 22, 34, 26, SKIN, LINE, r=6)
    c.rect(8, 24, 20, 2, SKIN_L)
    for i, y in enumerate((26, 33, 40)):
        c.rrect_outlined(26, y, 13, 7, SKIN, LINE, r=3); c.rect(28, y + 1, 8, 1, SKIN_L); c.rect(28, y + 5, 9, 1, SKIN_D)
    # 엄지(왼쪽 옆)
    c.rrect_outlined(1, 27, 11, 14, SKIN, LINE, r=4); c.rect(3, 29, 6, 1, SKIN_L); c.rect(3, 38, 7, 1, SKIN_D)
    # 검지: 위로 곧게(point) / 굽혀서 짧게(press)
    if not pressed:
        c.rrect_outlined(13, 1, 11, 26, SKIN, LINE, r=4); c.rect(15, 3, 3, 20, SKIN_L); c.rect(21, 4, 1, 20, SKIN_D)
        c.rect(15, 12, 8, 1, SKIN_D)                                                     # 마디 주름
    else:
        c.rrect_outlined(13, 8, 12, 20, SKIN, LINE, r=4); c.rect(15, 10, 3, 14, SKIN_L); c.rect(22, 11, 1, 14, SKIN_D)
        c.rect(15, 16, 8, 1, SKIN_D); c.rrect_outlined(16, 5, 10, 8, SKIN, LINE, r=3); c.rect(18, 7, 5, 1, SKIN_L)   # 굽힌 끝마디
    # 주먹 위쪽 이음(검지 뿌리)
    c.rect(14, 22, 9, 3, SKIN)
    return c


hand(False).save(OUT / 'hand_point.png')
hand(True).save(OUT / 'hand_press.png')
print('wrote hand_point.png hand_press.png')
