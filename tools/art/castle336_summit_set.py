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

import numpy as np
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
    # 시작(구름에서 올라오는 계단+길) → 길 → 부서진 끝 (BUILD340 사용자 “오른쪽길 너무 긴듯”: 한 조각 줄임)
    start, walk, edge = piece('start'), piece('walkway'), piece('edge')
    order = [start, walk]
    full = Image.new('RGB', (PIECE_W * (len(order) + 1), H), (0, 0, 0))
    for i, im in enumerate(order):
        full.paste(im, (i * PIECE_W, 0))
    shifted = Image.new('RGB', (PIECE_W, H), (0, 0, 0))
    shifted.paste(edge, (0, EDGE_SHIFT))
    shifted.paste(edge.crop((0, 0, PIECE_W, EDGE_SHIFT)), (0, 0))
    # 길 → 부서진 끝 이음새: 120px 에 걸쳐 섞어 다리가 끊겨 보이지 않게(사용자 “기존다리랑 잘려보이잖아”)
    x0 = len(order) * PIECE_W
    blend = 120
    left = np.asarray(full.crop((x0 - blend, 0, x0, H))).astype(float)
    right = np.asarray(shifted.crop((0, 0, blend, H))).astype(float)
    full.paste(shifted, (x0, 0))
    k = np.linspace(0, 1, blend * 2)[None, :, None]
    span = np.concatenate([left, np.asarray(shifted.crop((0, 0, blend, H))).astype(float)], axis=1)
    base = np.concatenate([left, left[:, ::-1][:, :blend]], axis=1)
    mixed = span * k + np.concatenate([left, right], axis=1) * (1 - k)
    # 왼쪽 길의 오른쪽 끝을 부서진 끝 조각 앞쪽으로 서서히 넘긴다
    walk_ext = np.asarray(full.crop((x0 - blend, 0, x0 + blend, H))).astype(float)
    tail = np.asarray(walk.crop((PIECE_W - blend * 2, 0, PIECE_W, H))).astype(float) if False else walk_ext
    full.paste(Image.fromarray(np.clip(mixed, 0, 255).astype(np.uint8)), (x0 - blend, 0))
    for i in range(len(order) + 1):
        full.crop((i * PIECE_W, 0, (i + 1) * PIECE_W, H)).save(f'assets/props/summit336_chunk_{i}.png')
    for i in range(len(order) + 1, 8):
        Path(f'assets/props/summit336_chunk_{i}.png').unlink(missing_ok=True)
    full.resize((full.width // 6, H // 6), Image.BOX).save(SRC / 'overview.png')
    print('width', full.width)


if __name__ == '__main__':
    main()
