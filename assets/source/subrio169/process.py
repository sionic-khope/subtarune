#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/subrio169/process.py   (루트에서)
"""비데 보스 스킬 시트(dive, slam, spinA, spinB, spinC, vanish, spinWind, overhead): 본 시트(subrio166)와 같은 배율(idle 몸 128px 기준 0.4103)로
224×192 셀·발 y180 에 NEAREST 배치. vanish 프레임은 보라 반투명이라 크로마키에 일부 먹힐 수 있어 bounds 를 확인한다."""
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
CELL_W: Final = 224
CELL_H: Final = 192
FEET: Final = 180
MAIN_CONTRACT: Final = GAME / "assets/source/subrio166/bidet/runtime-contract.json"


def clean_alpha(pixels: np.ndarray) -> np.ndarray:
    pixels = pixels.copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    red, green, blue = (pixels[:, :, c].astype(float) for c in range(3))
    fringe = (red > green * 1.3 + 8) & (blue > green * 1.3 + 8) & (red > blue * 0.6) & (blue > red * 0.6) & (red > 200) & (blue > 200)
    pixels[fringe, 3] = 0
    return pixels


def main() -> None:
    scale = json.loads(MAIN_CONTRACT.read_text())["scale"]
    raw = ROOT / "bidet_skills" / "bidet_skills-raw.png"
    std = ROOT / "bidet_skills" / "standard"
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(raw), "--target", "player", "--mode", "idle", "--rows", "4", "--cols", "2",
               "--output-dir", str(std), "--cell-size", "256", "--fit-scale", "0.9", "--align", "feet", "--scale-strategy", "fit",
               "--component-mode", "largest", "--component-padding", "0", "--trim-border", "0", "--strict-qc", "--allow-source-edge-touch"]
    subprocess.run(command, check=True, capture_output=True, text=True)
    with Image.open(std / "raw-sheet-clean.png") as image:
        clean = image.convert("RGBA")
    cw, ch = clean.width // 2, clean.height // 4
    frames = [clean.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(4) for c in range(2)]
    sheet = Image.new("RGBA", (CELL_W * 2, CELL_H * 4))
    bounds = []
    for i, frame in enumerate(frames):
        bbox = frame.getbbox(); assert bbox, f"frame {i} empty"
        subject = frame.crop(bbox)
        small = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
        if small.width > CELL_W or small.height > FEET:
            k = min(CELL_W / small.width, FEET / small.height)
            small = small.resize((max(1, int(small.width * k)), max(1, int(small.height * k))), Image.Resampling.NEAREST)
        small = Image.fromarray(clean_alpha(np.asarray(small)))
        cell = Image.new("RGBA", (CELL_W, CELL_H))
        center_src = (bbox[0] + bbox[2]) / 2 - cw / 2
        x = max(0, min(CELL_W - small.width, CELL_W // 2 - small.width // 2 + round(center_src * scale)))
        # dive(0) 는 공중 자세라 발을 셀 바닥에 맞추지 않고 위쪽에 둔다(코드가 몸 아래에 그린다)
        y = FEET - small.height
        cell.paste(small, (x, y))
        sheet.paste(cell, ((i % 2) * CELL_W, (i // 2) * CELL_H))
        bounds.append(cell.getbbox())
    out = GAME / "assets/sprites/subrio_bidet_skills.png"
    sheet.save(out)
    (ROOT / "bidet_skills" / "runtime-contract.json").write_text(json.dumps({"asset": "assets/sprites/subrio_bidet_skills.png", "cell": [CELL_W, CELL_H],
        "grid": "2x4 row-major: dive, slam, spinA, spinB, spinC, vanish, spinWind, overhead", "feetY": FEET, "scale": scale, "frameBounds": bounds,
        "sampling": "NEAREST", "binaryAlpha": True, "command": command, "model": "openai/gpt-image-2 via OpenGateway images/edits (identity ref = subrio166 idle+swing)"}, indent=2) + "\n")
    preview = Image.new("RGBA", (CELL_W * 4 + 16, CELL_H * 2 + 16), (30, 33, 43, 255))
    for i in range(8):
        preview.alpha_composite(sheet.crop(((i % 2) * CELL_W, (i // 2) * CELL_H, (i % 2 + 1) * CELL_W, (i // 2 + 1) * CELL_H)), (8 + (i % 4) * CELL_W, 8 + (i // 4) * CELL_H))
    preview.save(ROOT / "bidet_skills" / "preview.png")
    print("skills scale", round(scale, 4), "bounds", bounds)


if __name__ == "__main__":
    main()
