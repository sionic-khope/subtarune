#!/bin/sh
set -eu
root=assets/source/cats149
processor=assets/source/lounge148/park-guardian/process-nearest.py
for name in seopnyang gyeongnyang; do
  for mode in front idle; do
    cell=64; count=2; fit=0.875; edge=150
    if [ "$mode" = front ]; then cell=48; count=1; fit=0.833333; fi
    if [ "$name-$mode" = seopnyang-idle ]; then edge=230; fi
    uv run --with numpy --with pillow python "$processor" process \
      --input "$root/$name-$mode-raw.png" --target creature --mode idle \
      --rows "$count" --cols "$count" --output-dir "$root/$name-$mode" \
      --cell-size "$cell" --fit-scale "$fit" --align feet \
      --scale-strategy preserve --shared-scale --component-mode largest \
      --strict-qc --duration 180 --edge-threshold "$edge" \
      --prompt-file "$root/$name-$mode-prompt.txt"
  done
done
uv run --with pillow python - <<'PY'
from pathlib import Path
from PIL import Image
root = Path('assets/source/cats149')
for mode in ('front', 'idle'):
    folder = root / ('seopnyang-' + mode)
    paths = [folder / 'sheet-transparent.png', *folder.glob('idle-*.png')]
    for path in paths:
        image = Image.open(path).convert('RGBA')
        pixels = image.load()
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, a = pixels[x, y]
                if a and r > g + 35 and b > g + 35:
                    pixels[x, y] = (g, g, g, a)
        image.save(path)
for name in ('seopnyang', 'gyeongnyang'):
    frames = [Image.open(root / (name + '-idle') / ('idle-' + str(i) + '.png')) for i in range(1, 5)]
    frames[0].save(root / (name + '-idle') / 'animation.gif', save_all=True, append_images=frames[1:], duration=180, loop=0, disposal=2)
    for mode in ('front', 'idle'):
        Image.open(root / (name + '-' + mode) / 'sheet-transparent.png').save(Path('assets/enemies') / (name + '_' + mode + '.png'))
PY
