#!/bin/sh
set -eu
cd "$(dirname "$0")/../../../.."
uv run --with pillow==12.3.0 python - <<'PY'
import hashlib
import json
from pathlib import Path
from PIL import Image

folder = Path('assets/source/boulder316/props')
source = folder / 'rock-raw.png'
with Image.open(source) as check:
    check.verify()
with Image.open(source) as raw:
    image = raw.convert('RGBA')
image.putalpha(image.getchannel('A').point([0 if value < 128 else 255 for value in range(256)]))
image.save(folder / 'rock-alpha-clean.png')
bounds = image.getbbox()
assert bounds is not None
body = image.crop(bounds)
scale = 220 / max(body.size)
body = body.resize(tuple(round(size * scale) for size in body.size), Image.Resampling.NEAREST)
final = Image.new('RGBA', (256, 256))
offset = ((256 - body.width) // 2, (256 - body.height) // 2)
final.alpha_composite(body, offset)
output = Path('assets/props/castle-boulder316.png')
final.save(output)
final.resize((768, 768), Image.Resampling.NEAREST).save(folder / 'rock-preview-3x.png')
alpha = final.getchannel('A')
assert set(alpha.get_flattened_data()) == {0, 255}
assert all(value == 0 for value in alpha.crop((0, 0, 256, 1)).get_flattened_data())
assert all(value == 0 for value in alpha.crop((0, 255, 256, 256)).get_flattened_data())
metadata = {'output': str(output), 'canvas': final.size, 'pivot': [128, 128],
            'alphaBbox': final.getbbox(), 'sourceBbox': bounds, 'bodySize': body.size,
            'scale': scale, 'resample': 'NEAREST', 'alpha': 'binary0/255',
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
(folder / 'rock-qc.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
PY
