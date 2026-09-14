#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: uv run assets/source/bidet-room164/process.py
"""OG(gpt-image-2) 생성 원본 두 장을 저장소 processor 로 크로마키·strict QC 한 뒤 NEAREST 로 게임 셀에 맞춘다."""
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
# (이름, raw, 셀, 최대 그림 크기, 피벗(하단 중앙), 출력)
ASSETS: Final = (
    ("screen", "screen/screen-raw.png", (256, 256), (248, 248), (128, 252), "assets/props/bidet_screen.png"),
    ("kiosk", "kiosk/kiosk-raw.png", (64, 96), (56, 90), (32, 94), "assets/props/bidet_kiosk.png"),
)


def main() -> None:
    preview = Image.new("RGBA", (352, 272), (30, 33, 43, 255))
    for index, (name, raw, size, envelope, pivot, out_rel) in enumerate(ASSETS):
        directory = ROOT / name / "standard"
        command = [sys.executable, str(PROCESSOR), "process", "--input", str(ROOT / raw),
                   "--target", "asset", "--mode", "single", "--rows", "1", "--cols", "1",
                   "--output-dir", str(directory), "--cell-size", "256", "--fit-scale", "0.9",
                   "--align", "center", "--component-mode", "largest", "--component-padding", "0",
                   "--trim-border", "0", "--strict-qc"]
        subprocess.run(command, check=True, capture_output=True, text=True)
        with Image.open(directory / "raw-sheet-clean.png") as image:
            clean = image.convert("RGBA")
        bounds = clean.getbbox(); assert bounds is not None
        subject = clean.crop(bounds)
        scale = min(envelope[0] / subject.width, envelope[1] / subject.height)
        subject = subject.resize((round(subject.width * scale), round(subject.height * scale)), Image.Resampling.NEAREST)
        pixels = np.asarray(subject).copy()
        pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
        red, green, blue = (pixels[:, :, c].astype(float) for c in range(3))
        fringe = (red > green * 1.3 + 8) & (blue > green * 1.3 + 8) & (red > blue * 0.6) & (blue > red * 0.6)
        pixels[fringe, 3] = 0
        subject = Image.fromarray(pixels)
        output = Image.new("RGBA", size)
        output.paste(subject, (pivot[0] - subject.width // 2, pivot[1] - subject.height))
        final_bounds = output.getbbox(); assert final_bounds is not None
        assert 0 <= final_bounds[0] < final_bounds[2] <= size[0] and 0 <= final_bounds[1] < final_bounds[3] <= size[1]
        rgba = np.asarray(output)
        magenta = (rgba[:, :, 0] > 150) & (rgba[:, :, 2] > 150) & (rgba[:, :, 1] < 100) & (rgba[:, :, 3] > 0)
        assert not magenta.any()
        destination = GAME / out_rel
        output.save(destination)
        output.save(ROOT / name / "final.png")
        contract = {"asset": out_rel, "dimensions": size, "bounds": final_bounds, "pivot": pivot, "maxEnvelope": envelope,
                    "rawBbox": bounds, "scale": scale, "sampling": "NEAREST", "binaryAlpha": True, "magentaPixels": 0,
                    "removedChromaFringePixels": int(fringe.sum()), "model": "openai/gpt-image-2 via OpenGateway", "command": command}
        (ROOT / name / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
        preview.alpha_composite(output, ((8, 280)[index], 8))
        print(name, size, "bounds", final_bounds, "scale", round(scale, 4), "fringe", int(fringe.sum()))
    preview.save(ROOT / "preview.png")
    preview.resize((704, 544), Image.Resampling.NEAREST).save(ROOT / "preview-2x.png")


if __name__ == "__main__":
    main()
