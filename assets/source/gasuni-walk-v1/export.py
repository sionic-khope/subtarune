# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
"""가순이 1·2·3 걷기 시트 가공(BUILD257): gpt-image 4×4 원본(1024×1024, 마젠타 배경) → 마젠타 색키 → tools/sprites/sheet_processor.py 로
공통 배율·발 바닥 정렬(최미스 export.py 와 같은 인자) → 64px 제작 셀 → 게임용 512×512(128 셀) `assets/sprites/gasuni<n>.png` + 초상화(정면 0번 얼굴).
실행: /usr/bin/python3 assets/source/gasuni-walk-v1/export.py <n> [<n> …]  (저장소 루트에서)"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
DIRECTIONS = ("down", "up", "left", "right")
RAW_ROWS = (0, 3, 1, 2)            # 원본 행 순서 down/left/right/up → 게임 순서 down/up/left/right
CELL = 64


def key_magenta(image: Image.Image, tol: int = 60) -> Image.Image:
    pixels = np.array(image.convert("RGBA"))
    r, g, b = pixels[:, :, 0].astype(int), pixels[:, :, 1].astype(int), pixels[:, :, 2].astype(int)
    magenta = (r > 255 - tol) & (b > 255 - tol) & (g < tol)
    pixels[magenta, 3] = 0
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(pixels)


def export(n: int) -> None:
    raw = ROOT / f"gasuni{n}-raw.png"
    clean = key_magenta(Image.open(raw))
    clean.save(ROOT / f"gasuni{n}-clean.png")
    out_dir = ROOT / f"processor{n}"
    subprocess.run([
        sys.executable, str(REPO / "tools/sprites/sheet_processor.py"), "process",
        "--input", str(ROOT / f"gasuni{n}-clean.png"),
        "--target", "player", "--mode", "player_sheet",
        "--rows", "4", "--cols", "4", "--cell-size", str(CELL),
        "--output-dir", str(out_dir),
        "--fit-scale", "0.84", "--align", "bottom", "--shared-scale",
        "--scale-strategy", "preserve", "--component-mode", "all",
        "--threshold", "0", "--edge-threshold", "0",
        "--trim-border", "0", "--edge-clean-depth", "0",
        "--duration", "160",
    ], check=True)
    metadata = json.loads((out_dir / "pipeline-meta.json").read_text())
    sheet = Image.new("RGBA", (CELL * 4, CELL * 4))
    for row, direction in enumerate(DIRECTIONS):
        for column in range(4):
            info = metadata["frames"][RAW_ROWS[row] * 4 + column]
            crop = clean.crop(info["source_box"]).crop(info["crop_bbox"])
            sized = crop.resize(tuple(info["output_size"]), Image.Resampling.NEAREST)
            frame = Image.new("RGBA", (CELL, CELL))
            frame.paste(sized, (info["paste_position"][0], CELL - 4 - sized.height))
            rgba = np.array(frame)
            edge = np.asarray(frame.getchannel("A").filter(ImageFilter.MinFilter(3))) == 0
            red, green, blue = rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2]
            chroma = ((red > 140) & (green < 100) & (blue > 100))
            fringe = edge & chroma & (rgba[:, :, 3] > 0)
            rgba[fringe, 3] = 0
            sheet.paste(Image.fromarray(rgba), (column * CELL, row * CELL))
    sheet.save(ROOT / f"gasuni{n}-64.png")
    runtime = sheet.resize((CELL * 8, CELL * 8), Image.Resampling.NEAREST)
    runtime.save(REPO / "assets/sprites" / f"gasuni{n}.png")
    face = runtime.crop((0, 0, 128, 128))
    bbox = face.getbbox()
    top = bbox[1] if bbox else 20
    face.crop((34, top - 2, 96, top + 60)).resize((96, 96), Image.Resampling.NEAREST).save(REPO / "assets/portraits" / f"gasuni{n}.png")
    print("gasuni", n, "runtime", runtime.size, "frame0 bbox", bbox)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        export(int(arg))
