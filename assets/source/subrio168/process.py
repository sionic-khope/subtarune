#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/subrio168/process.py   (루트에서)
"""섭리오 168 몬스터 8종(OG edits 2×2 시트: 걷기 A·B, 스턴, 쓰러짐) → 48×48 셀(레드·블루는 64×64), 발 y44/60, 걷기 몸 높이를 종류별 target 으로 NEAREST 축소."""
from pathlib import Path
from typing import Final
import json
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
PROCESSOR: Final = GAME / "tools/sprites/sheet_processor.py"
# name: (cell, feet, body_target)
JOBS: Final = {"raptor": (48, 44, 30), "wolf": (48, 44, 26), "gromp": (48, 44, 28), "krug": (48, 44, 32), "scuttle": (48, 44, 24), "cannon": (48, 44, 34), "red": (64, 60, 46), "blue": (64, 60, 48)}


def clean_alpha(pixels: np.ndarray) -> np.ndarray:
    pixels = pixels.copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    red, green, blue = (pixels[:, :, c].astype(float) for c in range(3))
    fringe = (red > green * 1.3 + 8) & (blue > green * 1.3 + 8) & (red > blue * 0.6) & (blue > red * 0.6)
    pixels[fringe, 3] = 0
    return pixels


def process(name: str, preview: Image.Image, py: int) -> None:
    cell, feet, body_target = JOBS[name]
    raw = ROOT / name / f"{name}-raw.png"
    std = ROOT / name / "standard"
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(raw), "--target", "player", "--mode", "idle", "--rows", "2", "--cols", "2",
               "--output-dir", str(std), "--cell-size", "256", "--fit-scale", "0.9", "--align", "feet", "--scale-strategy", "fit",
               "--component-mode", "largest", "--component-padding", "0", "--trim-border", "0", "--strict-qc", "--allow-source-edge-touch"]
    subprocess.run(command, check=True, capture_output=True, text=True)
    with Image.open(std / "raw-sheet-clean.png") as image:
        clean = image.convert("RGBA")
    cw, ch = clean.width // 2, clean.height // 2
    frames = [clean.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(2) for c in range(2)]
    ref_bbox = frames[0].getbbox(); assert ref_bbox
    scale = body_target / (ref_bbox[3] - ref_bbox[1])
    sheet = Image.new("RGBA", (cell * 2, cell * 2))
    bounds = []
    for i, frame in enumerate(frames):
        bbox = frame.getbbox(); assert bbox, f"{name} frame {i} empty"
        subject = frame.crop(bbox)
        small = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
        if small.width > cell or small.height > feet:
            k = min(cell / small.width, feet / small.height)
            small = small.resize((max(1, int(small.width * k)), max(1, int(small.height * k))), Image.Resampling.NEAREST)
        small = Image.fromarray(clean_alpha(np.asarray(small)))
        c = Image.new("RGBA", (cell, cell))
        center_src = (bbox[0] + bbox[2]) / 2 - cw / 2
        x = max(0, min(cell - small.width, cell // 2 - small.width // 2 + round(center_src * scale)))
        c.paste(small, (x, feet - small.height))
        sheet.paste(c, ((i % 2) * cell, (i // 2) * cell))
        bounds.append(c.getbbox())
    out = GAME / "assets/sprites" / f"subrio_{name}.png"
    sheet.save(out)
    (ROOT / name / "runtime-contract.json").write_text(json.dumps({"asset": str(out.relative_to(GAME)), "cell": [cell, cell], "grid": "2x2 row-major: walkA, walkB, stunned, defeated", "feetY": feet,
                                                                   "scale": scale, "frameBounds": bounds, "sampling": "NEAREST", "binaryAlpha": True, "command": command,
                                                                   "model": "openai/gpt-image-2 via OpenGateway images/edits (identity ref refs/<name>-ref.png)"}, indent=2) + "\n")
    for i in range(4):
        preview.alpha_composite(sheet.crop(((i % 2) * cell, (i // 2) * cell, (i % 2 + 1) * cell, (i // 2 + 1) * cell)), (8 + i * 70, py))
    print(name, "scale", round(scale, 4), "bounds", bounds)


def main() -> None:
    names = [n for n in JOBS if (ROOT / n / f"{n}-raw.png").exists()]
    preview = Image.new("RGBA", (4 * 70 + 16, len(names) * 70 + 16), (30, 33, 43, 255))
    for i, name in enumerate(names):
        process(name, preview, 8 + i * 70)
    preview.save(ROOT / "preview.png")
    preview.resize((preview.width * 3, preview.height * 3), Image.Resampling.NEAREST).save(ROOT / "preview-3x.png")


if __name__ == "__main__":
    main()
