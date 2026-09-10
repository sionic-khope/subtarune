#!/usr/bin/env python3
"""AI 생성 캐릭터 시트(보라 배경, 4행x4열/캐릭터) → 게임용 스프라이트 시트 변환.

입력 시트 레이아웃(캐릭터당 4열): 행0=정면(down) 행1=왼쪽(left) 행2=오른쪽(right) 행3=뒷모습(up)
출력: assets/sprites/<id>.png  = 4열(걷기 프레임) x 4행 [down, up, left, right]. 2x 해상도(원본 1/3)
      assets/portraits/<id>.png = 96x96(2x) 초상화 (정면 0번 프레임의 머리 부분, 원본 그대로에 가깝게)
사용: python3 tools/sprites/slice_sheet.py [--sprites-only] sheet.png hyungsub gyeongsub ppaman
필요: pip install pillow numpy
"""
import sys
from collections import deque
from PIL import Image
import numpy as np
import numpy.typing as npt

# 시트는 '2x 해상도'로 저장한다 (게임은 논리 320x240 을 2배로 렌더). 원본 셀을 DOWN 분의 1로 축소해 그대로 쓴다.
CELL_TARGET_H = 100      # 시트 '셀' 높이를 이 값(2x px)에 맞춘다 → 기준 시트(셀 199px)는 정확히 1/2 (원본 누끼 그대로). 다른 시트도 같은 비율
MIN_FW = 32              # 프레임 최소 폭(2x 기준, 짝수)
PALETTE_COLORS = 16
ROW_MAP = {'down': 0, 'left': 1, 'right': 2, 'up': 3}   # 입력 행
OUT_ROWS = ['down', 'up', 'left', 'right']                # 출력 행 (엔진 규격)


def runs(v, thr=0.3):
    out, start = [], None
    for i, x in enumerate(v):
        if x > thr and start is None: start = i
        if x <= thr and start is not None: out.append((start, i)); start = None
    if start is not None: out.append((start, len(v)))
    return out


def detect_grid(im):
    corner = im[5:40, 5:40].reshape(-1, 3).mean(0)
    mask = np.abs(im - corner).sum(2) > 40
    cols = [r for r in runs(mask.mean(0)) if r[1] - r[0] > 40]
    rows = [r for r in runs(mask.mean(1)) if r[1] - r[0] > 80]
    return cols, rows


def key_cell(cell: npt.NDArray[np.int64]) -> Image.Image:
    """가장자리에 연결된 배경만 제거하고 내부 색과 외곽선은 보존한다."""
    edge = np.concatenate([cell[2:14, 2:14].reshape(-1, 3), cell[-14:-2, 2:14].reshape(-1, 3),
                           cell[2:14, -14:-2].reshape(-1, 3), cell[-14:-2, -14:-2].reshape(-1, 3)])
    bg = np.median(edge, 0)
    d = np.abs(cell - bg).sum(2)
    purple_fringe = (cell[..., 0] > cell[..., 1] + 20) & (cell[..., 2] > cell[..., 0] + 10) & (d <= 240)
    background = (d <= 90) | purple_fringe
    height, width = background.shape
    alpha = np.ones((height, width), dtype=np.bool_)
    pending: deque[tuple[int, int]] = deque()
    border = [(y, x) for y in range(height) for x in (0, width - 1)]
    border += [(y, x) for x in range(width) for y in (0, height - 1)]
    for y, x in border:
        if background[y, x] and alpha[y, x]:
            alpha[y, x] = False
            pending.append((y, x))
    while pending:
        y, x = pending.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < height and 0 <= nx < width and background[ny, nx] and alpha[ny, nx]:
                alpha[ny, nx] = False
                pending.append((ny, nx))
    rgb = cell.copy()
    rgb[alpha == 0] = 0                           # 투명 픽셀 색을 0으로 → 축소 시 보라가 섞이지 않음
    rgba = np.dstack([rgb, (alpha * 255)]).astype('uint8')
    return Image.fromarray(rgba, 'RGBA')


