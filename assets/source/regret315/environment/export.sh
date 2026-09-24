#!/bin/sh
set -eu
cd "$(dirname "$0")/../../../.."
uv run --with pillow==12.3.0 python - <<'PY'
import hashlib
import json
from pathlib import Path
from PIL import Image

source_dir = Path('assets/source/regret315/environment')
raw_path = source_dir / 'raw-backdrop.png'
final_path = Path('assets/backdrops/castle-regret-depth.png')
with Image.open(raw_path) as check:
    check.verify()
with Image.open(raw_path) as raw:
    raw.load()
    assert raw.mode == 'RGB' and raw.size == (1448, 1086)
    logical = raw.resize((480, 360), Image.Resampling.NEAREST)
    final = logical.resize((960, 720), Image.Resampling.NEAREST)
    logical.save(source_dir / 'logical-preview.png')
    final.save(final_path)

records = []
for path in (raw_path, source_dir / 'logical-preview.png', final_path):
    with Image.open(path) as check:
        check.verify()
    with Image.open(path) as img:
        img.load()
        records.append({'path': str(path), 'size': img.size, 'mode': img.mode,
                        'alpha': 'opaque RGB; no alpha channel',
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
report = {'generation_count': 1, 'provider': 'built-in image_gen',
          'model': 'unknown', 'cost': 'unknown',
          'generation_id': 'exec-c4f5291c-9655-4de9-89df-520b0d4fe1fb',
          'method': 'complete source NEAREST 1448x1086 to 480x360, then NEAREST 2x to 960x720; no cropping, painting, quantization, alpha keying or color modification',
          'backdrop_key': 'castle-regret-depth', 'records': records}
(source_dir / 'export.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
PY
