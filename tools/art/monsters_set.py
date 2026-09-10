# -*- coding: utf-8 -*-
"""청록숲6(정글) 몬스터 3종 — 롤 정글 몹을 우리 도트로: 칼날부리(칼날 부리 새) / 늑대 / 두꺼비 (사용자 브리핑 2026-09-11).
전투용 64x64(왼쪽을 본다, 발 pivot 32,60) + 필드용 정면 48x48. 델타룬 밀도: 외곽선 1px + 2톤.
실행: /usr/bin/python3 tools/art/monsters_set.py → assets/enemies/{razorbeak,wolf,toad}-battle-left.png / -front.png
"""
import sys
sys.path.insert(0, 'tools/art')
from painter import Canvas, hexc, shade
from teal_set import outline_silhouette
OUT = hexc('#161a24')

def ellipse(c, cx, cy, rx, ry, col):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if rx > 0 and ry > 0 and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1: c.px(x, y, col)

def razorbeak_left():
    """칼날부리: 청남색 맹금, 은빛 칼날 부리가 왼쪽으로 길게, 주황 볏, 노란 눈, 가는 주황 다리"""
    c = Canvas(64, 64)
    BODY, BODY_D, BELLY = hexc('#2f4f7a'), hexc('#1f3556'), hexc('#6f92bd')
    CREST, BEAK, BEAK_D, LEG = hexc('#e2603a'), hexc('#d7dde6'), hexc('#8d97a6'), hexc('#e08a3a')
    ellipse(c, 36, 38, 15, 11, BODY)                       # 몸통
    ellipse(c, 40, 41, 10, 6, BELLY)                       # 배(밝음)
    ellipse(c, 30, 34, 10, 7, BODY_D)                      # 접힌 날개(어두움)
    for i in range(6): c.rect(48 + i * 2, 32 - i, 3, 3, BODY_D if i % 2 else BODY)   # 꼬리깃
    ellipse(c, 21, 24, 8, 8, BODY)                         # 머리
    c.rect(4, 22, 14, 5, BEAK); c.rect(2, 23, 4, 3, BEAK); c.hline(4, 26, 14, BEAK_D); c.hline(3, 24, 3, hexc('#ffffff'))   # 칼날 부리
    for i in range(4): c.rect(18 + i * 2, 14 - (i % 2) * 2, 2, 5, CREST)               # 볏
    c.rect(16, 21, 4, 3, hexc('#ffd23b')); c.px(17, 22, OUT)                            # 눈
    c.rect(32, 48, 2, 10, LEG); c.rect(41, 49, 2, 9, LEG)                               # 다리
    for x in (29, 32, 35): c.rect(x, 57, 3, 2, LEG)
    for x in (38, 41, 44): c.rect(x, 57, 3, 2, LEG)
    outline_silhouette(c, OUT)
    return c

def wolf_left():
    """늑대: 회색 몸, 등은 어둡고 배는 밝게, 주둥이 왼쪽, 귀 쫑긋, 노란 눈, 이빨, 위로 말린 꼬리"""
    c = Canvas(64, 64)
    FUR, FUR_D, BELLY, NOSE = hexc('#8a8f98'), hexc('#5e636b'), hexc('#c9ccd1'), hexc('#1c1f26')
    ellipse(c, 36, 40, 17, 9, FUR)                         # 몸통
    ellipse(c, 36, 34, 15, 5, FUR_D)                       # 등
    ellipse(c, 38, 45, 12, 4, BELLY)                       # 배
    ellipse(c, 19, 33, 9, 7, FUR); c.rect(8, 32, 9, 6, FUR); c.rect(7, 33, 4, 4, FUR_D)   # 머리 + 주둥이
    c.rect(6, 34, 2, 2, NOSE)                              # 코
    c.rect(9, 38, 8, 1, NOSE); c.px(10, 39, hexc('#ffffff')); c.px(13, 39, hexc('#ffffff'))   # 입·이빨
    c.rect(14, 30, 3, 2, hexc('#ffd23b')); c.px(14, 30, OUT)                                    # 눈
    c.rect(20, 24, 3, 6, FUR_D); c.rect(25, 24, 3, 6, FUR_D); c.px(21, 24, FUR); c.px(26, 24, FUR)   # 귀
    for x in (24, 30, 41, 47): c.rect(x, 47, 4, 11, FUR)   # 다리
    for x in (23, 29, 40, 46): c.rect(x, 57, 6, 2, FUR_D)
    for i in range(7): c.rect(51 + i, 36 - i, 4, 3, FUR_D if i % 2 else FUR)   # 꼬리(위로)
    outline_silhouette(c, OUT)
    return c

def toad_left():
    """두꺼비: 넓고 낮은 초록 몸, 밝은 배, 튀어나온 노란 눈, 사마귀 점, 큰 입"""
    c = Canvas(64, 64)
    SKIN, SKIN_D, BELLY, WART = hexc('#5d8f3a'), hexc('#3e6428'), hexc('#b9d88a'), hexc('#2e4a1c')
    ellipse(c, 34, 42, 22, 14, SKIN)                       # 몸통
    ellipse(c, 33, 48, 16, 7, BELLY)                       # 배
    ellipse(c, 30, 34, 18, 7, SKIN_D)                      # 등(어두움)
    ellipse(c, 20, 30, 6, 6, SKIN); ellipse(c, 21, 29, 4, 4, hexc('#ffd23b')); c.rect(20, 27, 2, 5, OUT)   # 눈(왼쪽)
    ellipse(c, 33, 28, 6, 6, SKIN); ellipse(c, 34, 27, 4, 4, hexc('#ffd23b')); c.rect(33, 25, 2, 5, OUT)   # 눈(오른쪽)
    c.rect(12, 41, 22, 2, OUT); c.px(11, 40, OUT); c.px(34, 40, OUT)                    # 입
    for (x, y) in ((40, 34), (46, 38), (26, 36), (50, 44), (44, 46)): c.rect(x, y, 2, 2, WART)   # 사마귀
    c.rect(16, 50, 8, 8, SKIN); c.rect(15, 56, 10, 2, SKIN_D)                             # 앞다리
    c.rect(46, 52, 10, 6, SKIN); c.rect(44, 56, 13, 2, SKIN_D)                            # 뒷다리
    outline_silhouette(c, OUT)
    return c

def front_from(fn, w=48, h=48):
    """정면 48x48: 옆모습을 가운데로 줄이지 않고(축소 금지 규칙) 같은 도트로 정면 실루엣을 따로 그린다 — 단순화: 옆모습 왼쪽 44px 을 잘라 가운데 배치"""
    src = fn(); c = Canvas(w, h)
    x0 = 2
    for y in range(64):
        for x in range(64):
            if src.a[y, x, 3] and 0 <= x - x0 + 2 < w and 0 <= y - 12 < h: c.a[y - 12, x - x0 + 2] = src.a[y, x]
    return c

if __name__ == '__main__':
    for name, fn in (('razorbeak', razorbeak_left), ('wolf', wolf_left), ('toad', toad_left)):
        fn().save(f'assets/enemies/{name}-battle-left.png'); front_from(fn).save(f'assets/enemies/{name}-front.png')
    print('wrote razorbeak/wolf/toad battle-left + front')
