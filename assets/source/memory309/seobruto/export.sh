#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
uv run --with pillow --with numpy python - <<'PY'
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageChops

base = Path('assets/source/memory309/seobruto')
raw = Image.open(base / 'raw-sheet.png').convert('RGBA')
a = np.array(raw)
a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
a[a[:, :, 3] == 0, :3] = 0
clean = Image.fromarray(a)
clean.save(base / 'raw-binary-alpha.png')
meta = json.loads((base / 'processed/pipeline-meta.json').read_text())
sources = [clean.crop(info['source_box']) for info in meta['frames']]
scale = 100 / max(frame.getbbox()[3] - frame.getbbox()[1] for frame in sources)
sheet = Image.new('RGBA', (256, 256))
metrics = []
frames = []
for index, source in enumerate(sources):
    bounds = source.getbbox()
    x0, y0, x1, y1 = bounds
    _, foot_x = np.nonzero(np.array(source)[:, :, 3][y1 - 45:y1] > 0)
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
    arr = np.array(frame)
    assert set(np.unique(arr[:, :, 3])) == {0, 255}
    magenta = int(np.sum((arr[:, :, 0] > 200) & (arr[:, :, 1] < 80) & (arr[:, :, 2] > 200) & (arr[:, :, 3] > 0)))
    assert magenta == 0
    bbox = frame.getbbox()
    metrics.append({'index': index, 'bbox': list(bbox), 'alpha_height': bbox[3]-bbox[1], 'foot_baseline_exclusive': bbox[3], 'source_bbox': list(bounds), 'scale': scale, 'paste': [left, top], 'magenta_pixels': magenta, 'edge_touch': False})
sheet.save('assets/enemies/seobruto-battle.png')
frames[0].save('assets/enemies/seobruto-front.png')
assert ImageChops.difference(sheet.crop((0,0,128,128)), frames[0]).getbbox() is None
preview = Image.new('RGBA', (256,256), '#302838')
preview.alpha_composite(sheet)
preview.resize((768,768), Image.Resampling.NEAREST).save(base / 'preview.png')
before = Image.open(base / 'references/seobruto-battle308.png').convert('RGBA')
silhouette_iou=[]
for index, frame in enumerate(frames):
    col,row=index%2,index//2
    old=np.array(before.crop((col*128,row*128,(col+1)*128,(row+1)*128)))[:,:,3]>0
    new=np.array(frame)[:,:,3]>0
    silhouette_iou.append(float(np.sum(old & new)/np.sum(old | new)))
comparison = Image.new('RGBA', (512,256), '#302838')
comparison.alpha_composite(before)
comparison.alpha_composite(sheet, (256,0))
comparison.resize((1024,512), Image.Resampling.NEAREST).save(base / 'before-after.png')
animation=[]
for frame in frames:
    bg=Image.new('RGBA', (128,128), '#302838')
    bg.alpha_composite(frame)
    animation.append(bg.convert('RGB').resize((384,384), Image.Resampling.NEAREST))
animation[0].save(base/'animation.gif', save_all=True, append_images=animation[1:], duration=[280,240,160,240], loop=0, disposal=2)
qc={'sheet_size':[256,256], 'cell_size':[128,128], 'pivot':[64,120], 'frame_order':['neutral','gather','release','recovery'], 'durations_ms':[280,240,160,240], 'loop':False, 'return_to':0, 'front_equals_frame0':True, 'resampling':'NEAREST', 'common_scale':scale, 'alpha_values':[0,255], 'frames':metrics, 'processor_qc':meta['qc_summary'], 'tool':'built-in image_gen', 'calls':1, 'backend':'unknown', 'cost':'unknown', 'source_lineage':'memory308/seobruto', 'identity_reference_sha256':hashlib.sha256((base/'references/seobruto-battle308.png').read_bytes()).hexdigest(), 'raw_sha256':hashlib.sha256((base/'raw-sheet.png').read_bytes()).hexdigest()}
qc['silhouette_iou_against_308']=silhouette_iou
(base/'qc.json').write_text(json.dumps(qc, indent=2)+'\n')
print(json.dumps(qc,indent=2))
PY