def quantize_to_palette(img, palette_img, n=None):
    """다운스케일된 이미지 색을 원본 팔레트 최근접 색으로 스냅 (도트 느낌 유지)"""
    n = n or PALETTE_COLORS
    pal = np.array(palette_img.getpalette()[:n * 3]).reshape(-1, 3).astype(int)
    a = np.array(img).astype(int)
    rgb, alpha = a[..., :3], a[..., 3]
    dist = ((rgb[..., None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    idx = dist.argmin(-1)
    out = pal[idx]
    out = np.dstack([out, np.where(alpha > 127, 255, 0)]).astype('uint8')
    return Image.fromarray(out, 'RGBA')


def align_frames(frames: list[Image.Image], downsample: int) -> list[Image.Image]:
    """방향별 공통 영역을 정수 축소 격자에 맞춰 잘라 프레임 기준점을 보존한다."""
    bounds = [box for frame in frames if (box := frame.getbbox()) is not None]
    if not bounds:
        return [Image.new('RGBA', (downsample, downsample)) for _ in frames]
    left = min(box[0] for box in bounds) // downsample * downsample
    top = min(box[1] for box in bounds) // downsample * downsample
    right = (max(box[2] for box in bounds) + downsample - 1) // downsample * downsample
    bottom = (max(box[3] for box in bounds) + downsample - 1) // downsample * downsample
    return [frame.crop((left, top, right, bottom)) for frame in frames]


def process_cell(crop: Image.Image, frame_size: tuple[int, int], scale: float) -> Image.Image:
    """공통 영역에서 자른 RGBA 프레임을 같은 격자로 축소하고 하단 중앙에 놓는다."""
    fw, fh = frame_size
    w = max(1, round(crop.width * scale)); h = max(1, round(crop.height * scale))
    small = crop.resize((w, h), Image.Resampling.NEAREST)  # 원본 도트 색을 평균내지 않는다
    a = np.array(small); a[..., 3] = np.where(a[..., 3] > 127, 255, 0); small = Image.fromarray(a, 'RGBA')
    frame = Image.new('RGBA', frame_size)
    frame.paste(small, ((fw - w) // 2, fh - h), small)
    return frame


def make_portrait(cell_rgb, size=96, head_ratio=0.56):
    rgba = key_cell(cell_rgb)
    a = np.array(rgba)[..., 3]
    ys, xs = np.where(a > 127)
    crop = rgba.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    head = crop.crop((0, 0, crop.width, int(crop.height * head_ratio)))
    scale = min(size / head.width, (size - 2) / head.height)
    w, h = max(1, round(head.width * scale)), max(1, round(head.height * scale))
    small = head.resize((w, h), Image.Resampling.NEAREST)
    a = np.array(small); a[..., 3] = np.where(a[..., 3] > 127, 255, 0); small = Image.fromarray(a, 'RGBA')
    out = Image.new('RGBA', (size, size))
    out.paste(small, ((size - w) // 2, size - h - 1), small)
    return out


def main() -> None:
    args = sys.argv[1:]
    sprites_only = args[0] == '--sprites-only'
    if sprites_only:
        args = args[1:]
    src, ids = args[0], args[1:]
    img = Image.open(src).convert('RGB')
    im = np.array(img).astype(int)
    cols, rows = detect_grid(im)
    assert len(rows) == 4, f'행 4개 기대, {len(rows)}개 감지'
    assert len(cols) == 4 * len(ids), f'열 {4*len(ids)}개 기대, {len(cols)}개 감지'
    print(f'grid: {len(cols)} cols x {len(rows)} rows')
    import os; os.makedirs('assets/sprites', exist_ok=True)
    if not sprites_only:
        os.makedirs('assets/portraits', exist_ok=True)
    for ci, cid in enumerate(ids):
        cell_h = rows[0][1] - rows[0][0]
        downsample = max(1, round(cell_h / CELL_TARGET_H))
        scale = 1.0 / downsample
        # 방향별 네 프레임은 같은 원본 영역과 축소 격자를 쓰고, 출력 크기는 16셀 전체에 맞춘다.
        crops: dict[int, list[Image.Image]] = {}
        for ri in range(4):
            frames: list[Image.Image] = []
            for f in range(4):
                x0, x1 = cols[ci * 4 + f]; y0, y1 = rows[ri]
                frames.append(key_cell(im[y0:y1, x0:x1]))
            crops[ri] = align_frames(frames, downsample)
        max_h = max(round(c.height * scale) for row in crops.values() for c in row)
        max_w = max(round(c.width * scale) for row in crops.values() for c in row)
        FW = max(MIN_FW, max_w + 2 + (max_w % 2))
        FH = max_h + 2 + (max_h % 2)
        sheet = Image.new('RGBA', (FW * 4, FH * 4))
        for oi, dirname in enumerate(OUT_ROWS):
            ri = ROW_MAP[dirname]
            for f in range(4):
                frame = process_cell(crops[ri][f], (FW, FH), scale)
                sheet.paste(frame, (f * FW, oi * FH))
        out = f'assets/sprites/{cid}.png'
        sheet.save(out)
        print('wrote', out, sheet.size)
        if not sprites_only:
            x0, x1 = cols[ci * 4]; y0, y1 = rows[ROW_MAP['down']]
            make_portrait(im[y0:y1, x0:x1]).save(f'assets/portraits/{cid}.png')
            print('wrote', f'assets/portraits/{cid}.png')


if __name__ == '__main__':
    main()
