#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD399 출발 부스터(boost-raw.png, gpt-image-2.5-sunburst, 사용자 참고 그림) → assets/fx/dash-boost.png
4칸 띠, 칸마다 부스터 뿌리(오른쪽 가운데)를 칸 오른쪽 가운데에 맞춘다. 마젠타 키, 도트 격자(4px)를 1px 로 접는다."""
import numpy as np
from PIL import Image
im = np.array(Image.open('assets/source/boost398/boost-raw.png').convert('RGB')).astype(int)
H, W, _ = im.shape
# 부스터는 검정·회색뿐 — 채도 있는 픽셀(마젠타 바탕과 그 테두리)은 모두 지운다
key = (np.abs(im[:, :, 0] - im[:, :, 1]) > 36) | (np.abs(im[:, :, 2] - im[:, :, 1]) > 36) | (im.sum(axis=2) > 540)
rgba = np.dstack([im, np.where(key, 0, 255)]).astype(np.uint8)
cells = []
for qy in (0, 1):
    for qx in (0, 1):
        q = rgba[qy * H // 2:(qy + 1) * H // 2, qx * W // 2:(qx + 1) * W // 2]
        ys, xs = np.where(q[:, :, 3] > 0)
        crop = Image.fromarray(q[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
        cells.append(crop.resize((max(1, crop.width // 4), max(1, crop.height // 4)), Image.NEAREST))
cw = max(c.width for c in cells) + 2; ch = max(c.height for c in cells) + 2
out = Image.new('RGBA', (cw * 4, ch))
for i, c in enumerate(cells):
    out.alpha_composite(c, (i * cw + cw - c.width - 1, (ch - c.height) // 2))
out.save('assets/fx/dash-boost.png'); print(out.size, [c.size for c in cells])
