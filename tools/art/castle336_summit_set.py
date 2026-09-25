#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Run: uv run tools/art/castle336_summit_set.py
# ──────────────────
"""BUILD336 tower summit walkway, assembled from generated art (assets/source/summit336, gpt-image-2.5-sunburst).

start-raw (stair rising from the clouds onto the walkway) + walkway-raw + mirrored walkway-raw + edge-raw
(the broken end, shifted down to line its floor up). Output: 1152-wide chunks.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path('assets/source/summit336')
SCALE = 0.75
PIECE_W, H = 1152, 768
EDGE_SHIFT = 30          # edge 조각의 바닥이 walkway 보다 raw 40px(=30px) 높다
COPIES = 3
STUB = (64, 208, 400, 720)   # 위로 올라오는 짧은 계단: x0, x1, 위 y, 아래 y


def piece(name: str) -> Image.Image:
    return Image.open(SRC / f'{name}-raw.png').convert('RGB').resize((PIECE_W, H), Image.BOX)


def main() -> None:
    # 시작(구름에서 올라오는 계단+이어지는 길) → 길 → 길(좌우 반전) → 부서진 끝
    start, walk, edge = piece('start'), piece('walkway'), piece('edge')
    order = [start, walk, walk.transpose(Image.FLIP_LEFT_RIGHT)]
    full = Image.new('RGB', (PIECE_W * (len(order) + 1), H), (0, 0, 0))
    for i, im in enumerate(order):
        full.paste(im, (i * PIECE_W, 0))
    shifted = Image.new('RGB', (PIECE_W, H), (0, 0, 0))
    shifted.paste(edge, (0, EDGE_SHIFT))
    shifted.paste(edge.crop((0, 0, PIECE_W, EDGE_SHIFT)), (0, 0))
    full.paste(shifted, (len(order) * PIECE_W, 0))
    for i in range(len(order) + 1):
        full.crop((i * PIECE_W, 0, (i + 1) * PIECE_W, H)).save(f'assets/props/summit336_chunk_{i}.png')
    full.resize((full.width // 6, H // 6), Image.BOX).save(SRC / 'overview.png')
    print('width', full.width)


if __name__ == '__main__':
    main()
