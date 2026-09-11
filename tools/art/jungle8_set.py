# -*- coding: utf-8 -*-
"""청록숲8 정글 몹 자리표시 도트 (2026-09-11): 돌거북(krug)·바위게(scuttle)·대포미니언(cannon).
   실제 스프라이트는 사용자 PR 로 온다 — 같은 파일명(assets/enemies/jungle-<id>-front.png 48×48 / -battle-left.png 64×64 pivot 32,60)으로 덮으면 코드 변경 없이 교체된다.
   델타룬식 최소 디테일: 외곽선 1px + 두세 톤.
실행: /usr/bin/python3 tools/art/jungle8_set.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from painter import Canvas, hexc

def krug(w, h, left):
    """돌거북: 회색 돌 등껍질(둥근 돔, 갈라진 금) + 아래 머리·발. left=True 면 머리가 왼쪽"""
    c = Canvas(w, h); L, D, M, H_ = hexc('#2b2f36'), hexc('#5c636e'), hexc('#7d8592'), hexc('#a4acb8')
    cx, top, sw, sh = w // 2, int(h * 0.28), int(w * 0.62), int(h * 0.42)
    x0 = cx - sw // 2
    c.rrect(x0, top, sw, sh, L, r=6); c.rrect(x0 + 1, top + 1, sw - 2, sh - 2, D, r=5); c.rrect(x0 + 3, top + 3, sw - 6, sh // 2, M, r=4)
    c.hline(x0 + 5, top + 5, sw - 12, H_)                                             # 위 하이라이트
    for k in range(3): c.px(x0 + 6 + k * (sw // 4), top + 8 + (k % 2) * 3, L); c.vline(x0 + 6 + k * (sw // 4), top + 9 + (k % 2) * 3, 4, L)   # 금
    hy = top + sh - 2
    if left: hx = x0 - 6
    else: hx = cx - 5
    c.rrect(hx, hy, 11, 8, L, r=3); c.rrect(hx + 1, hy + 1, 9, 6, M, r=2); c.px(hx + (2 if left else 6), hy + 3, L)   # 머리·눈
    for k in (x0 + 3, x0 + sw - 9):                                                    # 발
        c.rrect(k, top + sh - 1, 6, 5, L, r=2); c.rrect(k + 1, top + sh, 4, 3, D, r=1)
    return c

def scuttle(w, h, left):
    """바위게: 청록 몸통 + 집게 둘 + 눈자루. left=True 면 집게가 왼쪽으로"""
    c = Canvas(w, h); L, D, M, H_ = hexc('#12332c'), hexc('#2f7a68'), hexc('#4fae95'), hexc('#8fe0c8')
    cx, cy, bw, bh = w // 2, int(h * 0.62), int(w * 0.5), int(h * 0.3)
    x0 = cx - bw // 2
    c.rrect(x0, cy - bh // 2, bw, bh, L, r=6); c.rrect(x0 + 1, cy - bh // 2 + 1, bw - 2, bh - 2, D, r=5); c.rrect(x0 + 3, cy - bh // 2 + 2, bw - 6, bh // 2, M, r=4)
    for k in range(3):                                                                 # 다리
        c.vline(x0 - 3, cy - 2 + k * 3, 2, L); c.vline(x0 + bw + 1, cy - 2 + k * 3, 2, L)
    if left:
        for dy in (-6, 4): c.rrect(x0 - 14, cy + dy - 3, 12, 7, L, r=3); c.rrect(x0 - 13, cy + dy - 2, 10, 5, M, r=2); c.px(x0 - 12, cy + dy, L)
        ex = x0 + 4
    else:
        for dx in (x0 - 12, x0 + bw): c.rrect(dx, cy - bh // 2 - 4, 12, 7, L, r=3); c.rrect(dx + 1, cy - bh // 2 - 3, 10, 5, M, r=2)
        ex = cx - 5
    for k in (0, 7):                                                                   # 눈자루 + 눈
        c.vline(ex + k, cy - bh // 2 - 7, 7, L); c.rrect(ex + k - 1, cy - bh // 2 - 10, 4, 4, L, r=1); c.px(ex + k, cy - bh // 2 - 9, H_)
    return c

def cannon(w, h, left):
    """대포미니언: 파란 미니언 몸통 + 대포 통. left=True 면 포구가 왼쪽"""
    c = Canvas(w, h); L, D, M, H_ = hexc('#16264a'), hexc('#2f5cc4'), hexc('#5b86e6'), hexc('#a9c4ff')
    G, GL = hexc('#23272e'), hexc('#5a616b')
    cx, bw, bh = w // 2, int(w * 0.44), int(h * 0.56)
    x0, y0 = cx - bw // 2, int(h * 0.2)
    c.rrect(x0, y0, bw, bh, L, r=6); c.rrect(x0 + 1, y0 + 1, bw - 2, bh - 2, D, r=5); c.rrect(x0 + 3, y0 + 3, bw - 6, bh // 3, M, r=4)
    c.px(x0 + 5, y0 + 6, L); c.px(x0 + bw - 6, y0 + 6, L); c.hline(x0 + 6, y0 + 11, bw - 12, L)   # 눈·입
    c.hline(x0 + 5, y0 + 4, bw - 10, H_)
    if left: bx, by = x0 - 12, y0 + bh // 2 - 2
    else: bx, by = x0 + bw - 4, y0 + bh // 2 - 2
    c.rrect(bx, by, 16, 8, L, r=2); c.rrect(bx + 1, by + 1, 14, 6, G, r=2); c.hline(bx + 2, by + 2, 12, GL)   # 대포 통
    c.rrect(bx + (0 if left else 12), by - 1, 4, 10, L, r=1)                                          # 포구 테
    for k in (x0 + 3, x0 + bw - 8):                                                                   # 발
        c.rrect(k, y0 + bh - 1, 5, 4, L, r=1)
    return c

if __name__ == '__main__':
    for name, fn in (('krug', krug), ('scuttle', scuttle), ('cannon', cannon)):
        fn(48, 48, False).save(f'assets/enemies/jungle-{name}-front.png')
        fn(64, 64, True).save(f'assets/enemies/jungle-{name}-battle-left.png')
    print('jungle8 placeholders ok (krug, scuttle, cannon)')
