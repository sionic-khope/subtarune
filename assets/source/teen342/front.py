"""BUILD346 꼭대기 끝길 전경(청소년이 다리·마지막 기둥 뒤에 있게): summit336_chunk_1 에서 다리와 기둥만 남긴 투명 PNG.

Run: uv run --with pillow --with numpy python3 assets/source/teen342/front.py
"""
from PIL import Image
import numpy as np

im = np.asarray(Image.open('assets/props/summit336_chunk_1.png').convert('RGB')).astype(int)
H, W, _ = im.shape
lum = im.mean(2)
ys, xs = np.mgrid[0:H, 0:W]
# 다리: 실제 돌 픽셀만(부서진 끝의 들쭉날쭉한 틈·하늘은 빼야 청소년 위에 어두운 네모가 안 생긴다)
walk = (xs < 612) & (ys > 318) & (ys < 640) & (lum > 22)
# 부서진 끝 바로 앞 마지막 난간 기둥(불꽃·끊어진 사슬 포함)은 영역째
post = (xs >= 600) & (xs <= 668) & (ys >= 200) & (ys <= 330) & (lum > 18)
rail = (xs < 600) & (ys > 225) & (ys <= 318) & (lum > 38)
a = ((walk | post | rail) * 255).astype(np.uint8)
Image.fromarray(np.dstack([im.astype(np.uint8), a]), 'RGBA').save('assets/props/summit342_front.png')
print('ok')
