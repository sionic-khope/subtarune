#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# /usr/bin/python3 tools/art/subrio_set.py   (루트에서)
# ──────────────────
"""섭리오(스크린 속 2D 플랫포머) 타일·투사체·HUD: 스테이지 1~3 보라·청록·파랑 팔레트의 16px 타일 아틀라스(7칸), 창, 물줄기, 하트."""
from pathlib import Path
from typing import Final

from painter import Canvas

T: Final = 16
# 팔레트: 밖(외곽선)·바닥·바닥 속·바닥 윗면(풀)·블록·블록 밝은 면·반짝이·속 점무늬
PALETTES: Final = {
    'purple': dict(out=(14, 5, 26), ground=(96, 48, 160), dark=(62, 28, 110), top=(170, 110, 235), block=(128, 76, 196), light=(205, 160, 255), spark=(230, 200, 255), dot=(44, 18, 80)),
    'teal': dict(out=(4, 22, 22), ground=(36, 140, 130), dark=(20, 90, 86), top=(120, 230, 210), block=(60, 170, 160), light=(170, 245, 230), spark=(220, 255, 250), dot=(12, 60, 58)),
    'blue': dict(out=(6, 10, 30), ground=(48, 84, 190), dark=(26, 46, 120), top=(130, 170, 255), block=(70, 110, 215), light=(180, 205, 255), spark=(230, 240, 255), dot=(16, 28, 80)),
    # 1-4 보스 무대(사용자: 회색·쿠파성 느낌): 회색 돌벽돌, 윗면 밝은 회색, 블록은 어두운 성벽 돌
    'castle': dict(out=(18, 16, 22), ground=(108, 108, 122), dark=(62, 62, 74), top=(158, 158, 172), block=(120, 120, 136), light=(186, 186, 202), spark=(214, 214, 226), dot=(44, 44, 54)),
}
FLAG_RED: Final = (220, 50, 60)
FLAG_WHITE: Final = (250, 245, 240)


def draw_atlas(p: dict) -> Canvas:
    """아틀라스 열: 0 바닥 윗면, 1 바닥 속, 2 떠 있는 블록, 3 블록 왼쪽 끝, 4 블록 오른쪽 끝, 5 깃발 기둥, 6 깃발 천(기둥 꼭대기)"""
    atlas = Canvas(T * 7, T)
    # 0 바닥 윗면: 위 2px 밝은 풀 띠 + 어두운 외곽
    atlas.rect(0, 0, T, T, p['ground']); atlas.rect(0, 0, T, 3, p['top']); atlas.rect(0, 3, T, 1, p['out'])
    for x in (2, 7, 12): atlas.rect(x, 1, 2, 1, p['spark'])
    atlas.rect(4, 9, 3, 2, p['dark']); atlas.rect(11, 12, 3, 2, p['dark'])
    # 1 바닥 속: 어두운 색에 점 무늬
    atlas.rect(T, 0, T, T, p['dark'])
    for (x, y) in ((3, 4), (9, 2), (13, 9), (6, 12), (1, 10)): atlas.rect(T + x, y, 2, 2, p['dot'])
    # 2 떠 있는 블록: 밝은 윗면·어두운 아랫면·외곽
    atlas.rrect_outlined(T * 2, 0, T, T, p['block'], p['out'], r=2); atlas.rect(T * 2 + 2, 2, T - 4, 3, p['light']); atlas.rect(T * 2 + 2, T - 4, T - 4, 2, p['dark'])
    # 3·4 블록 끝(같은 모양, 한쪽 외곽만 두껍게)
    atlas.rrect_outlined(T * 3, 0, T, T, p['block'], p['out'], r=2); atlas.rect(T * 3 + 2, 2, T - 4, 3, p['light']); atlas.rect(T * 3, 0, 2, T, p['out'])
    atlas.rrect_outlined(T * 4, 0, T, T, p['block'], p['out'], r=2); atlas.rect(T * 4 + 2, 2, T - 4, 3, p['light']); atlas.rect(T * 4 + T - 2, 0, 2, T, p['out'])
    # 5 기둥
    atlas.rect(T * 5 + 6, 0, 4, T, p['out']); atlas.rect(T * 5 + 7, 0, 2, T, (200, 200, 220))
    # 6 깃발 천: 기둥 꼭대기 공(밝음) + 오른쪽으로 펄럭이는 빨강·흰 삼각기
    atlas.rect(T * 6 + 6, 4, 4, T - 4, p['out']); atlas.rect(T * 6 + 7, 4, 2, T - 4, (200, 200, 220))
    atlas.rrect(T * 6 + 5, 0, 6, 6, (255, 230, 120), r=2)
    for row in range(8):
        w = 8 - row if row < 4 else row - 3
        atlas.rect(T * 6 + 9, 4 + row, w, 1, FLAG_RED if row % 2 == 0 else FLAG_WHITE)
    return atlas


for name, palette in PALETTES.items():
    out = Path('assets/props') / ('subrio_tiles.png' if name == 'purple' else f'subrio_tiles_{name}.png')
    draw_atlas(palette).save(out)
    print('wrote', out, f'({T * 7}x{T})')
