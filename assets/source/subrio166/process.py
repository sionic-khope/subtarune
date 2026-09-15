#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: /usr/bin/python3 assets/source/subrio166/process.py   (루트에서)
"""섭리오 보스 따듯한비데: OG(gpt-image-2, edits·단일 image 참조) 2×4 시트를 processor 크로마키 정리 뒤 시트 공통 배율로 112×96 셀(발 y90, idle 몸 64px — 167에서 주인공 1.4배에 맞춰 키움)에 NEAREST 배치."""
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
CELL_W: Final = 112
CELL_H: Final = 96
FEET: Final = 90
BODY_TARGET: Final = 64
NAME: Final = "bidet"


def clean_alpha(pixels: np.ndarray) -> np.ndarray:
    pixels = pixels.copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    red, green, blue = (pixels[:, :, c].astype(float) for c in range(3))
    fringe = (red > green * 1.3 + 8) & (blue > green * 1.3 + 8) & (red > blue * 0.6) & (blue > red * 0.6)
    pixels[fringe, 3] = 0
    return pixels


def main() -> None:
    raw = ROOT / NAME / f"{NAME}-raw.png"
    std = ROOT / NAME / "standard"
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(raw), "--target", "player", "--mode", "idle", "--rows", "4", "--cols", "2",
               "--output-dir", str(std), "--cell-size", "256", "--fit-scale", "0.9", "--align", "feet", "--scale-strategy", "fit",
               "--component-mode", "largest", "--component-padding", "0", "--trim-border", "0", "--strict-qc", "--allow-source-edge-touch"]
    subprocess.run(command, check=True, capture_output=True, text=True)
    with Image.open(std / "raw-sheet-clean.png") as image:
        clean = image.convert("RGBA")
    cw, ch = clean.width // 2, clean.height // 4
    # 원본에서 5번(윈드업) 프레임의 치켜든 도끼 끝이 셀 경계(y768)를 4px 넘어 3번(걷기B) 셀 바닥에 걸쳐 그려졌다(걷기B 몸은 y711에서 끝남).
    # 그래서 두 프레임의 경계만 y740 으로 옮겨 자른다(나머지는 균등 셀).
    ROW_SPLIT = {2: (ch, 740), 4: (740, ch * 3)}
    frames = []
    for i in range(8):
        c, r = i % 2, i // 2
        top, bottom = ROW_SPLIT.get(i, (r * ch, (r + 1) * ch))
        frames.append(clean.crop((c * cw, top, (c + 1) * cw, bottom)))
    idle_bbox = frames[0].getbbox(); assert idle_bbox
    scale = BODY_TARGET / (idle_bbox[3] - idle_bbox[1])
    sheet = Image.new("RGBA", (CELL_W * 2, CELL_H * 4))
    bounds = []
    for i, frame in enumerate(frames):
        bbox = frame.getbbox(); assert bbox, f"frame {i} empty"
        subject = frame.crop(bbox)
        small = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
        small = Image.fromarray(clean_alpha(np.asarray(small)))
        cell = Image.new("RGBA", (CELL_W, CELL_H))
        # 발 x 기준: 원본 셀 안에서 몸의 가로 중심을 유지한다(휘두르기·물줄기 프레임은 앞으로 뻗으므로 중앙 정렬하면 몸이 뒤로 밀린다)
        center_src = (bbox[0] + bbox[2]) / 2 - cw / 2
        x = CELL_W // 2 - small.width // 2 + round(center_src * scale)
        y = FEET - small.height
        x = max(0, min(CELL_W - small.width, x))
        if y < 0:
            raise SystemExit(f"frame {i} does not fit: {small.size}")
        cell.paste(small, (x, y))
        sheet.paste(cell, ((i % 2) * CELL_W, (i // 2) * CELL_H))
        bounds.append(cell.getbbox())
    out = GAME / "assets/sprites" / f"subrio_{NAME}.png"
    sheet.save(out)
    contract = {"asset": str(out.relative_to(GAME)), "cell": [CELL_W, CELL_H], "grid": "2 cols x 4 rows, row-major: idle, walkA, walkB, jump, windup, swing, spray, hurt",
                "feetY": FEET, "scale": scale, "frameBounds": bounds, "sampling": "NEAREST", "binaryAlpha": True, "command": command,
                "model": "openai/gpt-image-2 via OpenGateway images/edits (single image field, identity ref refs/bidet-ref.png)"}
    (ROOT / NAME / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    preview = Image.new("RGBA", (CELL_W * 8 + 16, CELL_H + 16), (30, 33, 43, 255))
    for i in range(8):
        preview.alpha_composite(sheet.crop(((i % 2) * CELL_W, (i // 2) * CELL_H, (i % 2 + 1) * CELL_W, (i // 2 + 1) * CELL_H)), (8 + i * CELL_W, 8))
    preview.save(ROOT / "preview.png")
    preview.resize((preview.width * 3, preview.height * 3), Image.Resampling.NEAREST).save(ROOT / "preview-3x.png")
    print(NAME, "scale", round(scale, 4), "bounds", bounds)


if __name__ == "__main__":
    main()
