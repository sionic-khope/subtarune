from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent

# Geometry-only extraction: the fourth generated row begins before y=940.
with Image.open(ROOT / "costume-walk-raw.png") as raw:
    result = Image.new("RGB", (1320, 1320), (255, 0, 255))
    bounds = (0, 310, 620, 925, 1254)
    for row in range(4):
        for col in range(4):
            left, right = round(col * raw.width / 4), round((col + 1) * raw.width / 4)
            cell = raw.crop((left, bounds[row], right, bounds[row + 1]))
            result.paste(cell, (col * 330 + (330 - cell.width) // 2, row * 330))
    result.save(ROOT / "costume-walk-grid.png")
