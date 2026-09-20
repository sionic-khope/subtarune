# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
"""벚꽃 숲 5 자산 가공(BUILD271): gpt-image 4×4 걷기 시트(1024×1024, 마젠타 배경) → 마젠타 색키 → tools/sprites/sheet_processor.py 로
공통 배율·발 바닥 정렬(가순이 1·2·3 export.py 와 같은 인자, 도현만 fit-scale 0.92 로 더 길쭉하게) → 64px 제작 셀 → 게임용 512×512 `assets/sprites/<name>.png` + 초상화.
거대 벚꽃 나무: tree-raw.png 색키 → 여백 잘라 1/3 로 축소(NEAREST) → `assets/props/sakura_giant_tree.png`.
실행: /usr/bin/python3 assets/source/sakura5-v1/export.py [dohyun domijorim gasuni4 gasuni5 gasuni6 tree domijorim-battle dohyun-battle domijorim-battle-idle dohyun-battle-idle]  (저장소 루트에서, 인자 없으면 전부)"""
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
FIT = {"dohyun": "0.74", "domijorim": "0.84"}   # 도현: 처음 0.92(“얇고 살짝 길죽하게”)에서 사용자 “비율 키 20퍼 줄여라” → ×0.8 = 0.74. 도미조림 2등신 시트는 기본
SHEETS = ("dohyun", "domijorim", "gasuni4", "gasuni5", "gasuni6")
TREE_SCALE = 3                     # 1024 원본 → 1/3


def key_magenta(image: Image.Image, tol: int = 60) -> Image.Image:
    pixels = np.array(image.convert("RGBA"))
    r, g, b = pixels[:, :, 0].astype(int), pixels[:, :, 1].astype(int), pixels[:, :, 2].astype(int)
    magenta = (r > 255 - tol) & (b > 255 - tol) & (g < tol)
    pixels[magenta, 3] = 0
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(pixels)


def export_sheet(name: str) -> None:
    clean = key_magenta(Image.open(ROOT / f"{name}-raw.png"))
    clean.save(ROOT / f"{name}-clean.png")
    out_dir = ROOT / f"processor-{name}"
    subprocess.run([
        sys.executable, str(REPO / "tools/sprites/sheet_processor.py"), "process",
        "--input", str(ROOT / f"{name}-clean.png"),
        "--target", "player", "--mode", "player_sheet",
        "--rows", "4", "--cols", "4", "--cell-size", str(CELL),
        "--output-dir", str(out_dir),
        "--fit-scale", FIT.get(name, "0.84"), "--align", "bottom", "--shared-scale",
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
    sheet.save(ROOT / f"{name}-64.png")
    runtime = sheet.resize((CELL * 8, CELL * 8), Image.Resampling.NEAREST)
    runtime.save(REPO / "assets/sprites" / f"{name}.png")
    face = runtime.crop((0, 0, 128, 128))
    bbox = face.getbbox()
    top = bbox[1] if bbox else 20
    face.crop((34, top - 2, 96, top + 60)).resize((96, 96), Image.Resampling.NEAREST).save(REPO / "assets/portraits" / f"{name}.png")
    print(name, "runtime", runtime.size, "frame0 bbox", bbox)


BATTLE_SCALE = 6.5                 # 1024 원본(인물이 세로 85~90%) → 게임 전투 그림 약 130~150px(다오·배찌 120px scale 1.2 와 비슷한 크기)
BATTLE_RAW = {"domijorim": "domijorim-battle2-raw.png", "dohyun": "dohyun-battle2-raw.png"}   # 2차 생성(2등신 도미조림·손 든 도현, 왼쪽 아래 3/4 시점)


def export_battle(name: str) -> None:
    """적군 전투 스프라이트(사용자 2026-09-20 “도미조림은 얼린 홍어를 한 손에, 반댓손엔 횃불 / 도현이는 손도끼 하나”): 색키 → 여백 잘라 축소 → assets/enemies/<name>-battle.png"""
    clean = key_magenta(Image.open(ROOT / BATTLE_RAW.get(name, f"{name}-battle-raw.png")))
    crop = clean.crop(clean.getbbox())
    w, h = crop.size
    small = crop.resize((round(w / BATTLE_SCALE), round(h / BATTLE_SCALE)), Image.Resampling.NEAREST)
    small.save(REPO / "assets/enemies" / f"{name}-battle.png")
    print(name, "battle", small.size)


IDLE_CELL = 160                    # 전투 대기 시트 셀(2×2). 인물 최대 키가 셀 - 8 이 되게 네 칸 공통 배율(발 = 셀 아래 4px)


def export_battle_idle(name: str) -> None:
    """전투 대기 모션(사용자 “전투 모션으로 두라고, 정적인 이미지 흔들거리지 말고”): gpt-image 2×2 그리드(1024, 칸 512) → 색키 → 칸별 여백 → 공통 배율 → 160 셀 2×2 시트 assets/enemies/<name>-battle-idle.png.
    enemies.js: sheet {cols 2, rows 2, count 4, fps, px 1}, pivot [80, 156], idle sway 0."""
    clean = key_magenta(Image.open(ROOT / f"{name}-battle-idle-raw.png"))
    cells = [clean.crop((c * 512, r * 512, (c + 1) * 512, (r + 1) * 512)) for r in range(2) for c in range(2)]
    crops = [cell.crop(cell.getbbox()) for cell in cells]
    scale = (IDLE_CELL - 8) / max(c.height for c in crops)
    sheet = Image.new("RGBA", (IDLE_CELL * 2, IDLE_CELL * 2))
    for i, crop in enumerate(crops):
        w, h = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
        assert w <= IDLE_CELL, f"{name} 칸 {i} 폭 {w} > {IDLE_CELL}"
        sized = crop.resize((w, h), Image.Resampling.NEAREST)
        sheet.paste(sized, ((i % 2) * IDLE_CELL + (IDLE_CELL - w) // 2, (i // 2) * IDLE_CELL + IDLE_CELL - 4 - h))
    out = REPO / "assets/enemies" / f"{name}-battle-idle.png"; sheet.save(out)
    print(name, "battle-idle", sheet.size, "scale", round(scale, 3), "heights", [round(c.height * scale) for c in crops])


def export_tree() -> None:
    clean = key_magenta(Image.open(ROOT / "tree-raw.png"))
    bbox = clean.getbbox()
    crop = clean.crop(bbox)
    w, h = crop.size
    small = crop.resize((w // TREE_SCALE, h // TREE_SCALE), Image.Resampling.NEAREST)
    small.save(REPO / "assets/props/sakura_giant_tree.png")
    print("tree", bbox, "->", small.size)


if __name__ == "__main__":
    targets = sys.argv[1:] or [*SHEETS, "tree", "domijorim-battle", "dohyun-battle"]
    for target in targets:
        if target == "tree":
            export_tree()
        elif target.endswith("-battle-idle"):
            export_battle_idle(target[: -len("-battle-idle")])
        elif target.endswith("-battle"):
            export_battle(target[: -len("-battle")])
        else:
            export_sheet(target)
