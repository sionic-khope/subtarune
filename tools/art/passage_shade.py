#!/usr/bin/env /usr/bin/python3
"""그림자 진 입구 오버레이(렌더 효과, 그림 아님): 위쪽은 완전히 검고 아래로 갈수록 투명해지는 세로 그라데이션 + 양옆 부드러운 가장자리.
짜장 해안 숲 입구(assets/props/jjajang_entrance_shade.png, 96×384)와 같은 구성으로 폭·높이만 다르게 만든다.
   사용: /usr/bin/python3 tools/art/passage_shade.py <out.png> <width> <height> <opaque_until> [side_margin=16]"""
import sys
import numpy as np
from PIL import Image

out, width, height, opaque = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
margin = int(sys.argv[5]) if len(sys.argv) > 5 else 16
ys = np.arange(height)[:, None].astype(float)
xs = np.arange(width)[None, :].astype(float)
# 세로: opaque 까지 255, 그 아래로 ease-out 으로 0 까지
t = np.clip((ys - opaque) / max(1, height - opaque), 0, 1)
vert = 1 - (1 - (1 - t) ** 2.2)           # (1-t)^2.2: 처음엔 천천히, 끝에서 빠르게 사라짐
vert = (1 - t) ** 2.2
# 가로: 양옆 margin 안에서 부드럽게 0 으로(해안 것과 같이 완전 검은 구간은 가로 전체가 255)
side = np.clip(np.minimum(xs, width - 1 - xs) / max(1, margin), 0, 1)
horiz = np.where(ys < opaque, 1.0, 0.15 + 0.85 * side)
alpha = np.clip(vert * horiz * 255, 0, 255).astype(np.uint8)
rgb = np.zeros((height, width, 3), np.uint8); rgb[:, :] = (4, 3, 8)
Image.fromarray(np.dstack([rgb, alpha])).save(out)
print('wrote', out, width, 'x', height, 'opaque until', opaque)
