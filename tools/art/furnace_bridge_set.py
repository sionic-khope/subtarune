#!/usr/bin/env python3
"""용광로 광장 용암 다리 판(BUILD199c 사용자 브리핑 “용암길 가운데에 다리가 하나씩 철컥철컥 생기는 연출”).
- props/iron_bridge_plank.png : 96×32 — 바닥 타일(youngcle_iron_blue) 세 장을 이어 붙이고 위아래 쇠 테두리·리벳. 웅덩이 가운데 cols 14~16 한 줄에 하나씩 놓인다(6장).
실행: /usr/bin/python3 tools/art/furnace_bridge_set.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path('assets/props/iron_bridge_plank.png')
TILE = Image.open('assets/tiles/youngcle_iron_blue.png').convert('RGBA')
RIM, RIM_L, RIVET, RIVET_D = (21, 26, 34, 255), (125, 142, 166, 255), (170, 184, 204, 255), (60, 70, 86, 255)


def main() -> None:
    im = Image.new('RGBA', (96, 32), (0, 0, 0, 0))
    for i in range(3):
        im.paste(TILE, (i * 32, 0))
    d = ImageDraw.Draw(im)
    # 위아래 쇠 테두리(3px) + 밝은 모서리 선
    d.rectangle([0, 0, 95, 2], fill=RIM); d.rectangle([0, 29, 95, 31], fill=RIM)
    d.line([0, 3, 95, 3], fill=RIM_L); d.line([0, 28, 95, 28], fill=RIM_L)
    # 양 끝 세로 테두리
    d.rectangle([0, 0, 1, 31], fill=RIM); d.rectangle([94, 0, 95, 31], fill=RIM)
    # 리벳: 네 귀퉁이와 가운데 위아래
    for x in (5, 47, 89):
        for y in (6, 24):
            d.rectangle([x, y, x + 1, y + 1], fill=RIVET); d.point([x + 1, y + 1], fill=RIVET_D)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT)
    print('wrote', OUT, im.size)


if __name__ == '__main__':
    main()
