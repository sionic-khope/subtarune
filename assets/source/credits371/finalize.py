# Resize chosen raws to 400x600 finals and build the all.png contact sheet.
from PIL import Image
import os
D = 'assets/source/credits371'
CHOSEN = {'01': '', '02': '', '03': 'b', '04': '', '05': '', '06': 'f', '07': '', '08': '', '09': '', '10': '', '11': ''}
finals = []
for nn, v in CHOSEN.items():
    im = Image.open(f'{D}/photo{nn}-raw{v}.png').convert('RGB').resize((400, 600), Image.LANCZOS)
    out = f'assets/credits/photo{nn}.png'
    im.save(out, optimize=True)
    if os.path.getsize(out) > 600_000:
        im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(out, optimize=True)
    print(out, os.path.getsize(out))
    finals.append(im)
sheet = Image.new('RGB', (6 * 400 + 7 * 10, 2 * 600 + 3 * 10), 'white')
for i, im in enumerate(finals):
    sheet.paste(im, (10 + (i % 6) * 410, 10 + (i // 6) * 610))
sheet.save(f'{D}/all.png', optimize=True)
