import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).parent
GAME: Final = ROOT.parents[3]
CELL: Final = (128, 160)
PIVOT: Final = (64, 156)
SOURCE_PIVOTS: Final = ((128, 306), (140, 300), (106, 300), (106, 308))
frames = []
sheet = Image.new("RGBA", (512, 640))
with Image.open(GAME / "assets/sprites/warm-bidet-v2/warm-bidet-walk.png") as source:
    for row, source_row in enumerate((0, 3, 1, 2)):
        px, py = SOURCE_PIVOTS[source_row]
        offset = (PIVOT[0] - round(px * 0.45), PIVOT[1] - round(py * 0.45))
        for col in range(4):
            original = source.crop((col * 240, source_row * 312, (col + 1) * 240, (source_row + 1) * 312))
            frame = original.resize((108, 140), Image.Resampling.NEAREST)
            aligned = Image.new("RGBA", CELL)
            aligned.paste(frame, offset)
            bounds = aligned.getbbox()
            assert bounds is not None
            assert 0 < bounds[0] < bounds[2] < CELL[0]
            assert 0 < bounds[1] < bounds[3] < CELL[1]
            assert np.count_nonzero(np.asarray(frame.getchannel("A"))) == np.count_nonzero(np.asarray(aligned.getchannel("A")))
            sheet.paste(aligned, (col * CELL[0], row * CELL[1]))
            frames.append({"row": row, "column": col, "source_row": source_row, "source_pivot": [px, py], "offset": offset, "bbox": bounds})
sheet.save(GAME / "assets/sprites/warm_bidet.png")
preview = Image.new("RGBA", sheet.size, (30, 33, 43, 255))
preview.alpha_composite(sheet)
preview.save(ROOT / "warm-bidet-preview.png")
(ROOT / "warm-bidet-contract.json").write_text(json.dumps({"source": "assets/sprites/warm-bidet-v2/warm-bidet-walk.png", "asset": "assets/sprites/warm_bidet.png", "dimensions": sheet.size, "cell": CELL, "pivot": PIVOT, "rows": ["down", "up", "left", "right"], "nearest_scale": 0.45, "expected_body_screen_height": "280 * 0.45 / 2 * 1.43 = 90.09", "frames": frames}, indent=2) + "\n")
print(frames)
