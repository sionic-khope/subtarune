# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
"""자세(모션) 그리드 → 128px 4프레임 띠(BUILD272): gpt-image 2×2 그리드(1024, 칸 512, 마젠타 배경) → 색키 → 칸별 여백 자르기 → 캐릭터 공통 배율(걷기 시트 정면 0번 키와 맞춤)
→ 128 칸(발 [64,120]) 4장 가로 띠 `assets/sprites/<name>-<motion>.png`. 배율은 그리드 안 ‘서 있는’ 칸(REF_CELL)의 키가 걷기 키 × 보정(REF_FACTOR)이 되게 한 값을 네 칸에 똑같이 쓴다(프레임마다 bbox 를 꽉 채우지 않는다 — 몸 크기 진동 금지).
실행: /usr/bin/python3 assets/source/sakura5-v1/poses_export.py [domijorim-heumi domijorim-leap dohyun-wave dohyun-leap]"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
CELL = 128
GRID = 512
# 모션: (캐릭터, 기준 칸 index(0~3), 기준 칸 키 / 걷기 키 비율 — 팔을 든 자세는 걷기보다 커야 한다)
MOTIONS = {
    'domijorim-heumi': ('domijorim', 3, 1.02),
    'domijorim-leap': ('domijorim', 3, 1.18),
    'dohyun-wave': ('dohyun', 0, 1.0),
    'dohyun-leap': ('dohyun', 3, 1.02),
}


def key_magenta(image: Image.Image, tol: int = 60) -> Image.Image:
    pixels = np.array(image.convert("RGBA"))
    r, g, b = pixels[:, :, 0].astype(int), pixels[:, :, 1].astype(int), pixels[:, :, 2].astype(int)
    pixels[(r > 255 - tol) & (b > 255 - tol) & (g < tol), 3] = 0
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(pixels)


def walk_height(character: str) -> int:
    sheet = Image.open(REPO / 'assets/sprites' / f'{character}.png').crop((0, 0, CELL, CELL))
    bbox = sheet.getbbox(); return bbox[3] - bbox[1]


def export(name: str) -> None:
    character, ref_cell, factor = MOTIONS[name]
    clean = key_magenta(Image.open(ROOT / f'{name}-raw.png'))
    cells = [clean.crop((c * GRID, r * GRID, (c + 1) * GRID, (r + 1) * GRID)) for r in range(2) for c in range(2)]
    crops = [cell.crop(cell.getbbox()) for cell in cells]
    target = walk_height(character) * factor
    scale = target / crops[ref_cell].height
    strip = Image.new('RGBA', (CELL * 4, CELL))
    for i, crop in enumerate(crops):
        w, h = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
        sized = crop.resize((w, h), Image.Resampling.NEAREST)
        assert w <= CELL and h <= CELL, f'{name} 칸 {i} 이 128 을 넘는다 ({w}×{h})'
        strip.paste(sized, (i * CELL + (CELL - w) // 2, CELL - 8 - h))
    out = REPO / 'assets/sprites' / f'{name}.png'; strip.save(out)
    print(name, 'scale', round(scale, 3), 'heights', [round(c.height * scale) for c in crops], '→', out.name)


if __name__ == '__main__':
    for target in (sys.argv[1:] or list(MOTIONS)):
        export(target)
