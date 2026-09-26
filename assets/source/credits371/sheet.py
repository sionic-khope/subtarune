# Build a labelled reference contact sheet on white.
# usage: sheet.py out.png H item... ; item = path[@cols,rows,col,row]=label  (crop one cell of a grid sheet)
import sys
from PIL import Image, ImageDraw, ImageFont
out, H = sys.argv[1], int(sys.argv[2])
tiles = []
for it in sys.argv[3:]:
    spec, _, lab = it.partition('=')
    path, _, grid = spec.partition('@')
    im = Image.open(path).convert('RGBA')
    if grid:
        c, r, x, y = map(int, grid.split(','))
        w, h = im.width // c, im.height // r
        im = im.crop((x * w, y * h, x * w + w, y * h + h))
    px = im.load()
    for yy in range(im.height):
        for xx in range(im.width):
            r_, g_, b_, a_ = px[xx, yy]
            if r_ > 200 and b_ > 200 and g_ < 60: px[xx, yy] = (0, 0, 0, 0)
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    s = H / im.height
    if im.width * s > H * 1.6: s = H * 1.6 / im.width
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
    tiles.append((im, lab))
pad = 24
W = sum(t.width for t, _ in tiles) + pad * (len(tiles) + 1)
try: font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
except Exception: font = None
canvas = Image.new('RGB', (W, H + 70), 'white')
d = ImageDraw.Draw(canvas)
x = pad
for im, lab in tiles:
    bg = Image.new('RGB', im.size, 'white'); bg.paste(im, (0, 0), im)
    canvas.paste(bg, (x, 20 + H - im.height))
    if lab: d.text((x, H + 32), lab, fill='black', font=font)
    x += im.width + pad
canvas.save(out)
print(out, canvas.size)
