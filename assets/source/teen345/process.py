"""teen345: 청소년 거인 D안(결전지 거인 디자인, 주인공 쪽=화면 왼쪽을 내려다보는 3/4, 목 위는 화면 밖) 네 자세.

Run: uv run --with pillow --with numpy python3 assets/source/teen345/process.py
모두 openai/gpt-image-2.5-sunburst(face4 = 사용자가 고른 D, 나머지는 face4 참조). 같은 캔버스·같은 배율(700/1536).
자세마다 목 단면(목 기둥 맨 위)의 높이를 재서 출력 → src/data/teen-battle.js view.poses 의 y 를 그 값으로 맞춘다(목이 화면 위 밖).
"""
import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
load = lambda n, p: (lambda s: (s.loader.exec_module(m := importlib.util.module_from_spec(s)), m)[1])(importlib.util.spec_from_file_location(n, p))
ap = load('ap', HERE.parent / 'arena332' / 'process.py')
tp = load('tp', HERE.parent / 'teen342' / 'process.py')
SCALE = 700 / 1536
POSES = {'teen': 'face4', 'vacuum': 'dvac', 'slam': 'dslam', 'down': 'ddown'}


def main() -> None:
    for name, raw in POSES.items():
        im = tp.scale_canvas(ap.key_out(ap.thicken_lines(HERE / f'{raw}-raw.png', 3)), SCALE)
        out = 'assets/props/summit342_teen.png' if name == 'teen' else f'assets/props/teen342_{name}.png'
        Image.fromarray(im).save(out)
        w = im.shape[1]
        # 목: 캔버스 왼쪽 25~42% 열 띠에서 가장 위 불투명 줄
        band = im[:, int(w * 0.25):int(w * 0.42), 3]
        neck = int(np.argmax(band.any(axis=1)))
        ys, xs = np.nonzero(im[..., 3])
        print(f'{name}: {w}x{im.shape[0]} neckTop={neck} left={xs.min()}')


if __name__ == '__main__':
    main()
