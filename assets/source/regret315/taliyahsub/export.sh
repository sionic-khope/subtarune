#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
asset_id="${1:-taliyahsub}"
export REGRET_ASSET_ID="$asset_id"
uv run --with pillow --with numpy python - <<'PY'
import os
from pathlib import Path
import numpy as np
from PIL import Image
base = Path('assets/source/regret315') / os.environ['REGRET_ASSET_ID']
array = np.array(Image.open(base / 'raw-sheet.png').convert('RGBA'))
array[:, :, 3] = np.where(array[:, :, 3] >= 128, 255, 0)
array[array[:, :, 3] == 0, :3] = 0
Image.fromarray(array).save(base / 'raw-binary-alpha.png')
PY
uv run --with pillow --with numpy python /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py process \
  --input "assets/source/regret315/$asset_id/raw-binary-alpha.png" \
  --target creature --mode combat --rows 2 --cols 2 \
  --output-dir "assets/source/regret315/$asset_id/processed" \
  --cell-size 128 --fit-scale 0.78 --align feet --shared-scale \
  --scale-strategy fit --component-mode all --trim-border 0 --edge-clean-depth 0 \
  --strict-qc --duration 180 --prompt-file "assets/source/regret315/$asset_id/prompt-used.txt"
uv run --with pillow --with numpy python - <<'PY'
import hashlib
import json
import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageChops
asset_id = os.environ['REGRET_ASSET_ID']
base = Path('assets/source/regret315') / asset_id
raw = Image.open(base / 'raw-binary-alpha.png').convert('RGBA')
meta = json.loads((base / 'processed/pipeline-meta.json').read_text())
sources = [raw.crop(info['source_box']) for info in meta['frames']]
root_extents = []
for source in sources:
    x0, y0, x1, y1 = source.getbbox()
    _, foot_x = np.nonzero(np.array(source)[:, :, 3][y1 - 45:y1] > 0)
    root_x = (float(foot_x.min()) + float(foot_x.max()) + 1) / 2
    root_extents.append(max(root_x - x0, x1 - root_x))
scale = min(100 / max(s.getbbox()[3] - s.getbbox()[1] for s in sources), 58 / max(root_extents))
sheet = Image.new('RGBA', (256, 256))
frames = []
metrics = []
for index, source in enumerate(sources):
    bounds = source.getbbox()
    x0, y0, x1, y1 = bounds
    _, foot_x = np.nonzero(np.array(source)[:, :, 3][y1 - 45:y1] > 0)
    root_x = (float(foot_x.min()) + float(foot_x.max()) + 1) / 2
    crop = source.crop(bounds)
    scaled = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.NEAREST)
    left = round(64 - (root_x - x0) * scale)
    top = 120 - scaled.height
    assert left > 0 and top > 0 and left + scaled.width < 128, (index, left, top, scaled.size)
    frame = Image.new('RGBA', (128, 128))
    frame.paste(scaled, (left, top))
    frame.save(base / f'frame-{index}.png')
    frames.append(frame)
    sheet.paste(frame, ((index % 2) * 128, (index // 2) * 128))
    array = np.array(frame)
    assert set(np.unique(array[:, :, 3])) == {0, 255}
    magenta = int(np.sum((array[:, :, 0] > 200) & (array[:, :, 1] < 80) & (array[:, :, 2] > 200) & (array[:, :, 3] > 0)))
    assert magenta == 0
    bbox = frame.getbbox()
    metrics.append({'index': index, 'bbox': list(bbox), 'alpha_height': bbox[3]-bbox[1], 'baseline_exclusive': bbox[3], 'source_bbox': list(bounds), 'scale': scale, 'paste': [left, top], 'magenta_pixels': magenta, 'edge_touch': False})
sheet.save(f'assets/enemies/{asset_id}-battle.png')
frames[0].save(f'assets/enemies/{asset_id}-front.png')
assert ImageChops.difference(sheet.crop((0, 0, 128, 128)), frames[0]).getbbox() is None
preview = Image.new('RGBA', (256, 256), '#302838')
preview.alpha_composite(sheet)
preview.resize((768, 768), Image.Resampling.NEAREST).save(base / 'preview.png')
animation = []
for frame in frames:
    bg = Image.new('RGBA', (128, 128), '#302838')
    bg.alpha_composite(frame)
    animation.append(bg.convert('RGB').resize((384, 384), Image.Resampling.NEAREST))
animation[0].save(base / 'animation.gif', save_all=True, append_images=animation[1:], duration=[400, 240, 220, 280], loop=0, disposal=2)
qc = {'sheet_size': [256, 256], 'cell_size': [128, 128], 'pivot': [64, 120], 'frame_order': ['neutral', 'windup', 'cast', 'hurt'], 'recommended_durations_ms': [400, 240, 220, 280], 'animation_is_contact_review_only': True, 'runtime_loop': False, 'return_to': 0, 'front_equals_frame0': True, 'resampling': 'NEAREST', 'common_scale': scale, 'alpha_values': [0, 255], 'frames': metrics, 'processor_qc': meta['qc_summary'], 'tool': 'built-in image_gen', 'backend': 'unknown', 'cost': 'unknown', 'raw_sha256': hashlib.sha256((base / 'raw-sheet.png').read_bytes()).hexdigest()}
(base / 'qc.json').write_text(json.dumps(qc, indent=2) + '\n')
print(json.dumps(qc, indent=2))
PY
