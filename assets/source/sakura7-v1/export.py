#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""벚꽃 숲 7(BUILD278) 자산 내보내기 — gpt-image-2.5-sunburst 원본(마젠타 배경) → 색키·연결 성분·축소·자르기만(PIL).
   jeomnye-walk-raw.png(4×4, 행 down/up/left/right — 참조가 가순이1 런타임 시트라 이미 게임 순서) → assets/sprites/jeomnye.png(512×512, 128 칸, 발 y=120, 정면 키 = 가순이1) + assets/portraits/jeomnye.png(96)
   stage-raw.png(1536×1024) → assets/props/wedding_stage.png(폭 384)   throwables-raw.png(2×2) → assets/props/throw_{tomato,egg,paper,apple}.png(폭 14~16)
   사용: /usr/bin/python3 assets/source/sakura7-v1/export.py"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
CELL = 128; FEET = 120

def keyed(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    key = (r > 190) & (b > 190) & (g < 130)
    alpha = np.where(key, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), alpha]))

def components(mask):
    h, w = mask.shape; seen = np.zeros_like(mask, dtype=bool); out = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]; seen[sy, sx] = True; pts = []
            while stack:
                y, x = stack.pop(); pts.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; stack.append((ny, nx))
            ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
            out.append((len(pts), min(xs), min(ys), max(xs) + 1, max(ys) + 1, pts))
    return sorted(out, key=lambda c: -c[0])

def figure(img, box):
    cell = img.crop(box); a = np.array(cell); mask = a[:, :, 3] > 0
    comps = components(mask); main = comps[0]
    keep = [c for c in comps if c is main or (c[0] >= main[0] * 0.01 and c[2] < main[4])]
    keepmask = np.zeros_like(mask)
    for c in keep:
        for y, x in c[5]:
            keepmask[y, x] = True
    a[:, :, 3] = np.where(keepmask, a[:, :, 3], 0)
    x0, y0 = min(c[1] for c in keep), min(c[2] for c in keep); x1, y1 = max(c[3] for c in keep), max(c[4] for c in keep)
    return Image.fromarray(a).crop((x0, y0, x1, y1)), main[4] - y0

def place(figpair, scale):
    fig, feet = figpair
    w, h = max(1, round(fig.width * scale)), max(1, round(fig.height * scale))
    small = fig.resize((w, h), Image.NEAREST)
    a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); small = Image.fromarray(a)
    frame = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    frame.paste(small, (CELL // 2 - w // 2, FEET - round(feet * scale))); return frame

def shrink(fig, width):
    s = width / fig.width; w, h = max(1, round(fig.width * s)), max(1, round(fig.height * s))
    small = fig.resize((w, h), Image.NEAREST); a = np.array(small); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(a)

report = {}
# 1) 점례 걷기 시트: 가순이1 정면 0번 칸 키 기준
ref = Image.open(A / 'sprites' / 'gasuni1.png').convert('RGBA').crop((0, 0, 128, 128)); rb = ref.getbbox(); target_h = rb[3] - rb[1]
raw = keyed(ROOT / 'jeomnye-walk-raw.png'); n = raw.width // 4
figs = [[figure(raw, (c * n, r * n, (c + 1) * n, (r + 1) * n)) for c in range(4)] for r in range(4)]
scale = target_h / figs[0][0][1]
sheet = Image.new('RGBA', (512, 512), (0, 0, 0, 0)); heights = []
for r in range(4):
    for c in range(4):
        fr = place(figs[r][c], scale); sheet.paste(fr, (c * CELL, r * CELL)); bb = fr.getbbox(); heights.append(bb[3] - bb[1])
sheet.save(A / 'sprites' / 'jeomnye.png')
face = sheet.crop((0, 0, 128, 128)); top = face.getbbox()[1]
face.crop((34, top - 2, 96, top + 60)).resize((96, 96), Image.NEAREST).save(A / 'portraits' / 'jeomnye.png')   # 사쿠라5 초상화와 같은 자르기
report['jeomnye'] = {'reference_stand_height': target_h, 'scale': round(scale, 4), 'frame_heights': heights}
# 2) 결혼식 무대 소품(폭 384)
st = keyed(ROOT / 'stage-raw.png'); fig, feet = figure(st, (0, 0, st.width, st.height))
stage = shrink(fig, 384); stage.save(A / 'props' / 'wedding_stage.png')
# 바닥(판자 윗면)·앞면 높이: 원본에서 판자 윗면 시작·끝 행을 색으로 잰다(갈색 판자 = r>120,g<110,b<80 가 폭의 절반 넘게 이어지는 첫/마지막 행)
a = np.array(fig); brown = (a[:, :, 3] > 0) & (a[:, :, 0] > 120) & (a[:, :, 1] < 120) & (a[:, :, 2] < 90)
rows_b = np.where(brown.sum(axis=1) > fig.width * 0.5)[0]
s = 384 / fig.width
report['stage'] = {'size': list(stage.size), 'scale': round(s, 4), 'plank_top': int(rows_b[0] * s), 'plank_bottom_incl_skirt': int(rows_b[-1] * s)}
# 3) 던지는 것들(폭 14~16)
th = keyed(ROOT / 'throwables-raw.png'); h = th.width // 2
for name, (c, r), width in (('tomato', (0, 0), 16), ('egg', (1, 0), 12), ('paper', (0, 1), 15), ('apple', (1, 1), 13)):
    fig = figure(th, (c * h, r * h, (c + 1) * h, (r + 1) * h))[0]
    out = shrink(fig, width); out.save(A / 'props' / f'throw_{name}.png'); report[f'throw_{name}'] = list(out.size)
(ROOT / 'runtime-contract.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
