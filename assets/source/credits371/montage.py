# usage: montage.py out.png box cols file[:label] ...
import sys
from PIL import Image, ImageDraw
out, box, cols = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = sys.argv[4:]
rows = (len(items) + cols - 1) // cols
W = Image.new('RGB', (cols * box, rows * (box + 16)), 'white')
d = ImageDraw.Draw(W)
for i, it in enumerate(items):
    f, _, lab = it.partition(':')
    im = Image.open(f).convert('RGBA')
    s = min(box / im.width, box / im.height)
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST)
    x, y = (i % cols) * box, (i // cols) * (box + 16)
    W.paste(im, (x + (box - im.width) // 2, y + (box - im.height) // 2), im)
    d.text((x + 4, y + box + 2), lab or f.split('/')[-1], fill='black')
W.save(out)
