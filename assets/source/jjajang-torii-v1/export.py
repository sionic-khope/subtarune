#!/usr/bin/env /usr/bin/python3
"""토리이 raw(마젠타 배경 1024) → 게임 소품 두 조각(깊이 정렬용): 색키 → 전체 bbox → 시트당 배율 하나로 NEAREST 축소 → 이진 알파.
   back  = 먼 기둥(오른쪽 위) 기둥대(대들보 아래 부분)만 — 길 위 캐릭터가 이 앞에 선다
   front = 나머지(대들보·가까운 기둥) — 길 위 캐릭터 위에 그려진다(문 아래를 지나는 느낌)
   사용: /usr/bin/python3 assets/source/jjajang-torii-v1/export.py [scale]"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
scale = float(sys.argv[1]) if len(sys.argv) > 1 else 0.3
im = np.array(Image.open(ROOT / 'torii-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
alpha = np.where(key, 0, 255)
fringe = (~key) & (r > g + 60) & (b > g + 60)
im[fringe, 0] = im[fringe, 1]; im[fringe, 2] = im[fringe, 1]
ys, xs = np.nonzero(alpha)
x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
# 기둥 밑동: 아래쪽 검은 받침의 바닥 — 왼쪽 절반 최저점 = 가까운 기둥, 오른쪽 절반 최저점 = 먼 기둥
mid = (x0 + x1) // 2
def base(cols):
    sub = alpha[:, cols[0]:cols[1]]; yy, xx = np.nonzero(sub); yb = yy.max()
    row = np.nonzero(sub[yb])[0]; return (cols[0] + (row.min() + row.max()) / 2, yb + 1)
near = base((x0, mid)); far = base((mid, x1))
# 먼 기둥 열 범위: 기둥대(밑동 200px 위 줄)와 검은 받침(밑동 60px 위 줄)의 알파 구간을 합친다(받침이 기둥대보다 넓다)
def span(yy):
    cols = np.nonzero(alpha[yy, mid:x1])[0] + mid; return cols.min(), cols.max() + 1
sx0, sx1 = span(int(far[1]) - 200); bx0, bx1 = span(int(far[1]) - 60)
fx0, fx1 = min(sx0, bx0) - 2, max(sx1, bx1) + 2
# 대들보 아래 경계: 기둥 주변 ±80px 창에서 위로 올라가며 폭이 기둥대 폭의 1.6배를 넘는 첫 줄(대들보) 바로 아래
shaft_w = sx1 - sx0; cut_y = int(far[1]) - 200
for yy in range(int(far[1]) - 200, y0, -1):
    row = np.nonzero(alpha[yy, fx0 - 80:fx1 + 80])[0]
    if row.size and (row.max() - row.min()) > shaft_w * 1.6: cut_y = yy + 1; break
rgba = np.dstack([im[:, :, :3].astype(np.uint8), alpha.astype(np.uint8)])
back = rgba.copy(); front = rgba.copy()
mask = np.zeros(alpha.shape, dtype=bool); mask[cut_y:int(far[1]) + 1, fx0:fx1] = True
back[~mask, 3] = 0; front[mask, 3] = 0
def out(arr, name, tight=False):
    """tight: 조각을 자기 bbox 로 잘라 저장하고(레이아웃 감사: 그림 밑변 ≤ 히트박스 밑변) 전체 캔버스 기준 오프셋을 돌려준다"""
    img = Image.fromarray(arr).crop((x0, y0, x1, y1))
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    small = img.resize((w, h), Image.NEAREST); sa = np.array(small); sa[:, :, 3] = np.where(sa[:, :, 3] >= 128, 255, 0)
    small = Image.fromarray(sa); offset = (0, 0)
    if tight:
        bb = small.getbbox(); small = small.crop(bb); offset = (bb[0], bb[1])
    small.save(ROOT.parent.parent / 'props' / name); return (w, h), offset
size, _ = out(front, 'jjajang_torii_front.png'); back_size, back_offset = out(back, 'jjajang_torii_back.png', tight=True)
contract = {'scale': scale, 'size': size, 'backOffset': list(back_offset), 'backSize': list(back_size), 'rawBbox': [int(x0), int(y0), int(x1), int(y1)], 'cutY': int(cut_y), 'farShaftCols': [int(fx0), int(fx1)],
            'nearBase': [round((near[0] - x0) * scale, 1), round((near[1] - y0) * scale, 1)], 'farBase': [round((far[0] - x0) * scale, 1), round((far[1] - y0) * scale, 1)],
            'note': 'nearBase/farBase = 축소 이미지 안 기둥 밑동 바닥 중앙(px). 맵 생성기가 ix/iy = 원하는 밑동 위치 - 이 값으로 놓는다'}
(ROOT / 'runtime-contract.json').write_text(json.dumps(contract, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(contract, ensure_ascii=False))
