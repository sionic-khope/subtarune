# Stack images vertically on white: stack.py out.png in1.png in2.png ...
import sys
from PIL import Image
ims = [Image.open(f).convert('RGB') for f in sys.argv[2:]]
out = Image.new('RGB', (max(i.width for i in ims), sum(i.height for i in ims)), 'white')
y = 0
for i in ims:
    out.paste(i, (0, y)); y += i.height
out.save(sys.argv[1])