# 창 투사체 24×6 (오른쪽 향함)
spear: Final = Canvas(24, 6)
spear.rect(0, 2, 18, 2, (120, 80, 40)); spear.rect(0, 2, 18, 1, (170, 120, 70))
spear.rect(16, 1, 6, 4, (210, 170, 90)); spear.rect(20, 2, 4, 2, (240, 220, 150)); spear.rect(0, 1, 3, 4, (190, 40, 40))
spear.save(Path('assets/props/subrio_spear.png'))
# 비데의 물줄기 투사체 14×8 (오른쪽 향함): 하늘색 물방울 덩어리 + 흰 하이라이트
water: Final = Canvas(14, 8)
water.rrect(0, 1, 12, 6, (70, 150, 240), r=2); water.rrect(2, 0, 12, 6, (110, 190, 255), r=2)
water.rect(4, 1, 5, 1, (230, 250, 255)); water.rect(10, 2, 2, 1, (230, 250, 255)); water.rect(0, 5, 3, 2, (40, 100, 200))
water.save(Path('assets/props/subrio_water.png'))
# HUD 하트 2칸(가득·빈) 10×9
hud: Final = Canvas(20, 9)
def heart(c: Canvas, x: int, fill, line) -> None:
    rows = ['.XX..XX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...']
    for y, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == 'X': c.px(x + i + 1, y + 1, fill)
    for y, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != 'X': continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, i + dx
                if yy < 0 or yy >= len(rows) or xx < 0 or xx >= 8 or rows[yy][xx] != 'X': c.px(x + xx + 1, yy + 1, line)
heart(hud, 0, (235, 60, 80), (60, 10, 20)); hud.rect(3, 2, 2, 1, (255, 170, 180))
heart(hud, 10, (70, 70, 90), (30, 30, 40))
hud.save(Path('assets/props/subrio_hud.png'))
print('wrote assets/props/subrio_spear.png (24x6), subrio_water.png (14x8), subrio_hud.png (20x9)')
# 훈련 토템(1-0 튜토리얼 표적) 32×48 셀 2칸: 0 서 있음, 1 맞은 순간(살짝 기울고 눈 감음). 발 y44, 나무 기둥 + 짚 얼굴 + 붉은 띠
totem: Final = Canvas(64, 48)
def draw_totem(c: Canvas, ox: int, hit: bool) -> None:
    WOOD, WOOD_D, WOOD_L, STRAW, ROPE, OUT2 = (150, 100, 52), (96, 62, 30), (196, 146, 84), (222, 190, 96), (190, 50, 50), (40, 24, 12)
    tilt = 2 if hit else 0
    c.rect(ox + 10 + tilt, 10, 12, 34, OUT2); c.rect(ox + 11 + tilt, 11, 10, 32, WOOD); c.rect(ox + 12 + tilt, 11, 3, 32, WOOD_L); c.rect(ox + 18 + tilt, 11, 2, 32, WOOD_D)
    c.rect(ox + 6, 40, 20, 4, OUT2); c.rect(ox + 7, 41, 18, 2, WOOD_D)
    # 짚 머리(둥근 덩어리)와 얼굴
    c.rrect_outlined(ox + 6 + tilt, 2, 20, 16, STRAW, OUT2, r=4)
    if hit:
        c.rect(ox + 10 + tilt, 8, 4, 1, OUT2); c.rect(ox + 18 + tilt, 8, 4, 1, OUT2); c.rect(ox + 13 + tilt, 12, 6, 2, OUT2)
    else:
        c.rect(ox + 10 + tilt, 7, 3, 3, OUT2); c.rect(ox + 19 + tilt, 7, 3, 3, OUT2); c.rect(ox + 13 + tilt, 12, 6, 1, OUT2)
    # 붉은 띠 + 팔 막대
    c.rect(ox + 8 + tilt, 20, 16, 4, ROPE); c.rect(ox + 8 + tilt, 24, 16, 1, OUT2)
    c.rect(ox + 2 + tilt, 26, 28, 3, OUT2); c.rect(ox + 3 + tilt, 27, 26, 1, WOOD_L)
draw_totem(totem, 0, False); draw_totem(totem, 32, True)
totem.save(Path('assets/props/subrio_totem.png'))
print('wrote assets/props/subrio_totem.png (64x48)')
# 회복 샘물(스테이지 중간·끝, C 로 체력 가득) 32×24 ×2 프레임: 돌 받침 + 파란 물 + 반짝임(프레임마다 자리 다름)
spring: Final = Canvas(64, 24)
def draw_spring(c: Canvas, ox: int, alt: bool) -> None:
    STONE, STONE_D, WATER, WATER_L, OUTS = (150, 150, 170), (90, 90, 110), (70, 150, 240), (150, 210, 255), (30, 30, 46)
    c.rrect_outlined(ox + 2, 10, 28, 14, STONE, OUTS, r=3); c.rect(ox + 4, 20, 24, 2, STONE_D)
    c.rrect(ox + 5, 12, 22, 7, WATER, r=2); c.rect(ox + 7, 12, 18, 1, WATER_L)
    # 솟는 물줄기
    c.rect(ox + 15, 4, 2, 9, WATER); c.rect(ox + 15, 3, 2, 1, WATER_L)
    for dx, dy in ((-4, 6), (4, 5), (-6, 9), (6, 9)) if not alt else ((-5, 4), (5, 7), (-3, 9), (7, 10)):
        c.px(ox + 16 + dx, dy, WATER_L)
draw_spring(spring, 0, False); draw_spring(spring, 32, True)
spring.save(Path('assets/props/subrio_spring.png'))
print('wrote assets/props/subrio_spring.png (64x24)')
