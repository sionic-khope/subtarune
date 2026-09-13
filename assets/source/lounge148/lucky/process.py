import json
import subprocess
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).parent
GAME: Final = ROOT.parents[3]
with Image.open(ROOT / "raw.png") as raw:
    grid = Image.new("RGB", (1320, 1320), (255, 0, 255))
    row_bounds = (0, 310, 620, 925, 1254)
    for row in range(4):
        for col in range(4):
            left, right = round(col * raw.width / 4), round((col + 1) * raw.width / 4)
            cell = raw.crop((left, row_bounds[row], right, row_bounds[row + 1]))
            grid.paste(cell, (col * 330 + (330 - cell.width) // 2, row * 330))
    grid.save(ROOT / "grid.png")
subprocess.run([
    "uv", "run", "--with", "pillow", "--with", "numpy", "python",
    str(ROOT.parent / "park-guardian/process-nearest.py"), "process",
    "--input", str(ROOT / "grid.png"), "--target", "npc", "--mode", "player_sheet",
    "--rows", "4", "--cols", "4", "--output-dir", str(ROOT / "walk"),
    "--cell-size", "64", "--fit-scale", "0.89", "--align", "feet", "--shared-scale",
    "--component-mode", "largest", "--component-padding", "0", "--trim-border", "0",
    "--edge-clean-depth", "0", "--strict-qc", "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05",
], check=True)
frames = []
sheet = Image.new("RGBA", (256, 256))
with Image.open(ROOT / "walk/sheet-transparent.png") as source:
    for row, source_row in enumerate((0, 3, 1, 2)):
        for col in range(4):
            frame = source.crop((col * 64, source_row * 64, (col + 1) * 64, (source_row + 1) * 64))
            pixels = np.asarray(frame).copy()
            rgb = pixels[:, :, :3].astype(np.int16)
            magenta = (rgb[:, :, 0] > 45) & (rgb[:, :, 2] > 45) & (rgb[:, :, 1] < np.minimum(rgb[:, :, 0], rgb[:, :, 2]) * 0.6) & (np.abs(rgb[:, :, 0] - rgb[:, :, 2]) < 65)
            pixels[magenta, 3] = 0
            frame = Image.fromarray(pixels)
            bbox = frame.getbbox()
            assert bbox is not None
            aligned = Image.new("RGBA", (64, 64))
            aligned.paste(frame, (0, 60 - bbox[3]))
            bounds = aligned.getbbox()
            assert bounds is not None
            assert 0 < bounds[0] < bounds[2] < 64
            assert 0 < bounds[1] < bounds[3] < 64
            sheet.paste(aligned, (col * 64, row * 64))
            assert set(np.unique(np.asarray(aligned.getchannel("A")))).issubset({0, 255})
            frames.append({"row": row, "column": col, "bbox": bounds, "art_height": bounds[3] - bounds[1]})
sheet.save(GAME / "assets/sprites/lucky.png")
preview = Image.new("RGBA", (512, 512), (30, 33, 43, 255))
preview.alpha_composite(sheet.resize((512, 512), Image.Resampling.NEAREST))
preview.save(ROOT / "preview.png")
(ROOT / "runtime-contract.json").write_text(json.dumps({"asset": "assets/sprites/lucky.png", "dimensions": [256, 256], "cell": [64, 64], "rows": ["down", "up", "left", "right"], "pivot": [32, 60], "frames": frames}, indent=2) + "\n")
print(frames)
