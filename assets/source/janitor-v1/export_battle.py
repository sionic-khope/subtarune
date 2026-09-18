#!/usr/bin/env /usr/bin/python3
"""허약 청소부 전투 시트 포장(형섭 규격): 색키 → 셀별 bbox → NEAREST 축소 → 발 밑변 정렬.
   assets/battle/janitor.png     1536×1024: 0행 대기 4프레임(384×512 셀), 1행 공격 4프레임(384×512 셀) — raw 512 셀을 0.75 배로
   assets/battle/janitor-run.png 1536×1024: 2×2 768×512 셀 그대로(색키만)
   assets/battle/down/janitor.png 96×96: 누운 길이 81px, 하단 기준점 (48,89)
   결과 pivot 들은 battle-contract.json 에 남기고 battle-sprites.js 에 옮겨 적는다."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent.parent / 'battle'
def keyed(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
    fringe = (~key) & (r > g + 60) & (b > g + 60)
    im[fringe, 0] = im[fringe, 1]; im[fringe, 2] = im[fringe, 1]
    alpha = np.where(key, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), alpha]))
def cells(img, cols, rows):
    cw, ch = img.width // cols, img.height // rows
    return [img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(rows) for c in range(cols)]
def binarize(img):
    a = np.array(img); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); return Image.fromarray(a)
contract = {}
# 대기·공격: 512 셀 → 0.75 배(384×384) → 384×512 셀 바닥에 발을 맞춘다
sheet = Image.new('RGBA', (1536, 1024))
def pack(raw, row, key):
    frames = []
    for i, cell in enumerate(cells(keyed(raw), 2, 2)):
        bb = cell.getbbox(); fig = cell.crop(bb)
        fig = binarize(fig.resize((max(1, round(fig.width * 0.75)), max(1, round(fig.height * 0.75))), Image.NEAREST))
        x0, y0 = i * 384 + (384 - fig.width) // 2, 512 * row + 500 - fig.height
        sheet.paste(fig, (x0, y0), fig)
        frames.append({'rect': [i * 384, 512 * row, 384, 512], 'pivot': [x0 - i * 384 + fig.width // 2, 500 - 512 * row + 512 * row], 'figure': [fig.width, fig.height]})
    contract[key] = frames
pack(ROOT / 'battle-idle-raw.png', 0, 'idle')
pack(ROOT / 'battle-attack-raw.png', 1, 'attack')
sheet.save(OUT / 'janitor.png')
# 달리기: 색키만, 셀 768×512 그대로. pivot = 셀 안 발 밑변 중앙
run = binarize(keyed(ROOT / 'battle-run-raw.png')); run.save(OUT / 'janitor-run.png')
run_frames = []
for i, cell in enumerate(cells(run, 2, 2)):
    bb = cell.getbbox(); run_frames.append({'pivot': [(bb[0] + bb[2]) // 2, bb[3]], 'figure': [bb[2] - bb[0], bb[3] - bb[1]]})
contract['run'] = run_frames
idle_h = np.mean([f['figure'][1] for f in contract['idle']]); run_h = np.mean([f['figure'][1] for f in run_frames])
contract['scale'] = 0.25; contract['runScale'] = round(0.25 * idle_h / run_h, 4)
# 쓰러짐: 누운 길이 81px, 96×96, 하단 기준점 (48,89)
down = keyed(ROOT / 'battle-down-raw.png'); bb = down.getbbox(); fig = down.crop(bb)
s = 81 / fig.width; fig = binarize(fig.resize((81, max(1, round(fig.height * s))), Image.NEAREST))
canvas = Image.new('RGBA', (96, 96)); canvas.paste(fig, (48 - fig.width // 2, 89 - fig.height), fig); canvas.save(OUT / 'down' / 'janitor.png')
contract['down'] = {'size': [96, 96], 'pivot': [48, 89], 'figure': [fig.width, fig.height]}
(ROOT / 'battle-contract.json').write_text(json.dumps(contract, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({k: (v if k in ('scale', 'runScale', 'down') else [f['pivot'] for f in v]) for k, v in contract.items()}))
