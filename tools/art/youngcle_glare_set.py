#!/usr/bin/env python3
"""영클 TV 표정 ‘glare’(BUILD200 사용자 “약간 진지하게 눈 뜨면서 조금 짜증나서 앞에 째려보면서 화난 듯한 스프라이트”).
smirk(팔짱) 그림을 바탕으로 눈판의 ‘6’ 을 지우고 반쯤 감긴 두 눈 + 안쪽으로 내려간 눈썹, 씩 웃던 입을 일자 입으로 바꾼다.
- illustrations/youngcle-tv-glare.png : 258×119 (TV 화면 안)
- portraits/youngcle_tv_glare.png     : 96×96 흑백 선화(대화창 초상, 다른 영클 초상과 같은 방식: 머리 부분(88,2)~(182,96) 잘라 확대 → 어두운 픽셀만 검정)
실행: /usr/bin/python3 tools/art/youngcle_glare_set.py"""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

SRC = Path('assets/illustrations/youngcle-tv-smirk.png')
OUT_ILL = Path('assets/illustrations/youngcle-tv-glare.png')
OUT_POR = Path('assets/portraits/youngcle_tv_glare.png')
BLACK, WHITE, SKIN = (16, 12, 14, 255), (255, 255, 255, 255), (254, 187, 169, 255)
EYE_ROWS = (28, 63)          # 흰 눈판이 있는 줄(smirk 기준)
MOUTH_BOX = (120, 62, 151, 77)   # 씩 웃는 입(검정 선·흰 이·빨강)만 들어 있는 상자 — 볼(x≤110, x≥154)·얼굴 윤곽은 밖


def clear_eye_plate(im: Image.Image) -> None:
    """눈판 안(흰 픽셀 사이)의 검은 글자(6)를 지운다"""
    arr = np.array(im)
    white = (arr[:, :, 0] > 235) & (arr[:, :, 1] > 235) & (arr[:, :, 2] > 235) & (arr[:, :, 3] > 0)
    for y in range(*EYE_ROWS):
        xs = np.where(white[y])[0]
        if len(xs) == 0:
            continue
        x0, x1 = xs.min(), xs.max()
        seg = arr[y, x0:x1 + 1]
        notwhite = (seg[:, 0] < 235) | (seg[:, 1] < 235) | (seg[:, 2] < 235)   # 글자의 흐린 가장자리까지 전부
        seg[notwhite] = WHITE
    im.paste(Image.fromarray(arr))


def main() -> None:
    im = Image.open(SRC).convert('RGBA')
    clear_eye_plate(im)
    d = ImageDraw.Draw(im)
    # 반쯤 감긴 두 눈(가로로 납작) + 안쪽 흰 점(뜬 눈)
    for x0 in (121, 139):
        d.rectangle([x0, 45, x0 + 8, 48], fill=BLACK)
    d.rectangle([127, 46, 128, 47], fill=WHITE); d.rectangle([140, 46, 141, 47], fill=WHITE)
    # 화난 눈썹: 바깥에서 안쪽으로 내려온다
    d.line([(118, 37), (130, 42)], fill=BLACK, width=3)
    d.line([(150, 37), (138, 42)], fill=BLACK, width=3)
    # 입: 씩 웃던 입을 살색으로 덮고 일자(살짝 처진) 입
    arr = np.array(im)
    x0, y0, x1, y1 = MOUTH_BOX
    box = arr[y0:y1, x0:x1]
    notskin = (np.abs(box[:, :, 0].astype(int) - SKIN[0]) > 12) | (np.abs(box[:, :, 1].astype(int) - SKIN[1]) > 12) | (np.abs(box[:, :, 2].astype(int) - SKIN[2]) > 12)
    box[notskin] = SKIN
    im.paste(Image.fromarray(arr))
    d = ImageDraw.Draw(im)
    d.rectangle([129, 68, 145, 69], fill=BLACK)
    d.rectangle([129, 70, 130, 70], fill=BLACK); d.rectangle([144, 70, 145, 70], fill=BLACK)
    OUT_ILL.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT_ILL)
    # 초상: 머리 부분(95,15)~(175,95) 를 96×96 으로 확대한 뒤 어두운 픽셀만 검정, 나머지 흰색
    head = im.crop((88, 2, 182, 96)).resize((96, 96), Image.NEAREST)
    h = np.array(head)
    # 검은 윤곽·글자(아주 어두운 픽셀)와 빨간 볼·입만 검정 — 파란 TV 배경·살색·머리카락은 흰색(다른 초상과 같은 선화 느낌)
    mx = h[:, :, :3].max(axis=2).astype(int)
    dark = ((mx < 70) | ((h[:, :, 0] > 180) & (h[:, :, 1] < 80) & (h[:, :, 2] < 80))) & (h[:, :, 3] > 0)
    out = np.full((96, 96, 4), 255, dtype=np.uint8)
    out[dark] = BLACK
    Image.fromarray(out).save(OUT_POR)
    print('wrote', OUT_ILL, OUT_POR)


if __name__ == '__main__':
    main()
