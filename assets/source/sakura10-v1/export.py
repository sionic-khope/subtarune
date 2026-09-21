#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
"""벚꽃 숲 10 절벽 오르막 소품(BUILD283): cliff_ramp-raw.png(gpt-image, 마젠타 배경) → 색키 → 잘라 → 비탈 오름 높이가 RISE px 가 되게 NEAREST 축소 → assets/props/sakura_cliff_ramp.png
   + ramp-contract.json(비탈 시작점(오른쪽 낮은 끝)·꼭대기(왼쪽) 픽셀 자리 — 맵 생성기가 소품 자리와 finale.ramp/rise 를 여기서 읽는다). 사용: /usr/bin/python3 assets/source/sakura10-v1/export.py"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent; A = ROOT.parent.parent
RISE = 80   # 비탈 오름 높이(px, 게임 화면 기준)
im = np.array(Image.open(ROOT / 'cliff_ramp-raw.png').convert('RGBA')).astype(int)
r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
key = (r > 190) & (b > 190) & (g < 130)
alpha = np.where(key, 0, 255).astype(np.uint8)
full = Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), alpha]))
box = full.getbbox(); fig = full.crop(box)
a = np.array(fig)[:, :, 3] > 0
W, H = fig.size
# 표면 윤곽: 열마다 맨 위 불투명 픽셀. 오른쪽 낮은 끝(평평한 턱)과 왼쪽 꼭대기(가장 높은 열)
top = np.array([np.argmax(a[:, x]) if a[:, x].any() else H for x in range(W)])
top_x = int(np.argmin(top)); top_y = int(top[top_x])
low_y = int(np.max(top[int(W * 0.75):]))                               # 오른쪽 구간의 가장 낮은 표면 = 턱 높이
rising = [x for x in range(W) if top[x] < low_y - 2]
start_x = max(rising); start_y = int(top[start_x])                      # 비탈이 턱에서 오르기 시작하는 열
scale = RISE / (start_y - top_y)
w, h = max(1, round(W * scale)), max(1, round(H * scale))
small = fig.resize((w, h), Image.NEAREST); sa = np.array(small); sa[:, :, 3] = np.where(sa[:, :, 3] >= 128, 255, 0)
out = Image.fromarray(sa); out.save(A / 'props' / 'sakura_cliff_ramp.png')
contract = {'file': 'assets/props/sakura_cliff_ramp.png', 'size': [w, h], 'scale': round(scale, 4),
            'slope_start': [round(start_x * scale), round(start_y * scale)], 'slope_top': [round(top_x * scale), round(top_y * scale)],
            'raw': {'size': [W, H], 'slope_start': [start_x, start_y], 'slope_top': [top_x, top_y], 'lip_y': low_y}}
(ROOT / 'ramp-contract.json').write_text(json.dumps(contract, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(json.dumps(contract, ensure_ascii=False))
