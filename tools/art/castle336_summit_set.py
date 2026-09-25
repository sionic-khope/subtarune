#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
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
CUT = 60                 # 끝 조각 왼쪽에서 버릴 폭(이음새 기둥 중복)
STUB = (64, 208, 400, 720)   # 위로 올라오는 짧은 계단: x0, x1, 위 y, 아래 y


def piece(name: str, src: Path = SRC) -> Image.Image:
    return Image.open(src / f'{name}-raw.png').convert('RGB').resize((PIECE_W, H), Image.BOX)


def main() -> None:
    # BUILD342(사용자 “오른쪽길 30% 줄여”, “이벤트 지점 다리가 부자연스럽게 이어져”): 시작 조각 바로 뒤에
    # 기존 길 그림을 참조로 다시 그린 부서진 끝 조각(teen342/edge2) — 왼쪽은 기존 길과 같은 높이·원근이라 섞지 않고 그대로 붙는다.
    edge = piece('edge2', Path('assets/source/teen342'))
    # 이음새에 난간 기둥이 둘 겹치고 떠 있는 돌판이 잘리므로 끝 조각의 왼쪽 CUT px 를 버리고, 오른쪽 허공을 거울로 채운다
    trimmed = Image.new('RGB', (PIECE_W, H))
    trimmed.paste(edge.crop((CUT, 0, PIECE_W, H)), (0, 0))
    trimmed.paste(edge.crop((PIECE_W - CUT, 0, PIECE_W, H)).transpose(Image.FLIP_LEFT_RIGHT), (PIECE_W - CUT, 0))
    order = [piece('start'), trimmed]
    full = Image.new('RGB', (PIECE_W * len(order), H), (0, 0, 0))
    for i, im in enumerate(order):
        full.paste(im, (i * PIECE_W, 0))
    for i in range(len(order)):
        full.crop((i * PIECE_W, 0, (i + 1) * PIECE_W, H)).save(f'assets/props/summit336_chunk_{i}.png')
    for i in range(len(order), 8):
        Path(f'assets/props/summit336_chunk_{i}.png').unlink(missing_ok=True)
    full.resize((full.width // 6, H // 6), Image.BOX).save(SRC / 'overview.png')
    print('width', full.width)


if __name__ == '__main__':
    main()
