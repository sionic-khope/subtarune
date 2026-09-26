#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""BUILD364 epilogue art (gpt-image-2.5-sunburst raws here): open grand door (right leaf open, light) at the original
door size, 경섭·김형섭 어깨동무 front/back 2-frame strips, big floor bandage. Keying/grid collapse as rise359/process.py."""
import importlib.util
from pathlib import Path
from PIL import Image

spec = importlib.util.spec_from_file_location('rise', Path('assets/source/rise359/process.py'))
rise = importlib.util.module_from_spec(spec); spec.loader.exec_module(rise)
SRC = Path('assets/source/epilogue364')
rise.SRC = SRC


def single(name, out, width):
    im = rise.key(Image.open(SRC / f'{name}-raw.png').convert('RGB'))
    im = im.crop(im.getbbox())
    im = im.resize((width, round(im.height * width / im.width)), Image.NEAREST)
    im.save(out); print(out, im.size)


if __name__ == '__main__':
    single('door', 'assets/props/ship_lounge_grand_door_open.png', 160)
    # BUILD369: 퍼레이드는 양쪽 문이 다 열린 그림(한쪽 열린 그림은 다른 장면용으로 남김)
    single('door-both', 'assets/props/ship_lounge_grand_door_open_both.png', 160)
    single('bandage', 'assets/props/ship_lounge_bandage.png', 120)
    # BUILD368: 김형섭은 기절해 경섭에게 기댄 모습(pair-faint, 사용자 “기절해있어서 기대고있는 모습”)
    rise.strip('pair-faint', str(SRC / 'pair-strip.png'))
    strip = Image.open(SRC / 'pair-strip.png'); cw = strip.width // 4
    for part, cells in (('front', (0, 1)), ('back', (2, 3))):
        out = Image.new('RGBA', (cw * 2, strip.height))
        for i, c in enumerate(cells): out.paste(strip.crop((c * cw, 0, (c + 1) * cw, strip.height)), (i * cw, 0))
        out.save(f'assets/props/pair_hug_{part}.png'); print(part, out.size)
