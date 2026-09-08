#!/usr/bin/env python3
"""AI 생성 캐릭터 시트(보라 배경, 4행x4열/캐릭터) → 게임용 스프라이트 시트 변환.

입력 시트 레이아웃(캐릭터당 4열): 행0=정면(down) 행1=왼쪽(left) 행2=오른쪽(right) 행3=뒷모습(up)
출력: assets/sprites/<id>.png  = 4열(걷기 프레임) x 4행 [down, up, left, right], 프레임 FW x FH
      assets/portraits/<id>.png = 48x48 초상화 (정면 0번 프레임의 머리 부분, 원본 해상도에서 축소)
사용: python3 tools/sprites/slice_sheet.py sheet.png hyungsub gyeongsub ppaman
필요: pip install pillow numpy
"""
import sys
from PIL import Image
import numpy as np

FH = 28                  # 출력 프레임 높이
TARGET_H = 26            # 캐릭터 높이(px) — 2px 머리 여유
MIN_FW = 16              # 프레임 최소 폭. 넓은 캐릭터는 자동으로 넓어진다(짝수)
ROW_MAP = {'down': 0, 'left': 1, 'right': 2, 'up': 3}   # 입력 행
OUT_ROWS = ['down', 'up', 'left', 'right']                # 출력 행 (엔진 규격)
PALETTE_COLORS = 10


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


EDGE_TRIM = 4            # 셀 테두리 잔선 제거(px)


def key_cell(cell):
    """셀 배경(보라) 제거 → RGBA (테두리 EDGE_TRIM px 는 잘라낸다)"""
    cell = cell[EDGE_TRIM:-EDGE_TRIM, EDGE_TRIM:-EDGE_TRIM]
    edge = np.concatenate([cell[2:14, 2:14].reshape(-1, 3), cell[-14:-2, 2:14].reshape(-1, 3),
                           cell[2:14, -14:-2].reshape(-1, 3), cell[-14:-2, -14:-2].reshape(-1, 3)])
    bg = np.median(edge, 0)
    d = np.abs(cell - bg).sum(2)
    alpha = np.clip((d - 35) / 40.0, 0, 1)      # 35~75 사이 부드럽게
    rgba = np.dstack([cell, (alpha * 255)]).astype('uint8')
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


def char_crop(cell_rgb):
    rgba = key_cell(cell_rgb)
    a = np.array(rgba)[..., 3]
    ys, xs = np.where(a > 127)
    if len(xs) == 0: return None
    return rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def process_cell(cell_rgb, FW, scale):
    crop = char_crop(cell_rgb)
    if crop is None: return Image.new('RGBA', (FW, FH))
    w = max(1, round(crop.width * scale)); h = max(1, round(crop.height * scale))
    small = crop.resize((w, h), Image.BOX)
    # 팔레트: 원본 캐릭터 픽셀만으로 양자화
    opaque = crop.convert('RGBA')
    bgfill = Image.new('RGBA', opaque.size, (0, 0, 0, 255)); bgfill.alpha_composite(opaque)
    pal_img = bgfill.convert('RGB').quantize(PALETTE_COLORS, method=Image.Quantize.MEDIANCUT)
    small = quantize_to_palette(small, pal_img)
    frame = Image.new('RGBA', (FW, FH))
    frame.paste(small, ((FW - w) // 2, FH - h), small)
    return frame


def make_portrait(cell_rgb, size=48, head_ratio=0.56):
    rgba = key_cell(cell_rgb)
    a = np.array(rgba)[..., 3]
    ys, xs = np.where(a > 127)
    crop = rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    head = crop.crop((0, 0, crop.width, int(crop.height * head_ratio)))
    scale = min(size / head.width, (size - 2) / head.height)
    w, h = max(1, round(head.width * scale)), max(1, round(head.height * scale))
    small = head.resize((w, h), Image.BOX)
    bgfill = Image.new('RGBA', crop.size, (0, 0, 0, 255)); bgfill.alpha_composite(crop)
    pal_img = bgfill.convert('RGB').quantize(PALETTE_COLORS + 4, method=Image.Quantize.MEDIANCUT)
    small = quantize_to_palette(small, pal_img, PALETTE_COLORS + 4)
    out = Image.new('RGBA', (size, size))
    out.paste(small, ((size - w) // 2, size - h - 1), small)
    return out


def main():
    src, ids = sys.argv[1], sys.argv[2:]
    img = Image.open(src).convert('RGB')
    im = np.array(img).astype(int)
    cols, rows = detect_grid(im)
    assert len(rows) == 4, f'행 4개 기대, {len(rows)}개 감지'
    assert len(cols) == 4 * len(ids), f'열 {4*len(ids)}개 기대, {len(cols)}개 감지'
    print(f'grid: {len(cols)} cols x {len(rows)} rows')
    import os; os.makedirs('assets/sprites', exist_ok=True); os.makedirs('assets/portraits', exist_ok=True)
    for ci, cid in enumerate(ids):
        # 캐릭터 전체 16셀의 최대 높이 기준으로 스케일 하나를 정한다 (프레임끼리 크기 튐 방지)
        crops = {}
        for ri in range(4):
            for f in range(4):
                x0, x1 = cols[ci * 4 + f]; y0, y1 = rows[ri]
                crops[(ri, f)] = char_crop(im[y0:y1, x0:x1])
        max_h = max(c.height for c in crops.values() if c is not None)
        scale = TARGET_H / max_h
        max_w = max(round(c.width * scale) for c in crops.values() if c is not None)
        FW = max(MIN_FW, max_w + 2 + (max_w % 2))
        sheet = Image.new('RGBA', (FW * 4, FH * 4))
        for oi, dirname in enumerate(OUT_ROWS):
            ri = ROW_MAP[dirname]
            for f in range(4):
                x0, x1 = cols[ci * 4 + f]; y0, y1 = rows[ri]
                frame = process_cell(im[y0:y1, x0:x1], FW, scale)
                sheet.paste(frame, (f * FW, oi * FH))
        out = f'assets/sprites/{cid}.png'
        sheet.save(out)
        print('wrote', out, sheet.size)
        x0, x1 = cols[ci * 4]; y0, y1 = rows[ROW_MAP['down']]
        make_portrait(im[y0:y1, x0:x1]).save(f'assets/portraits/{cid}.png')
        print('wrote', f'assets/portraits/{cid}.png')


if __name__ == '__main__':
    main()
