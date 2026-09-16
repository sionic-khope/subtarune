#!/usr/bin/env python3
"""엄청대박인배 조종실(youngcle20, BUILD201 사용자 브리핑 “디지털한 조종실, 가운데에 기계·컴퓨터·조작 장치가 쫙, 과학 느낌 TV, 사이드에도”) 소품 세트.
- props/ship_main_screen.png : 3프레임 띠 3×(256×72) — 앞 벽 대형 화면(격자 + 레이더 스윕 + 신호점 + 아래 눈금 막대), anim {cols:3, fps:4}
- props/ship_helm.png        : 288×56 조타 콘솔(대형 화면 아래, 화면 다섯·조타 레버·버튼 줄)
- props/ship_console.png     : 128×48 조작 콘솔(비스듬한 윗면에 화면 셋·버튼·키보드)
- props/ship_server_rack.png : 2프레임 띠 2×(48×88) — 서버 랙(LED 가 프레임마다 바뀜), anim {cols:2, fps:3}
- props/ship_holo_table.png  : 3프레임 띠 3×(96×72) — 홀로그램 탁자(전함 실루엣이 깜빡이며 떠 있음), anim {cols:3, fps:5}
- props/ship_tv.png          : 2프레임 띠 2×(80×72) — 과학 느낌 TV(둥근 화면·안테나·색 띠 ↔ 지직), anim {cols:2, fps:6}
- props/ship_reactor.png     : 2프레임 띠 2×(96×120) — 옆 벽 반응로(유리관 속 보라·청록 핵이 맥동), anim {cols:2, fps:2}
- props/ship_floor_strip.png : 128×8 바닥 청록 유도등(장식, 히트박스 윗변 2px) / ship_floor_strip_v.png 8×128
실행: /usr/bin/python3 tools/art/ship_control_set.py"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from painter import Canvas, hexc

PROPS = Path('assets/props')
IRON, IRON_D, IRON_L, IRON_HI = hexc('#3a4556'), hexc('#151a22'), hexc('#5c6a7e'), hexc('#8fa0b6')
SCR, SCR_GRID, GLOW, GLOW_D, GLOW_HI = hexc('#07131c'), hexc('#0e2a3a'), hexc('#60f4e0'), hexc('#2fb8ad'), hexc('#bffff6')
GREEN, YEL, RED, PURP, PURP_L, WHITE = hexc('#5ee36a'), hexc('#ffd23f'), hexc('#ff4a4a'), hexc('#8a63b5'), hexc('#c9a6ff'), hexc('#ffffff')


def strip(frames, w, h, path):
    s = Canvas(w * len(frames), h)
    for i, f in enumerate(frames): s.blit(f, i * w, 0)
    s.save(PROPS / path)


def main_screen() -> None:
    frames = []
    for k in range(3):
        f = Canvas(256, 72)
        f.rrect_outlined(0, 0, 256, 72, IRON, IRON_D, r=3); f.rect(2, 2, 252, 2, IRON_HI)
        f.rect(6, 6, 244, 52, SCR)
        for x in range(6, 250, 16): f.vline(x, 6, 52, SCR_GRID)
        for y in range(6, 58, 13): f.hline(6, y, 244, SCR_GRID)
        cx, cy = 128, 32
        for rad in (10, 20):                                            # 레이더 원
            for x in range(cx - rad - 1, cx + rad + 2):
                for y in range(cy - rad - 1, cy + rad + 2):
                    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                    if abs(d - rad) < 0.7: f.px(x, y, GLOW_D)
        f.hline(cx - 22, cy, 44, GLOW_D); f.vline(cx, cy - 22, 44, GLOW_D)
        dx, dy = ((1, -1), (1, 1), (-1, 1))[k]                          # 스윕 선(프레임마다 회전)
        for i in range(22): f.px(cx + dx * i, cy + dy * i, GLOW); f.px(cx + dx * i + (1 if dx > 0 else -1), cy + dy * i, GLOW_D)
        for x, y in ((40, 20), (60, 44), (200, 18), (218, 40), (150, 50)): f.rect(x, y, 2, 2, GREEN if (x + k) % 2 else GLOW_HI)
        for i, x in enumerate(range(14, 110, 12)):                      # 왼쪽 막대 그래프
            h = (7, 12, 5, 15, 9, 13, 6, 11)[(i + k) % 8]; f.rect(x, 50 - h, 8, h, GLOW_D); f.rect(x, 50 - h, 8, 1, GLOW)
        for i, x in enumerate(range(150, 246, 12)):                     # 오른쪽 수치 줄
            f.rect(x, 14 + i * 4, 6 + (k + i) % 3 * 2, 2, GLOW if i % 3 else YEL)
        f.rect(6, 60, 244, 6, IRON_D)
        for i in range(0, 244, 6): f.rect(8 + i, 62, 3, 2, GLOW if (i // 6 + k) % 4 else RED)
        frames.append(f)
    strip(frames, 256, 72, 'ship_main_screen.png')


def console_top(c: Canvas, x: int, y: int, w: int, screens: int) -> None:
    """비스듬한 콘솔 윗면: 화면 n개 + 버튼 줄 + 키보드"""
    c.rrect_outlined(x, y, w, 18, IRON_L, IRON_D, r=2); c.rect(x + 2, y + 1, w - 4, 1, IRON_HI)
    gap = (w - 8) // screens
    for i in range(screens):
        sx = x + 4 + i * gap
        c.rrect_outlined(sx, y + 3, gap - 4, 9, SCR, IRON_D, r=1)
        for j in range(3): c.rect(sx + 2, y + 5 + j * 2, (gap - 8) * (2 + (i + j) % 3) // 5, 1, (GLOW, GREEN, GLOW_D)[(i + j) % 3])
    for i, cx in enumerate(range(x + 6, x + w - 6, 7)): c.rect(cx, y + 14, 4, 2, (RED, YEL, GREEN, GLOW)[i % 4])


def console() -> None:
    c = Canvas(128, 48)
    c.rrect_outlined(0, 16, 128, 32, IRON, IRON_D, r=3); c.rect(0, 44, 128, 4, IRON_D)
    c.rect(4, 22, 120, 1, IRON_L); c.rect(10, 30, 108, 8, IRON_D)                        # 앞판 홈
    for x in range(14, 114, 10): c.rect(x, 33, 6, 2, GLOW_D)
    console_top(c, 4, 0, 120, 3)
    c.save(PROPS / 'ship_console.png')


def helm() -> None:
    c = Canvas(288, 56)
    c.rrect_outlined(0, 20, 288, 36, IRON, IRON_D, r=4); c.rect(0, 52, 288, 4, IRON_D); c.rect(4, 26, 280, 1, IRON_L)
    console_top(c, 4, 2, 116, 3); console_top(c, 168, 2, 116, 3)
    c.rrect_outlined(124, 0, 40, 22, IRON_L, IRON_D, r=3)                                # 가운데 조타 레버판
    c.rect(130, 4, 28, 3, IRON_D); c.rect(140, 2, 8, 12, IRON_HI); c.rect(142, 0, 4, 4, RED)
    c.rrect_outlined(130, 15, 28, 5, SCR, IRON_D, r=1); c.rect(132, 17, 12, 1, GLOW)
    for x in range(20, 268, 24): c.rrect_outlined(x, 34, 16, 12, SCR, IRON_D, r=1); c.rect(x + 2, 37, 10, 2, GLOW_D); c.rect(x + 2, 41, 6, 2, GREEN)
    c.save(PROPS / 'ship_helm.png')


def server_rack() -> None:
    frames = []
    for k in range(2):
        r = Canvas(48, 88)
        r.rrect_outlined(0, 0, 48, 88, IRON_D, IRON_D, r=2); r.rect(2, 2, 44, 84, IRON); r.rect(2, 2, 44, 1, IRON_HI)
        r.rect(0, 84, 48, 4, IRON_D)
        for i, y in enumerate(range(6, 80, 10)):                                          # 슬롯 8개
            r.rect(5, y, 38, 8, IRON_D); r.rect(6, y + 1, 36, 6, IRON_L); r.rect(6, y + 1, 36, 1, IRON_HI)
            for j in range(4):
                on = (i + j + k) % 3 != 0
                r.rect(8 + j * 4, y + 3, 2, 2, (GREEN if j % 2 else GLOW) if on else IRON_D)
            r.rect(28, y + 3, 12, 2, IRON_D); r.rect(28, y + 3, (i * 3 + k * 5) % 12, 2, RED if i == 5 else GLOW_D)
        frames.append(r)
    strip(frames, 48, 88, 'ship_server_rack.png')


def holo_table() -> None:
    frames = []
    for k in range(3):
        t = Canvas(96, 72)
        t.rrect_outlined(4, 44, 88, 24, IRON, IRON_D, r=6); t.rect(6, 45, 84, 2, PURP_L); t.rect(10, 50, 76, 1, PURP)
        t.rect(4, 64, 88, 4, IRON_D); t.rect(20, 66, 56, 2, PURP)
        for x in range(12, 84, 14): t.rect(x, 56, 6, 3, GLOW if (x // 14 + k) % 2 else GLOW_D)
        for y in range(10, 46):                                                           # 빛기둥(디더)
            for x in range(20 + (46 - y) // 3, 76 - (46 - y) // 3):
                if (x + y + k) % 3 == 0: t.px(x, y, GLOW_D)
        oy = (0, -2, -1)[k]                                                               # 전함 실루엣(떠 있음, 깜빡)
        hull = GLOW if k != 1 else GLOW_HI
        t.rect(24, 24 + oy, 48, 6, hull); t.rect(28, 20 + oy, 24, 4, hull); t.rect(32, 16 + oy, 10, 4, hull)
        t.rect(70, 22 + oy, 6, 2, hull); t.rect(40, 12 + oy, 2, 4, hull); t.rect(20, 26 + oy, 4, 2, hull)
        for x in range(22, 74, 2): t.px(x, 31 + oy, GLOW_D)
        frames.append(t)
    strip(frames, 96, 72, 'ship_holo_table.png')


def tv() -> None:
    frames = []
    for k in range(2):
        v = Canvas(80, 72)
        v.rect(30, 0, 2, 14, IRON_HI); v.rect(48, 0, 2, 14, IRON_HI)                       # 안테나
        for i in range(8): v.px(31 + i, 6 + i, IRON_HI); v.px(48 - i, 6 + i, IRON_HI)
        v.rect(29, 0, 4, 3, GLOW); v.rect(47, 0, 4, 3, RED)
        v.rrect_outlined(4, 14, 72, 46, IRON_L, IRON_D, r=8); v.rect(8, 16, 64, 2, IRON_HI)
        v.rrect_outlined(10, 20, 50, 34, SCR, IRON_D, r=5)
        if k == 0:
            for i, c in enumerate((WHITE, YEL, GLOW, GREEN, PURP_L, RED, hexc('#3a5bd8'))): v.rect(12 + i * 7, 22, 7, 24, c)
            v.rect(12, 46, 46, 6, IRON_D)
        else:
            for y in range(22, 52):
                for x in range(12, 58):
                    if (x * 7 + y * 13) % 5 == 0: v.px(x, y, IRON_HI)
                    elif (x * 3 + y * 5) % 7 == 0: v.px(x, y, IRON_L)
        v.rrect_outlined(62, 22, 12, 30, IRON, IRON_D, r=2)                                # 손잡이 판
        v.rect(65, 25, 6, 6, IRON_D); v.rect(66, 26, 4, 4, YEL if k else IRON_HI); v.rect(65, 34, 6, 6, IRON_D); v.rect(66, 35, 4, 4, GLOW)
        v.rect(64, 44, 8, 2, RED if k else IRON_HI)
        v.rect(30, 60, 20, 4, IRON_D); v.rrect_outlined(18, 64, 44, 8, IRON_L, IRON_D, r=3)  # 받침
        frames.append(v)
    strip(frames, 80, 72, 'ship_tv.png')


def reactor() -> None:
    frames = []
    for k in range(2):
        r = Canvas(96, 120)
        r.rrect_outlined(8, 0, 80, 18, IRON, IRON_D, r=4); r.rect(10, 2, 76, 2, IRON_HI)     # 위 덮개
        r.rrect_outlined(8, 96, 80, 24, IRON, IRON_D, r=4); r.rect(8, 116, 80, 4, IRON_D)   # 받침
        for x in (0, 88): r.rect(x, 30, 8, 60, IRON); r.rect(x + 1, 30, 1, 60, IRON_L)     # 옆 배관
        r.rect(0, 28, 96, 4, IRON_D); r.rect(0, 88, 96, 4, IRON_D)
        r.rrect_outlined(20, 16, 56, 84, hexc('#123240'), IRON_D, r=6); r.rect(24, 20, 2, 76, hexc('#2c5566'))   # 유리관
        cy, core = 58, (PURP, PURP_L)[k]
        for x in range(28, 68):
            for y in range(30, 88):
                d = ((x - 48) ** 2 + ((y - cy) * 0.8) ** 2) ** 0.5
                if d < 9 + k: r.px(x, y, GLOW_HI if d < 4 else core)
                elif d < 14 + k * 2 and (x + y) % 2 == 0: r.px(x, y, PURP_L if k else PURP)
                elif d < 20 and (x + y + k) % 4 == 0: r.px(x, y, GLOW_D)
        for y in (34, 46, 70, 82): r.rect(24, y, 48, 1, hexc('#2c5566'))
        for i, x in enumerate(range(14, 82, 12)): r.rect(x, 6, 6, 6, (GREEN, GLOW, RED)[(i + k) % 3])
        r.rrect_outlined(30, 102, 36, 12, SCR, IRON_D, r=2); r.rect(33, 105, 12 + k * 10, 2, GLOW); r.rect(33, 109, 20, 2, PURP_L)
        frames.append(r)
    strip(frames, 96, 120, 'ship_reactor.png')


def floor_strips() -> None:
    s = Canvas(128, 8)
    s.rect(0, 2, 128, 4, IRON_D); s.rect(0, 3, 128, 2, GLOW_D)
    for x in range(4, 128, 16): s.rect(x, 3, 8, 2, GLOW)
    s.save(PROPS / 'ship_floor_strip.png')
    v = Canvas(8, 128)
    v.rect(2, 0, 4, 128, IRON_D); v.rect(3, 0, 2, 128, GLOW_D)
    for y in range(4, 128, 16): v.rect(3, y, 2, 8, GLOW)
    v.save(PROPS / 'ship_floor_strip_v.png')


if __name__ == '__main__':
    main_screen(); console(); helm(); server_rack(); holo_table(); tv(); reactor(); floor_strips()
    print('wrote ship control set')
