#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run assets/source/choimis-cape301/runtime-comparison.py
# ──────────────────
from __future__ import annotations

import json
from pathlib import Path
from typing import Final

from PIL import Image, ImageDraw

ROOT: Final = Path(__file__).resolve().parent
OLD_SCALE: Final = 0.506
OLD_SCALE_Y: Final = 1.2
NEW_SCALE: Final = 0.714


def main() -> None:
    with Image.open(ROOT / "old-sheet-reference.png") as source:
        old_sheet = source.convert("RGBA")
    with Image.open(ROOT / "sheet-transparent.png") as source:
        new_sheet = source.convert("RGBA")
    comparison = Image.new("RGBA", (480, 320), "#eee8dd")
    labels = ImageDraw.Draw(comparison)
    old_heights: list[float] = []
    new_heights: list[float] = []
    for index in range(4):
        rect = (index % 2 * 160, index // 2 * 160,
                index % 2 * 160 + 160, index // 2 * 160 + 160)
        old_frame = old_sheet.crop(rect)
        new_frame = new_sheet.crop(rect)
        old_box, new_box = old_frame.getbbox(), new_frame.getbbox()
        assert old_box and new_box
        old_heights.append((old_box[3] - old_box[1]) * OLD_SCALE * OLD_SCALE_Y)
        new_heights.append((new_box[3] - new_box[1]) * NEW_SCALE)
        old_sized = old_frame.resize((round(160 * OLD_SCALE),
                                      round(160 * OLD_SCALE * OLD_SCALE_Y)), Image.Resampling.NEAREST)
        new_sized = new_frame.resize((round(160 * NEW_SCALE),
                                      round(160 * NEW_SCALE)), Image.Resampling.NEAREST)
        x, y = index % 2 * 240, index // 2 * 160
        comparison.alpha_composite(old_sized, (x + 48 - round(80 * OLD_SCALE),
                                               y + 148 - round(152 * OLD_SCALE * OLD_SCALE_Y)))
        comparison.alpha_composite(new_sized, (x + 150 - round(72 * NEW_SCALE),
                                               y + 148 - round(152 * NEW_SCALE)))
        labels.text((x + 8, y + 8), f"300: {old_heights[-1]:.2f}px", fill="#302e38")
        labels.text((x + 125, y + 8), f"301: {new_heights[-1]:.2f}px", fill="#302e38")
    comparison.save(ROOT / "runtime-comparison.png")
    comparison.resize((1440, 960), Image.Resampling.NEAREST).save(ROOT / "runtime-comparison-3x.png")
    (ROOT / "runtime-size-qc.json").write_text(json.dumps({
        "oldScale": OLD_SCALE, "oldScaleY": OLD_SCALE_Y,
        "newUniformScale": NEW_SCALE, "oldHeights": old_heights,
        "newHeights": new_heights, "oldMean": sum(old_heights) / 4,
        "newMean": sum(new_heights) / 4,
        "increasePercent": (sum(new_heights) / sum(old_heights) - 1) * 100,
        "previewRounding": "full-cell dimensions and pivot rounded to nearest whole pixel",
        "runtimeVerification": "mathematical display comparison; actual scene QA owned by integration",
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
