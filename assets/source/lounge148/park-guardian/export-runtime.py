import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).parent
GAME: Final = ROOT.parents[3]
SPECS: Final = (
    ("costume-walk", "sprites/park_guardian_costume.png", 64, (0, 3, 2, 1), 60),
    ("dog-walk", "sprites/park_guardian.png", 64, (0, 3, 1, 2), 60),
    ("costume-idle", "enemies/park-guardian-costume-idle.png", 96, (0, 1), 90),
    ("dog-idle", "enemies/park-guardian-idle.png", 96, (0, 1), 90),
)
reports = []
previews = []
for name, relative, size, row_order, baseline in SPECS:
    frames = []
    rows = len(row_order)
    sheet = Image.new("RGBA", (size * rows, size * rows))
    with Image.open(ROOT / name / "sheet-transparent.png") as source:
        for row, source_row in enumerate(row_order):
            for col in range(rows):
                frame = source.crop((col * size, source_row * size, (col + 1) * size, (source_row + 1) * size))
                pixels = np.asarray(frame).copy()
                rgb = pixels[:, :, :3].astype(np.int16)
                magenta = (rgb[:, :, 0] > 45) & (rgb[:, :, 2] > 45) & (rgb[:, :, 1] < np.minimum(rgb[:, :, 0], rgb[:, :, 2]) * 0.6) & (np.abs(rgb[:, :, 0] - rgb[:, :, 2]) < 65)
                pixels[magenta, 3] = 0
                frame = Image.fromarray(pixels)
                bbox = frame.getbbox()
                assert bbox is not None
                aligned = Image.new("RGBA", (size, size))
                aligned.paste(frame, (0, baseline - bbox[3]))
                bounds = aligned.getbbox()
                assert bounds is not None
                assert 0 < bounds[0] < bounds[2] < size
                assert 0 < bounds[1] < bounds[3] < size
                sheet.paste(aligned, (col * size, row * size))
                alpha = np.asarray(aligned.getchannel("A"))
                assert set(np.unique(alpha)).issubset({0, 255})
                frames.append({"row": row, "column": col, "bbox": bounds, "art_height": bounds[3] - bounds[1]})
    output = GAME / "assets" / relative
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
    reports.append({"asset": "assets/" + relative, "dimensions": sheet.size, "cell": size, "pivot": [size // 2, baseline], "rows": ["down", "up", "left", "right"] if rows == 4 else ["idle0,1", "idle2,3"], "frames": frames})
    previews.append(sheet)
(ROOT / "runtime-contract.json").write_text(json.dumps(reports, ensure_ascii=False, indent=2) + "\n")
preview = Image.new("RGBA", (1024, 896), (30, 33, 43, 255))
for index, sheet in enumerate(previews):
    scale = 2
    display = sheet.resize((sheet.width * scale, sheet.height * scale), Image.Resampling.NEAREST)
    preview.alpha_composite(display, ((index % 2) * 512, 0 if index < 2 else 512))
preview.save(ROOT / "preview.png")
print(json.dumps(reports, ensure_ascii=False))
