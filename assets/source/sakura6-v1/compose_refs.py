# -*- coding: utf-8 -*-
"""벚꽃 숲 6 최미스 가면 시트 생성용 참조 합성(게임 자산 아님 — gpt-image 참조 한 장 규칙).
   masked-walk-ref.png = 걷기 시트 미리보기(1024) + 가면 정면 한 장(4배) / masked-seup-ref.png = 스읍 자세 두 장(4배) + 가면 정면(4배) / masked-face-ref.png = 가면 정면(4배)"""
from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
MAG = (255, 0, 255, 255)
def on_magenta(p, scale):
    im = Image.open(p).convert('RGBA'); bg = Image.new('RGBA', im.size, MAG); bg.alpha_composite(im)
    return bg.resize((im.width * scale, im.height * scale), Image.NEAREST)
def side(parts, gap=24):
    h = max(p.height for p in parts); w = sum(p.width for p in parts) + gap * (len(parts) - 1)
    out = Image.new('RGBA', (w, h), MAG); x = 0
    for p in parts:
        out.paste(p, (x, (h - p.height) // 2)); x += p.width + gap
    return out
mask = on_magenta(A / 'sprites' / 'choimis-masked.png', 4)
walk = Image.open(A / 'source' / 'choimis-walk-v1' / 'preview-4x.png').convert('RGBA')
side([walk, mask]).save(ROOT / 'masked-walk-ref.png')
seup = on_magenta(A / 'sprites' / 'choimis-seup.png', 4)
side([seup, mask]).save(ROOT / 'masked-seup-ref.png')
mask.save(ROOT / 'masked-face-ref.png')
for n in ('masked-walk-ref', 'masked-seup-ref', 'masked-face-ref'):
    p = ROOT / f'{n}.png'; print(n, Image.open(p).size, p.stat().st_size)
