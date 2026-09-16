#!/usr/bin/env python3
"""용광로 광장 세트(BUILD196, 사용자 2026-09-16 브리핑): 짧은 철 울타리·조작 패널·밧줄 달린 철창(쥰희·용준)·TV 모니터암.
- props/iron_fence_short.png : 32×22 짧은 철 울타리 한 칸(가로로 ------- 이어 붙인다)
- props/control_panel.png    : 64×40 버튼 조작 패널(캐릭터보다 두 칸 넓음, 노란 테두리 + 색 버튼 4개 + 작은 화면)
- props/lava_cage.png        : 136×360 밧줄(위 200px) + 넓은 새장 철창(두 명, 강철 + 청록 발광 살) — 천장에서 내려와 좌우로 흔들린다
- props/tv_arm.png           : 12×320 TV 모니터암(관절 세 개) — 영클 TV 프레임 위에 붙어 같이 내려온다
실행: /usr/bin/python3 tools/art/furnace_arena_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from painter import Canvas, hexc

OUT = Path('assets/props')
IRON, IRON_D, IRON_L, IRON_HI = hexc('#3a4556'), hexc('#151a22'), hexc('#5c6a7e'), hexc('#8fa0b6')

# 1) 짧은 철 울타리 32×22: 기둥 둘(x2·x27, 굵기 4) + 가로대 둘 + 세로 살 다섯
f = Canvas(32, 22)
for x in (2, 26):
    f.rect(x, 0, 4, 22, IRON); f.rect(x, 0, 1, 22, IRON_L); f.rect(x + 3, 0, 1, 22, IRON_D); f.rect(x, 0, 4, 2, IRON_HI)
for y in (5, 14):
    f.rect(0, y, 32, 3, IRON); f.rect(0, y, 32, 1, IRON_L); f.rect(0, y + 2, 32, 1, IRON_D)
for x in (9, 13, 17, 21):
    f.rect(x, 3, 2, 18, IRON_D); f.rect(x, 3, 1, 18, IRON)
f.save(OUT / 'iron_fence_short.png')

# 2) 조작 패널 64×40: 어두운 몸통 + 노란 테두리 띠(사용자 “노란 패널”), 비스듬한 윗면에 색 버튼 4개, 작은 화면
p = Canvas(64, 40)
p.rrect_outlined(0, 10, 64, 30, IRON, IRON_D, r=3)
p.rect(2, 12, 60, 2, IRON_L)
p.rrect_outlined(4, 0, 56, 16, hexc('#2b3340'), hexc('#ffd23f'), r=2)          # 윗면(노란 테두리)
p.rect(6, 2, 52, 1, hexc('#ffe27a'))
for i, c in enumerate(('#ff4a4a', '#4fa8ff', '#ffd23f', '#5ee36a')):            # 버튼 넷
    x = 8 + i * 13
    p.rrect_outlined(x, 4, 10, 8, hexc(c), IRON_D, r=2); p.rect(x + 2, 5, 4, 1, hexc('#ffffff'))
p.rrect_outlined(10, 18, 44, 14, hexc('#0e1a24'), hexc('#ffd23f'), r=2)        # 작은 화면
for y in range(21, 31, 3): p.rect(13, y, 38, 1, hexc('#1f4a5e'))
p.rect(14, 22, 8, 2, hexc('#60f4e0'))
p.rect(0, 36, 64, 4, IRON_D); p.rect(0, 36, 64, 1, hexc('#ffd23f'))            # 아래 노란 줄
p.save(OUT / 'control_panel.png')

# 3) 밧줄 + 철창 136×360: 두 명이 들어가게 넓은 새장 철창(기존 전기 철창 96 은 좁아 둘이 삐져나왔다 — 사용자 “철창이 더 넓어야지”). 같은 팔레트(강철 + 청록 발광 살)
CW, CH, ROPE = 136, 160, 200
c = Canvas(CW, ROPE + CH)
MET, MET_D, MET_L, GLOW, GLOW_D = hexc('#3a4556'), hexc('#1b2130'), hexc('#6b7a90'), hexc('#60f4e0'), hexc('#2fb8ad')
for y in range(0, ROPE):                                     # 밧줄(꼬임)
    tone = hexc('#967038') if (y // 3) % 2 == 0 else hexc('#785830')
    c.rect(CW // 2 - 3, y, 6, 1, tone); c.px(CW // 2 - 3, y, hexc('#58402a')); c.px(CW // 2 + 2, y, hexc('#58402a'))
c.rrect_outlined(CW // 2 - 10, ROPE - 12, 20, 14, MET_L, MET_D, r=4)           # 고리
c.rect(CW // 2 - 4, ROPE - 8, 8, 6, MET_D)
top, bot = ROPE, ROPE + CH
c.rrect_outlined(0, top, CW, 14, MET, MET_D, r=3); c.rect(4, top + 6, CW - 8, 3, GLOW); c.rect(4, top + 5, CW - 8, 1, GLOW_D)      # 윗판
c.rrect_outlined(0, bot - 16, CW, 16, MET, MET_D, r=3); c.rect(4, bot - 9, CW - 8, 3, GLOW); c.rect(4, bot - 10, CW - 8, 1, GLOW_D)  # 바닥판
for x in (2, CW - 10):                                       # 굵은 기둥 둘
    c.rect(x, top + 12, 8, CH - 26, MET); c.rect(x, top + 12, 2, CH - 26, MET_L); c.rect(x + 6, top + 12, 2, CH - 26, MET_D); c.rect(x + 3, top + 14, 2, CH - 30, GLOW)
for x in (34, 66, 98):                                       # 발광 살 셋(사이 32px — 둘이 안에 서 있어도 보인다)
    c.rect(x, top + 12, 5, CH - 26, MET_D); c.rect(x + 1, top + 14, 3, CH - 30, GLOW); c.rect(x + 2, top + 14, 1, CH - 30, hexc('#bffff6'))
c.save(OUT / 'lava_cage.png')

# 4) TV 모니터암 12×320: 어두운 금속 막대 + 관절 셋
a = Canvas(12, 320)
a.rect(3, 0, 6, 320, IRON); a.rect(3, 0, 1, 320, IRON_L); a.rect(8, 0, 1, 320, IRON_D)
for y in (40, 150, 260):
    a.rrect_outlined(0, y, 12, 14, IRON_L, IRON_D, r=3); a.rect(4, y + 5, 4, 4, IRON_D)
a.save(OUT / 'tv_arm.png')
print('wrote furnace arena set')
