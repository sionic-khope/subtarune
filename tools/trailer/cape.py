#!/usr/bin/env python3
"""마지막 컷(사용자 2026-09-29, 참고 트레일러 50s 장면의 경섭·요플래·억빠맨 판): base + f1~f3 → 망토·머리 휘날림 반복.
위쪽 배경은 base 로 고정하고 아래(인물) 부분만 프레임마다 바꿔 끼운다(경계 60px 섞음). 결과: cape/anim_XX.png(1280x720) + cape.gif"""
from PIL import Image
D = 'assets/source/trailer408/cape/'
base = Image.open(D + 'base.png').convert('RGB')
SEAM, FEATHER = 560, 60
mask = Image.new('L', base.size, 0)
for y in range(base.height):
    v = 0 if y < SEAM else 255 if y >= SEAM + FEATHER else int(255 * (y - SEAM) / FEATHER)
    mask.paste(v, (0, y, base.width, y + 1))
frames = []
for n in ['base', 'f1', 'f2', 'f3', 'f2', 'f1']:
    f = Image.open(D + n + '.png').convert('RGB')
    frames.append(Image.composite(f, base, mask))
out = []
for i, f in enumerate(frames):
    f = f.resize((1280, 853), Image.LANCZOS).crop((0, 853 - 720, 1280, 853))
    f.save(D + f'anim_{i:02d}.png'); out.append(f)
# GIF: 두 바퀴 휘날린 뒤 오른쪽 위에서 빛이 번져 흰 화면(참고 영상 끝처럼)
from PIL import ImageDraw, ImageFilter
seq = out * 2
for i in range(10):
    k = (i + 1) / 10
    f = out[i % len(out)].copy()
    glow = Image.new('L', f.size, 0); d = ImageDraw.Draw(glow); r = int(80 + k * 1900)
    d.ellipse((1216 - r, -72 - r, 1216 + r, -72 + r), fill=255); glow = glow.filter(ImageFilter.GaussianBlur(160))
    f = Image.composite(Image.new('RGB', f.size, (255, 205, 150)), f, glow.point(lambda v: int(v * min(1, k * 1.3))))
    if k > 0.5: f = Image.blend(f, Image.new('RGB', f.size, (255, 255, 255)), (k - 0.5) * 2)
    seq.append(f)
seq += [Image.new('RGB', (1280, 720), (255, 255, 255))] * 4
g = [f.resize((640, 360), Image.LANCZOS).quantize(colors=128) for f in seq]
g[0].save(D + 'cape.gif', save_all=True, append_images=g[1:], duration=125, loop=0)
print('frames', len(out))
