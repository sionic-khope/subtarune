#!/bin/sh
set -eu
cd "$(dirname "$0")/../../../.."
uv run --with pillow==12.3.0 python - <<'PY'
import hashlib
import json
from pathlib import Path
from PIL import Image

folder = Path('assets/source/boulder316/props')
source = folder / 'wall-raw.png'
with Image.open(source) as check:
    check.verify()
with Image.open(source) as raw:
    image = raw.convert('RGBA')
image.putalpha(image.getchannel('A').point([0 if value < 128 else 255 for value in range(256)]))
image.save(folder / 'wall-alpha-clean.png')
bounds = image.getbbox()
assert bounds is not None
scale = 220 / 906
crop = image.crop(bounds)
crop = crop.resize(tuple(round(size * scale) for size in crop.size), Image.Resampling.NEAREST)
offset = (34, 34)
final = Image.new('RGBA', (384, 320))
final.alpha_composite(crop, offset)
output = Path('assets/props/castle-boulder-wall316.png')
final.save(output)
final.resize((1152, 960), Image.Resampling.NEAREST).save(folder / 'wall-preview-3x.png')
alpha = final.getchannel('A')
assert set(alpha.get_flattened_data()) == {0, 255}
final_bounds = final.getbbox()
assert final_bounds is not None
assert final_bounds[0] > 0 and final_bounds[1] > 0 and final_bounds[2] < 384 and final_bounds[3] < 320
metadata = {'output': str(output), 'canvas': final.size, 'rockCenter': [144, 176],
            'wallContactPlaneX': 224, 'approximateRockSize': [220, 217],
            'alphaBbox': final_bounds, 'sourceBbox': bounds, 'scale': scale,
            'resample': 'NEAREST', 'alpha': 'binary0/255',
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
(folder / 'wall-qc.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
PY
