import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def test_hyungsub_source_mouth_strokes_are_replaced_with_adjacent_skin() -> None:
    with (ROOT / 'assets/source/hyungsub-mouth-retouch.json').open() as file:
        retouch = json.load(file)
    with Image.open(ROOT / 'assets/source' / retouch['source']) as image:
        pixels = np.asarray(image.convert('RGB'), dtype=np.uint8)
        for patch in retouch['patches']:
            for y, x0, x1 in patch['rows']:
                for x in range(x0, x1):
                    color = pixels[y, x]
                    np.testing.assert_array_equal(color, pixels[y, x + patch['sampleOffsetX']])
                    assert color[0] > 220 and color[1] > 160 and color[2] > 130
