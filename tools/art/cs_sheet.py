# -*- coding: utf-8 -*-
"""CS 미니언 임시 스프라이트 시트 (청록숲 3, 사용자가 나중에 진짜 스프라이트로 교체). 4열(걷기) x 4행 [down, up, left, right], 프레임 56x64 (2x 시트 → 화면 40x46).
둥근 회녹색 몸통 + 큰 눈 + 짧은 다리(프레임마다 번갈아) + 가슴에 'CS'. 실행: /usr/bin/python3 tools/art/cs_sheet.py → assets/sprites/cs.png"""
import sys
sys.path.insert(0, 'tools/art')
from painter import Canvas, hexc
FW, FH = 56, 64
B = hexc('#6f8f7a'); BL = hexc('#9ab8a4'); BD = hexc('#4a6655'); OUT = hexc('#101a16'); W = hexc('#ffffff'); K = hexc('#101010'); R = hexc('#d23b3b')
FONT = {'C': ['0110', '1001', '1000', '1000', '1001', '0110'], 'S': ['0111', '1000', '0110', '0001', '0001', '1110']}
def glyph(c, x, y, ch, col):
    for j, row in enumerate(FONT[ch]):
        for i, v in enumerate(row):
            if v == '1': c.px(x + i, y + j, col)
def frame(c, ox, oy, dir_, f):
    bob = 1 if f % 2 else 0
    bx, by = ox + 10, oy + 14 + bob
    for y in range(oy, oy + FH):                                    # 몸통 타원 36x38 (프레임 영역 안에서)
        for x in range(ox, ox + FW):
            if ((x - (bx + 18)) / 18) ** 2 + ((y - (by + 19)) / 19) ** 2 <= 1: c.px(x, y, B)
    for y in range(oy, oy + FH):
        for x in range(ox, ox + FW):
            if ((x - (bx + 13)) / 9) ** 2 + ((y - (by + 12)) / 8) ** 2 <= 1: c.px(x, y, BL)   # 하이라이트
    # 다리 (걷기: 프레임 1,3 은 벌림)
    spread = 4 if f in (1, 3) else 0
    c.rect(bx + 9 - spread, by + 36, 6, 8, BD); c.rect(bx + 21 + spread, by + 36, 6, 8, BD)
    c.outline(bx + 9 - spread, by + 36, 6, 8, OUT); c.outline(bx + 21 + spread, by + 36, 6, 8, OUT)
    if dir_ in ('down', 'left', 'right'):                              # 눈
        ex = bx + 18 + (-6 if dir_ == 'left' else 6 if dir_ == 'right' else 0)
        for dx in (-7, 7):
            if dir_ == 'down' or (dir_ == 'left' and dx < 0) or (dir_ == 'right' and dx > 0) or dir_ == 'down':
                c.rect(ex + dx - 3, by + 10, 6, 7, W); c.outline(ex + dx - 3, by + 10, 6, 7, OUT); c.rect(ex + dx - 1, by + 13, 2, 3, K)
        if dir_ == 'down': c.hline(bx + 14, by + 22, 8, R)               # 입
    if dir_ == 'down' or dir_ == 'left' or dir_ == 'right':
        glyph(c, bx + 13, by + 25, 'C', K); glyph(c, bx + 19, by + 25, 'S', K)
    if dir_ == 'up': c.rect(bx + 12, by + 8, 12, 3, BD)                 # 뒤통수 줄
    # 테두리
    for y in range(oy, oy + FH):
        for x in range(ox, ox + FW):
            if c.a[y, x, 3] == 0 and any(ox <= x + dx < ox + FW and oy <= y + dy < oy + FH and c.a[y + dy, x + dx, 3] != 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): c.px(x, y, OUT)
c = Canvas(FW * 4, FH * 4)
for r, d in enumerate(('down', 'up', 'left', 'right')):
    for f in range(4): frame(c, f * FW, r * FH, d, f)
c.save('assets/sprites/cs.png'); print('cs sheet ok', FW * 4, FH * 4)
