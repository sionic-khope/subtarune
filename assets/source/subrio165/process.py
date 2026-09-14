#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# How to run: uv run assets/source/subrio165/process.py
"""섭리오 자산: OG(gpt-image-2, edits·단일 image 참조) 2×4 시트 3장을 processor strict-QC 뒤 시트당 하나의 배율로 48×48 셀(발 y44)에 NEAREST 배치,
아이콘 3장은 32×32. 프레임별 fit 없음."""
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
CELL: Final = 48
FEET: Final = 44
BODY_TARGET: Final = 34
SHEETS: Final = ("pantheon", "zilean", "brand")
ICONS: Final = ("spear", "fire", "clock")


def clean_alpha(pixels: np.ndarray) -> np.ndarray:
    pixels = pixels.copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    red, green, blue = (pixels[:, :, c].astype(float) for c in range(3))
    fringe = (red > green * 1.3 + 8) & (blue > green * 1.3 + 8) & (red > blue * 0.6) & (blue > red * 0.6)
    pixels[fringe, 3] = 0
    return pixels


def run_processor(raw: Path, out: Path, rows: int, cols: int, mode: str) -> list[str]:
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(raw), "--target", "player" if rows > 1 else "asset",
               "--mode", mode, "--rows", str(rows), "--cols", str(cols), "--output-dir", str(out), "--cell-size", "256",
               "--fit-scale", "0.9", "--align", "feet" if rows > 1 else "center", "--scale-strategy", "fit",
               "--component-mode", "largest", "--component-padding", "0", "--trim-border", "0", "--strict-qc"]
    if rows > 1:
        # 공격 프레임의 뻗은 창/불꽃이 원본 셀 가장자리에 닿는다고 판정된다(눈으로 확인: 셀 안에 완전히 들어 있음). processor 는 여기서
        # 크로마키 정리·빈 프레임 검사용이고 실제 runtime 픽셀은 아래에서 raw-sheet-clean 에 시트 공통 배율을 직접 적용하므로
        # 프레임별 fit 썸네일과 몸체 배율 CV 는 최종 검사에 쓰지 않는다.
        command += ["--allow-source-edge-touch"]
    subprocess.run(command, check=True, capture_output=True, text=True)
    return command


def main() -> None:
    preview = Image.new("RGBA", (CELL * 8 + 16, CELL * 3 + 48), (30, 33, 43, 255))
    for row_i, name in enumerate(SHEETS):
        raw = ROOT / name / f"{name}-raw.png"
        std = ROOT / name / "standard"
        command = run_processor(raw, std, 4, 2, "idle")
        with Image.open(std / "raw-sheet-clean.png") as image:
            clean = image.convert("RGBA")
        cw, ch = clean.width // 2, clean.height // 4
        frames = [clean.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(4) for c in range(2)]
        # 시트 공통 배율: idle 프레임 높이가 BODY_TARGET 이 되게 (앉기·점프 프레임도 같은 배율)
        idle_bbox = frames[0].getbbox(); assert idle_bbox
        scale = BODY_TARGET / (idle_bbox[3] - idle_bbox[1])
        sheet = Image.new("RGBA", (CELL * 2, CELL * 4))
        bounds = []
        for i, frame in enumerate(frames):
            bbox = frame.getbbox(); assert bbox, f"{name} frame {i} empty"
            subject = frame.crop(bbox)
            small = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
            small = Image.fromarray(clean_alpha(np.asarray(small)))
            # 발 기준: 원본 셀 안에서의 바닥 위치를 유지하지 않고 각 프레임 알파 바닥을 FEET 에 둔다(점프 프레임은 몸이 뜬 상태로 그려졌으므로 그대로)
            cell = Image.new("RGBA", (CELL, CELL))
            x = CELL // 2 - small.width // 2
            y = FEET - small.height
            if y < 0 or x < 0 or x + small.width > CELL:
                raise SystemExit(f"{name} frame {i} does not fit: {small.size}")
            cell.paste(small, (x, y))
            sheet.paste(cell, ((i % 2) * CELL, (i // 2) * CELL))
            bounds.append(cell.getbbox())
        out = GAME / "assets/sprites" / f"subrio_{name}.png"
        sheet.save(out)
        contract = {"asset": str(out.relative_to(GAME)), "cell": [CELL, CELL], "grid": "2 cols x 4 rows, row-major: idle, walk1, walk2, walk3, jump, crouch, attack, guard",
                    "feetY": FEET, "scale": scale, "frameBounds": bounds, "sampling": "NEAREST", "binaryAlpha": True, "command": command,
                    "model": "openai/gpt-image-2 via OpenGateway images/edits (single image field, identity ref)"}
        (ROOT / name / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
        for i in range(8):
            preview.alpha_composite(sheet.crop(((i % 2) * CELL, (i // 2) * CELL, (i % 2 + 1) * CELL, (i // 2 + 1) * CELL)), (8 + i * CELL, 8 + row_i * (CELL + 8)))
        print(name, "scale", round(scale, 4), "bounds", bounds[:2], "...")
    for i, name in enumerate(ICONS):
        raw = ROOT / "icons" / f"{name}-raw.png"
        std = ROOT / "icons" / f"{name}-standard"
        command = run_processor(raw, std, 1, 1, "single")
        with Image.open(std / "raw-sheet-clean.png") as image:
            clean = image.convert("RGBA")
        bbox = clean.getbbox(); subject = clean.crop(bbox)
        s = min(30 / subject.width, 30 / subject.height)
        small = Image.fromarray(clean_alpha(np.asarray(subject.resize((round(subject.width * s), round(subject.height * s)), Image.Resampling.NEAREST))))
        icon = Image.new("RGBA", (32, 32)); icon.paste(small, (16 - small.width // 2, 16 - small.height // 2))
        out = GAME / "assets/props" / f"subrio_icon_{name}.png"; icon.save(out)
        (ROOT / "icons" / f"{name}-runtime-contract.json").write_text(json.dumps({"asset": str(out.relative_to(GAME)), "size": [32, 32], "bounds": icon.getbbox(), "scale": s, "command": command}, indent=2) + "\n")
        preview.alpha_composite(icon.resize((32, 32)), (8 + i * 40, 8 + 3 * (CELL + 8)))
        print(name, "icon bounds", icon.getbbox())
    preview.save(ROOT / "preview.png")
    preview.resize((preview.width * 3, preview.height * 3), Image.Resampling.NEAREST).save(ROOT / "preview-3x.png")


if __name__ == "__main__":
    main()
