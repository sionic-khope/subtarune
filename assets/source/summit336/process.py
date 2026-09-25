"""summit336: 청소년 upper body (line art, 3/4 facing left) for the summit confrontation.

Run: uv run --with pillow --with numpy python3 assets/source/summit336/process.py
Uses the same keying / line thickening / BOX downscale as assets/source/arena332/process.py.
"""
import importlib.util
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('arena_process', HERE.parent / 'arena332' / 'process.py')
ap = importlib.util.module_from_spec(spec); spec.loader.exec_module(ap)


def main() -> None:
    teen = ap.fade_bottom(ap.shrink(ap.key_out(ap.thicken_lines(HERE / 'teen-raw.png', 3)), 620), 0.2)
    Image.fromarray(teen).save('assets/props/summit336_teen.png')
    print(teen.shape[1], 'x', teen.shape[0])


if __name__ == '__main__':
    main()
