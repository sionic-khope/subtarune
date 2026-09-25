"""teen342: 청소년 거인(왼쪽을 향한 상체, 아래는 연기) 네 자세 + 돌 잔해 6종.

Run: uv run --with pillow --with numpy python3 assets/source/teen342/process.py
모두 openai/gpt-image-2.5-sunburst. 자세는 teen-raw 를 참조로 같은 캔버스·같은 배율로 그렸으므로
캔버스 전체를 같은 비율로 줄인다(자세가 바뀌어도 몸이 제자리). 키잉·선 굵히기는 arena332/process.py 재사용.
"""
import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('arena_process', HERE.parent / 'arena332' / 'process.py')
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)
# BUILD343: 몸 전체가 왼쪽을 향한 옆모습(teen3·vacuum3·slam3·down4), 캔버스 1536 → 600(사용자 “더 거대하고 어깨도 팔도”) — 머리 위·아래는 화면 밖
SCALE = 600 / 1536
POSES = {'teen': 'teen3', 'vacuum': 'vacuum3', 'slam': 'slam3', 'down': 'down4'}


def scale_canvas(im: np.ndarray, k: float) -> np.ndarray:
    """Premultiplied BOX resize of the whole canvas (no crop), binary alpha."""
    h, w = im.shape[:2]
    size = (round(w * k), round(h * k))
    a = im[..., 3:4].astype(float) / 255
    prem = Image.fromarray(np.concatenate([im[..., :3] * a, im[..., 3:4]], axis=2).astype(np.uint8))
    small = np.array(prem.resize(size, Image.BOX)).astype(float)
    sa = np.maximum(small[..., 3:4], 1) / 255
    out = np.concatenate([np.clip(small[..., :3] / sa, 0, 255), small[..., 3:4]], axis=2).astype(np.uint8)
    out[..., 3] = np.where(out[..., 3] >= 128, 255, 0)
    return out


def main() -> None:
    for name, raw in POSES.items():
        # 흰 선은 얇게(사용자 “근육갈라짐과 흰색 도트는 더 얇고”): 굵히기 3
        im = scale_canvas(ap.key_out(ap.thicken_lines(HERE / f'{raw}-raw.png', 3)), SCALE)
        out = 'assets/props/summit342_teen.png' if name == 'teen' else f'assets/props/teen342_{name}.png'
        Image.fromarray(im).save(out)
        print(out, im.shape[1], 'x', im.shape[0])
    rocks = ap.key_out(np.array(Image.open(HERE / 'rocks-raw.png').convert('RGBA')))
    for i in range(6):
        r, c = divmod(i, 3)
        cell = rocks[r * 512:(r + 1) * 512, c * 512:(c + 1) * 512]
        Image.fromarray(ap.shrink(cell, 30 if i != 4 else 24)).save(f'assets/props/teen342_rock_{i}.png')


if __name__ == '__main__':
    main()
