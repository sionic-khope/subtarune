#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# Run: uv run assets/source/choimis-gap-v2/export.py
# ──────────────────
from __future__ import annotations

import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
DIRECTIONS: Final = ("down", "up", "left", "right")


def main() -> None:
    with Image.open(ROOT / "reference.png") as source:
        reference = source.convert("RGBA")
    with Image.open(ROOT / "raw-sheet.png") as source:
        raw = source.convert("RGBA")
    crop = np.array(raw.crop((128, 200, 190, 225)))
    alpha = np.where(np.max(crop[:, :, :3], axis=2) < 70, 255, 0).astype("uint8")
    mask = Image.fromarray(alpha).resize((13, 5), Image.Resampling.NEAREST)
    logo = Image.new("RGBA", (13, 5), (0, 0, 0, 0))
    logo.putalpha(mask)
    logo.save(ROOT / "extracted-logo.png")
    runtime_logo = logo.resize((26, 10), Image.Resampling.NEAREST)
    result = reference.copy()
    allowed = np.zeros((512, 512), dtype=bool)
    for column in range(4):
        x = 50 + column * 128
        result.alpha_composite(runtime_logo, (x, 82))
        allowed[82:92, x:x + 26] = True
    result.save(ROOT / "sheet-transparent.png")
    result.save(ROOT.parent.parent / "sprites/choimis.png")
    before = np.array(reference)
    after = np.array(result)
    changed = np.any(before != after, axis=2)
    assert result.size == (512, 512)
    assert np.array_equal(before[:, :, 3], after[:, :, 3])
    assert not np.any(changed & ~allowed)
    assert int(changed.sum()) > 0
    assert np.array_equal(before[128:], after[128:])
    for row, direction in enumerate(DIRECTIONS):
        frames = [result.crop((column * 128, row * 128,
                              (column + 1) * 128, (row + 1) * 128))
                  for column in range(4)]
        assert all(frame.getbbox() for frame in frames)
        frames[0].save(ROOT / f"{direction}.gif", save_all=True,
                       append_images=frames[1:], duration=160, loop=0, disposal=2)
    for name, color in (("light", "#eee8dd"), ("dark", "#202431")):
        canvas = Image.new("RGBA", result.size, color)
        canvas.alpha_composite(result)
        canvas.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / f"preview-{name}.png")
    comparison = Image.new("RGBA", (1024, 512), "#202431")
    comparison.alpha_composite(reference, (0, 0))
    comparison.alpha_composite(result, (512, 0))
    comparison.save(ROOT / "before-after.png")
    report = {
        "dimensions": [512, 512], "cellSize": 128, "rows": DIRECTIONS,
        "changedPixels": int(changed.sum()), "outsideChestChangedPixels": 0,
        "alphaIdentical": True, "backAndProfilesIdentical": True,
        "generatedLogoCrop": [128, 200, 190, 225],
        "blackThreshold": "max(R,G,B)<70", "logicalLogoSize": [13, 5],
        "nearestScale": 2, "frontLogoPositions": [[50 + c * 128, 82] for c in range(4)],
        "alphaValues": np.unique(after[:, :, 3]).tolist(),
    }
    (ROOT / "qc-meta.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
