#!/usr/bin/env /usr/bin/python3
"""벚꽃 소나무 4종(BUILD261 사용자 “근처 나무들도 분홍색으로 벚꽃이 전체를 덮으며 다 바뀌는거임”): sakura-raw 2×2(pines-raw 와 같은 칸·실루엣, gpt-image 편집) → 색키 → 각 칸은 **소나무 원본과 같은 bbox** 로 잘라 같은 배율(0.345) → 같은 크기의 판이 되어 맵에서 그림만 바꿔도 밑동이 그대로.
   몸통(줄기) 톤만 0.55 로 어둡게(짜장숲 어두운 소나무와 맞춤), 분홍 꽃은 그대로. 출력 assets/props/jjajang_sakura_N.png
   사용: /usr/bin/python3 assets/source/jjajang-sakura-v1/export.py"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
PINES = ROOT.parent / 'jjajang-pines-v1'
contract = json.loads((PINES / 'runtime-contract.json').read_text())
scale = contract['scale']

def keyed(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
    fringe = (~key) & (r > g + 60) & (b > g + 60) & (g < 120)      # 마젠타 번짐(분홍 꽃 #ff8ad0 은 g 138 이라 제외)
    im[fringe, 0] = im[fringe, 1]; im[fringe, 2] = im[fringe, 1]
    alpha = np.where(key, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([im[:, :, :3].astype(np.uint8), alpha]))

pine = keyed(PINES / 'pines-raw.png'); sak = keyed(ROOT / 'sakura-raw.png')
cw, ch = pine.width // 2, pine.height // 2
out_contract = {'scale': scale, 'trunkDarken': 0.55, 'trees': []}
for i in range(4):
    box = ((i % 2) * cw, (i // 2) * ch, (i % 2 + 1) * cw, (i // 2 + 1) * ch)
    bb = pine.crop(box).getbbox()                      # 소나무 칸 bbox → 같은 크기
    fig = sak.crop(box).crop(bb)
    small = fig.resize((max(1, round(fig.width * scale)), max(1, round(fig.height * scale))), Image.NEAREST)
    a = np.array(small).astype(int); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    pinkish = (a[:, :, 3] > 0) & (r > 150) & (r > g + 40)          # 분홍 꽃(밝은 분홍·짙은 분홍)
    body = (a[:, :, 3] > 0) & ~pinkish & ((r + g + b) > 90)        # 줄기·가지 몸통(검은 테두리 제외)
    for c in range(3): a[body, c] = (a[body, c] * 0.55).astype(int)
    out = Image.fromarray(a.astype(np.uint8)); dest = ROOT.parent.parent / 'props' / f'jjajang_sakura_{i + 1}.png'; out.save(dest)
    ref = contract['pines'][i]
    assert [out.width, out.height] == ref['size'], (i, out.size, ref['size'])
    out_contract['trees'].append({'file': f'assets/props/jjajang_sakura_{i + 1}.png', 'size': [out.width, out.height], 'baseX': ref['baseX'], 'pine': ref['file']})
(ROOT / 'runtime-contract.json').write_text(json.dumps(out_contract, ensure_ascii=False, indent=1) + '\n')
# 미리보기: 소나무(어두운 판) ↔ 벚꽃 나란히 2배
tiles = []
for i in range(4):
    d = Image.open(ROOT.parent.parent / 'props' / f'jjajang_pine_dark_{i + 1}.png').convert('RGBA'); s = Image.open(ROOT.parent.parent / 'props' / f'jjajang_sakura_{i + 1}.png').convert('RGBA')
    pair = Image.new('RGBA', (d.width + s.width + 8, max(d.height, s.height)), (6, 7, 7, 255)); pair.paste(d, (0, pair.height - d.height), d); pair.paste(s, (d.width + 8, pair.height - s.height), s); tiles.append(pair)
W = sum(t.width for t in tiles) + 8 * 3; H = max(t.height for t in tiles)
prev = Image.new('RGBA', (W, H), (6, 7, 7, 255)); x = 0
for t in tiles: prev.paste(t, (x, H - t.height), t); x += t.width + 8
prev.resize((W * 2, H * 2), Image.NEAREST).save(ROOT / 'preview-sakura-2x.png')
print(json.dumps(out_contract['trees']))
