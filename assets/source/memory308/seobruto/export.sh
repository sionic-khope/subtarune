#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
uv run --with pillow --with numpy python - <<'PY'
import json
from pathlib import Path
import numpy as np
from PIL import Image

base = Path('assets/source/memory308/seobruto')
raw = Image.open(base / 'raw-sheet.png').convert('RGBA')
pixels = np.array(raw)
pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
pixels[pixels[:, :, 3] == 0, :3] = 0
clean = Image.fromarray(pixels)
clean.save(base / 'raw-binary-alpha.png')
meta = json.loads((base / 'processed/pipeline-meta.json').read_text())
scale = 0.2
sheet = Image.new('RGBA', (256, 256))
frames = []
metrics = []
for index, info in enumerate(meta['frames']):
    source = clean.crop(info['source_box'])
    bounds = source.getbbox()
    x0, y0, x1, y1 = bounds
    alpha = np.array(source)[:, :, 3]
    foot_y, foot_x = np.nonzero(alpha[max(y0, y1 - 45):y1] > 0)
    root_x = (float(foot_x.min()) + float(foot_x.max()) + 1) / 2
    crop = source.crop(bounds)
    scaled = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.NEAREST)
    left = round(64 - (root_x - x0) * scale)
    top = 120 - scaled.height
    assert left > 0 and top > 0 and left + scaled.width < 128
    frame = Image.new('RGBA', (128, 128))
    frame.paste(scaled, (left, top))
    frame.save(base / f'frame-{index}.png')
    frames.append(frame)
    sheet.paste(frame, ((index % 2) * 128, (index // 2) * 128))
    bbox = frame.getbbox()
    a = np.array(frame)
    assert set(np.unique(a[:, :, 3])) == {0, 255}
    magenta = int(np.sum((a[:, :, 0] > 200) & (a[:, :, 1] < 80) & (a[:, :, 2] > 200) & (a[:, :, 3] > 0)))
    assert magenta == 0
    metrics.append({'index': index, 'source_bbox': list(bounds), 'root_source_x': root_x, 'paste': [left, top], 'alpha_bbox': list(bbox), 'alpha_height': bbox[3] - bbox[1], 'opaque_pixels': int(np.sum(a[:, :, 3] > 0)), 'magenta_pixels': magenta, 'edge_touch': False, 'scale': scale})
Path('assets/enemies').mkdir(exist_ok=True)
sheet.save('assets/enemies/seobruto-battle.png')
frames[0].save('assets/enemies/seobruto-front.png')
durations = [280, 240, 160, 240]
preview = Image.new('RGB', (256, 256), '#302838')
for index, frame in enumerate(frames):
    preview.paste(frame, ((index % 2) * 128, (index // 2) * 128), frame)
preview.resize((768, 768), Image.Resampling.NEAREST).save(base / 'preview.png')
gif_frames = []
for frame in frames:
    bg = Image.new('RGBA', frame.size, '#302838')
    bg.alpha_composite(frame)
    gif_frames.append(bg.convert('RGB').resize((384, 384), Image.Resampling.NEAREST))
gif_frames[0].save(base / 'animation.gif', save_all=True, append_images=gif_frames[1:], duration=durations, loop=0, disposal=2)
party = Image.open('assets/sprites/hyungsub.png').convert('RGBA')
hero = party.crop((0, 0, party.width // 4, party.height // 4))
comparison = Image.new('RGBA', (256, 144), '#302838')
comparison.alpha_composite(hero, (20, 128 - hero.height))
comparison.alpha_composite(frames[0], (100, 8))
comparison.resize((768, 432), Image.Resampling.NEAREST).save(base / 'scale-comparison.png')
contract = {'asset': 'seobruto', 'sheet': 'assets/enemies/seobruto-battle.png', 'field_still': 'assets/enemies/seobruto-front.png', 'sheet_size': [256, 256], 'grid': [2, 2], 'cell_size': [128, 128], 'pivot': [64, 120], 'direction': 'lower-left-three-quarter', 'order': ['neutral', 'gather', 'release', 'recovery'], 'durations_ms': durations, 'playback': {'idle': [0], 'cast': [0, 1, 2, 3], 'cast_loop': False, 'return_to': 0, 'release_frame': 2}, 'common_scale': scale, 'resampling': 'NEAREST', 'alpha': 'binary threshold128 on generated alpha', 'backend': 'unknown; built-in image_gen', 'image_generation_calls': 2, 'cost': 'unknown', 'runtime_integration': 'separate owner; asset QC only', 'frames': metrics, 'processor_qc': meta['qc_summary']}
(base / 'runtime-contract.json').write_text(json.dumps(contract, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'sheet': list(sheet.size), 'frames': metrics, 'processor_qc': meta['qc_summary']}, indent=2))
PY
