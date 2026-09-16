#!/usr/bin/env python3
"""OpenGateway gpt-image-2 raw(마젠타 배경 격자) → 게임 시트: 색키 → 셀별 bbox → 시트당 배율 하나로 NEAREST 축소 → 발(밑변) 기준 정렬.
   사용: /usr/bin/python3 assets/source/youngcle-hover-battle-v1/export.py <raw> <cols> <rows> <cell> <fit> <out> [feet_y]
   raw 셀은 폭/cols × 높이/rows. fit = 셀 높이 대비 몸 최대 비율. feet_y 는 출력 셀 안 발 밑변(기본 cell-6).
   프레임별 fit 금지(시트당 하나의 배율) — docs/development/sprite-production.md."""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image

raw, cols, rows, cell, fit, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
feet_y = int(sys.argv[7]) if len(sys.argv) > 7 else cell - 6
KEEP_ALL = (sys.argv[8] if len(sys.argv) > 8 else 'all') == 'all'   # all: 떨어진 번개 조각도 유지(영클) / largest: 가장 큰 성분만(나람)
im = np.array(Image.open(raw).convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)                 # 순수 마젠타 + 그 근처
alpha = np.where(key, 0, 255).astype(np.uint8)
# 경계 잔여(마젠타 섞인 픽셀): 알파 있는 픽셀 중 마젠타 기운(R,B 가 G 보다 훨씬 큼)은 채도를 낮춘다
fringe = (~key) & (r > g + 60) & (b > g + 60)
im[fringe, 0] = im[fringe, 1]; im[fringe, 2] = im[fringe, 1]
rgba = np.dstack([im[:, :, :3].astype(np.uint8), alpha])
H, W = alpha.shape; cw, ch = W // cols, H // rows
from collections import deque
def components(a):
    """셀 알파의 연결 성분 목록 [(픽셀 인덱스 배열, bbox)]"""
    seen = np.zeros_like(a, dtype=bool); out = []
    for y0 in range(a.shape[0]):
        for x0 in range(a.shape[1]):
            if a[y0, x0] == 0 or seen[y0, x0]: continue
            q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
            while q:
                y, x = q.popleft(); pts.append((y, x))
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < a.shape[0] and 0 <= nx < a.shape[1] and a[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
            ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
            out.append((pts, (min(xs), min(ys), max(xs) + 1, max(ys) + 1)))
    return out
# 생성 격자에서 윗줄 발이 셀 아랫변에 닿아 아랫줄 셀 위에 조각으로 떨어진 경우(나람 옆모습): 아랫줄 셀 위쪽에 붙은 작은 성분(높이 < 40)을 윗줄 셀로 되돌린다
fixed = rgba.copy(); fixed_alpha = alpha.copy()
for rr in range(rows - 1):
    for cc in range(cols):
        a_below = alpha[(rr + 1) * ch:(rr + 2) * ch, cc * cw:(cc + 1) * cw]
        for pts, (bx0, by0, bx1, by1) in components(a_below):
            if by0 == 0 and by1 - by0 < 40:
                for y, x in pts:
                    fixed[rr * ch + ch + y, cc * cw + x] = rgba[(rr + 1) * ch + y, cc * cw + x] if False else fixed[rr * ch + ch + y, cc * cw + x]
                # 조각을 윗줄 셀의 '아래로 확장된 영역'으로 취급: 윗줄 셀 잘라낼 때 ch+40 까지 보되, 아랫줄 셀에서는 지운다
                for y, x in pts: fixed_alpha[(rr + 1) * ch + y, cc * cw + x] = 0
                for y, x in pts: fixed_alpha[(rr + 1) * ch + y, cc * cw + x] = 0
cells, meta, crops = [], [], []
for rr in range(rows):
    for cc in range(cols):
        ext = 40 if rr < rows - 1 else 0
        a_full = alpha[rr * ch:(rr + 1) * ch + ext, cc * cw:(cc + 1) * cw].copy()
        # 아랫줄 본체는 제외(조각만 남긴다): 확장 구간에서는 원본 알파 중 되돌린 조각만
        if ext: a_full[ch:] = np.where(fixed_alpha[(rr + 1) * ch:(rr + 1) * ch + ext, cc * cw:(cc + 1) * cw] == 0, alpha[(rr + 1) * ch:(rr + 1) * ch + ext, cc * cw:(cc + 1) * cw], 0)
        if rr > 0: a_full[:ch] = fixed_alpha[rr * ch:(rr + 1) * ch, cc * cw:(cc + 1) * cw]
        comps = components(a_full)
        if not comps: cells.append(None); meta.append(None); crops.append(None); continue
        keep = comps if KEEP_ALL else [max(comps, key=lambda c: len(c[0]))]
        mask = np.zeros_like(a_full)
        for pts, _ in keep:
            for y, x in pts: mask[y, x] = 255
        ys, xs = np.where(mask > 0)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        touch = box[0] == 0 or box[1] == 0 or box[2] == cw or box[3] == ch + ext
        cells.append(box); meta.append({'bbox': box, 'edge_touch': touch, 'components': len(comps)})
        crop_rgba = rgba[rr * ch:(rr + 1) * ch + ext, cc * cw:(cc + 1) * cw].copy(); crop_rgba[:, :, 3] = mask
        crops.append(crop_rgba)
boxes = [c for c in cells if c]
max_h = max(bx[3] - bx[1] for bx in boxes); max_w = max(bx[2] - bx[0] for bx in boxes)
scale = min(cell * fit / max_h, cell * 0.95 / max_w)                            # 시트당 하나
sheet = Image.new('RGBA', (cell * cols, cell * rows), (0, 0, 0, 0))
for i, box in enumerate(cells):
    if not box: continue
    rr, cc = divmod(i, cols)
    x0, y0, x1, y1 = box
    crop = Image.fromarray(crops[i][y0:y1, x0:x1], 'RGBA')
    nw, nh = max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale))
    small = crop.resize((nw, nh), Image.NEAREST)
    sa = np.array(small); sa[:, :, 3] = np.where(sa[:, :, 3] >= 128, 255, 0); small = Image.fromarray(sa, 'RGBA')   # 이진 알파
    # 가로는 bbox 가운데를 셀 가운데에, 세로는 밑변을 feet_y 에
    cx = (x0 + x1) / 2 * scale; px = int(round(cell / 2 - cx + x0 * scale)); py = feet_y - nh
    sheet.paste(small, (cc * cell + px, rr * cell + py), small)
    meta[i].update({'scaled': [nw, nh], 'paste': [px, py]})
Path(out).parent.mkdir(parents=True, exist_ok=True); sheet.save(out)
json.dump({'raw': raw, 'cols': cols, 'rows': rows, 'cell': cell, 'fit': fit, 'scale': scale, 'feet_y': feet_y, 'cells': meta, 'sampling': 'NEAREST, one scale per sheet, binary alpha >=128'}, open(Path(out).with_suffix('.export-meta.json') if out.startswith('assets/source') else Path(raw).parent / 'export-meta.json', 'w'), indent=1)
print('wrote', out, sheet.size, 'scale', round(scale, 4), 'edge_touch', [m['edge_touch'] for m in meta if m])
