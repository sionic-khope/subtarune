#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/subrio167/process.py   (루트에서)
"""섭리오 167: 덜 디테일한 8비트 주인공 시트 3장(64×64 셀, 발 y60, idle 몸 48px = 165의 1.4배)과 CS 미니언 2장(2×2, 48×48 셀, 발 y44, 걷기 몸 34px).
processor 는 크로마키 정리·빈 프레임 검사, runtime 픽셀은 raw-sheet-clean 에서 시트 공통 배율로 NEAREST 축소. 가로는 원본 셀 안의 몸 중심을 유지."""
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
# name: (rows, cols, cell_w, cell_h, feet_y, body_target, hover, runtime 이름, 프레임 순서 설명)
JOBS: Final = {
    "pantheon": (4, 2, 64, 64, 60, 48, 0, "assets/sprites/subrio_pantheon.png", "idle, walk1, walk2, walk3, jump, crouch, attack(charge), guard"),
    "zilean": (4, 2, 64, 64, 60, 48, 6, "assets/sprites/subrio_zilean.png", "hover idle, bob A, bob B, bob C, rise(jump), low hover(crouch), cast(attack), clock shield(guard)"),
    "brand": (4, 2, 64, 64, 60, 48, 0, "assets/sprites/subrio_brand.png", "idle, walk1, walk2, walk3, jump, crouch, fireball(attack), guard"),
    "cs_red": (2, 2, 48, 48, 44, 34, 0, "assets/sprites/subrio_cs_red.png", "walk A, walk B, stunned, defeated"),
    "cs_blue": (2, 2, 48, 48, 44, 34, 0, "assets/sprites/subrio_cs_blue.png", "walk A, walk B, stunned, defeated"),
}


def clean_alpha(pixels: np.ndarray) -> np.ndarray:
    pixels = pixels.copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    red, green, blue = (pixels[:, :, c].astype(float) for c in range(3))
    fringe = (red > green * 1.3 + 8) & (blue > green * 1.3 + 8) & (red > blue * 0.6) & (blue > red * 0.6)
    pixels[fringe, 3] = 0
    return pixels


def process(name: str, preview: Image.Image, preview_y: int) -> None:
    rows, cols, cell_w, cell_h, feet, body_target, hover, runtime, order = JOBS[name]
    raw = ROOT / name / f"{name}-raw.png"
    std = ROOT / name / "standard"
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(raw), "--target", "player", "--mode", "idle", "--rows", str(rows), "--cols", str(cols),
               "--output-dir", str(std), "--cell-size", "256", "--fit-scale", "0.9", "--align", "feet", "--scale-strategy", "fit",
               "--component-mode", "largest", "--component-padding", "0", "--trim-border", "0", "--strict-qc", "--allow-source-edge-touch"]
    subprocess.run(command, check=True, capture_output=True, text=True)
    with Image.open(std / "raw-sheet-clean.png") as image:
        clean = image.convert("RGBA")
    cw, ch = clean.width // cols, clean.height // rows
    frames = [clean.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(rows) for c in range(cols)]
    ref_bbox = frames[0].getbbox(); assert ref_bbox
    scale = body_target / (ref_bbox[3] - ref_bbox[1])
    sheet = Image.new("RGBA", (cell_w * cols, cell_h * rows))
    bounds = []
    for i, frame in enumerate(frames):
        bbox = frame.getbbox(); assert bbox, f"{name} frame {i} empty"
        subject = frame.crop(bbox)
        small = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
        small = Image.fromarray(clean_alpha(np.asarray(small)))
        cell = Image.new("RGBA", (cell_w, cell_h))
        center_src = (bbox[0] + bbox[2]) / 2 - cw / 2
        x = max(0, min(cell_w - small.width, cell_w // 2 - small.width // 2 + round(center_src * scale)))
        y = feet - hover - small.height
        if y < 0:
            raise SystemExit(f"{name} frame {i} does not fit: {small.size}")
        cell.paste(small, (x, y))
        sheet.paste(cell, ((i % cols) * cell_w, (i // cols) * cell_h))
        bounds.append(cell.getbbox())
    out = GAME / runtime
    sheet.save(out)
    contract = {"asset": runtime, "cell": [cell_w, cell_h], "grid": f"{cols} cols x {rows} rows, row-major: {order}", "feetY": feet, "hover": hover,
                "scale": scale, "frameBounds": bounds, "sampling": "NEAREST", "binaryAlpha": True, "command": command,
                "model": "openai/gpt-image-2 via OpenGateway images/edits (single image field, identity ref)"}
    (ROOT / name / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    for i in range(rows * cols):
        preview.alpha_composite(sheet.crop(((i % cols) * cell_w, (i // cols) * cell_h, (i % cols + 1) * cell_w, (i // cols + 1) * cell_h)), (8 + i * (cell_w + 4), preview_y))
    print(name, "scale", round(scale, 4), "bounds", bounds)


def main() -> None:
    preview = Image.new("RGBA", (8 * 68 + 16, 3 * 70 + 2 * 54 + 16), (30, 33, 43, 255))
    y = 8
    for name in JOBS:
        process(name, preview, y)
        y += 70 if JOBS[name][3] == 64 else 54
    preview.save(ROOT / "preview.png")
    preview.resize((preview.width * 3, preview.height * 3), Image.Resampling.NEAREST).save(ROOT / "preview-3x.png")


if __name__ == "__main__":
    main()
