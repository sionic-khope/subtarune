#!/usr/bin/env python3
"""BUILD402 집(방·복도·거실) 소품·타일 가벼운 강화 — 사용자 2026-09-28 “너무 도트풍, 완전 고퀄은 아니고” → 샘플 1(가볍게) 선택.

각 원본 PNG 를 정수 배율로 키워 마젠타 위에 올린 참조로 gpt-image-2.5-sunburst 에 같은 그림·같은 크기로 명암 한 단계만 올려 달라고 하고,
결과를 원본과 똑같은 픽셀 크기·자리로 되돌린다(칸 가운데 샘플링 + 색 수 정리). 원본은 assets/source/home402/orig 에 보관.

  python3 tools/sprites/home402_enhance.py gen [이름…]    생성(raw → assets/source/home402/raw)
  python3 tools/sprites/home402_enhance.py apply [이름…]  raw → assets/props|tiles 교체
"""
import sys, subprocess, shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/source/home402'
ORIG, RAW = SRC / 'orig', SRC / 'raw'
MAG = (255, 0, 255)

PROPS = ['bed', 'desk_pc', 'door', 'window', 'poster', 'shelf', 'tv', 'sofa', 'side_cabinet', 'plant', 'table_low',
         'rug_living', 'cushion', 'fridge', 'stove', 'counter_sink', 'clock', 'calendar', 'cabinet_upper', 'frame',
         'shovel', 'doorway_right', 'doorway_left', 'tart']
TILES = ['wallpaper', 'wallpaper_base', 'wall_edge', 'floor_vinyl', 'floor_vinyl2', 'wallpaper2', 'wallpaper2_base',
         'floor_plank', 'floor_plank2', 'floor_kitchen', 'floor_kitchen2']

STYLE = ('Keep it clearly chunky pixel art in a cute Deltarune/Undertale-like style, NOT painterly, NOT high-detail, NOT realistic, NOT 3D. '
         'Upgrade level LIGHT: keep the exact same object, silhouette, proportions, outline and color palette, and only add one extra '
         'shadow tone and one highlight tone, a little subtle texture (wood grain, fabric fold, glass shine) and a soft contact shadow '
         'where it already has one. Same pixel grid size as the reference (each reference pixel is one big square block).')


def src_path(name):
    return ROOT / ('assets/tiles' if name in TILES else 'assets/props') / f'{name}.png'


def backup(name):
    ORIG.mkdir(parents=True, exist_ok=True)
    o = ORIG / f'{name}.png'
    if not o.exists(): shutil.copy2(src_path(name), o)
    return o


def make_ref(name):
    """원본(또는 타일 3×3)을 정수 배율로 키워 1024 마젠타 판 가운데에 둔다. 반환: (참조 경로, 배율)"""
    im = Image.open(backup(name)).convert('RGBA')
    if name in TILES:
        t = Image.new('RGBA', (im.width * 3, im.height * 3))
        for j in range(3):
            for i in range(3): t.paste(im, (i * im.width, j * im.height))
        im = t
    k = max(1, min(820 // im.width, 820 // im.height))
    big = im.resize((im.width * k, im.height * k), Image.NEAREST)
    board = Image.new('RGB', (1024, 1024), MAG)
    board.paste(big, ((1024 - big.width) // 2, (1024 - big.height) // 2), big)
    RAW.mkdir(parents=True, exist_ok=True)
    p = RAW / f'{name}-ref.png'; board.save(p)
    return p, k


def prompt(name):
    if name in TILES:
        return ('Image1 is a 3x3 repeat of one seamless 32x32 floor/wall tile from a top-down pixel-art RPG house, shown on magenta. '
                'Redraw the same 3x3 repeat so the tile still repeats seamlessly with the identical period and the same seams/plank lines '
                'at the same positions. Fill exactly the same square area, keep the magenta outside. ' + STYLE)
    return (f'Image1 is a single pixel-art prop sprite ("{name.replace("_", " ")}") from a top-down RPG house, shown on a flat magenta '
            'background. Redraw the SAME sprite at the SAME size and position on the same flat pure magenta (#FF00FF) background, '
            'nothing else in the image. ' + STYLE)


def gen(name):
    ref, _ = make_ref(name)
    pf = RAW / f'{name}-prompt.txt'; pf.write_text(prompt(name))
    out = RAW / f'{name}-raw.png'
    r = subprocess.run([sys.executable, str(ROOT / 'tools/sprites/imagegen.py'), 'generate', '--model', 'openai/gpt-image-2.5-sunburst',
                        '--prompt-file', str(pf), '--ref', str(ref), '--size', '1024x1024', '--out', str(out)],
                       capture_output=True, text=True)
    return name, r.returncode, (r.stderr or '')[-200:]


def is_mag(a):
    # 순수 마젠타 + 그림자 점묘가 마젠타와 섞인 보라 번짐(생성기가 가장자리를 섞는다)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return ((r > 170) & (b > 170) & (g < 110)) | ((r > 60) & (b > 60) & (g < 0.45 * np.minimum(r, b)) & (np.abs(r - b) < 70))


def resample(a, box, w, h):
    """box 영역을 w×h 로 칸 가운데 샘플링"""
    x0, y0, x1, y1 = box
    xs = (x0 + (np.arange(w) + 0.5) * (x1 - x0) / w).astype(int).clip(0, a.shape[1] - 1)
    ys = (y0 + (np.arange(h) + 0.5) * (y1 - y0) / h).astype(int).clip(0, a.shape[0] - 1)
    return a[ys][:, xs]


def tidy(rgb, n):
    """색 수를 원본 수준으로 정리(생성기 잡색 제거)"""
    q = Image.fromarray(rgb.astype(np.uint8), 'RGB').quantize(colors=n, method=Image.MEDIANCUT, dither=Image.NONE)
    return np.asarray(q.convert('RGB'))


def apply(name):
    orig = Image.open(backup(name)).convert('RGBA')
    oa = np.asarray(orig)
    raw = np.asarray(Image.open(RAW / f'{name}-raw.png').convert('RGB')).astype(int)
    ncol = min(64, max(12, len({tuple(p) for p in oa[oa[..., 3] > 0][:, :3]}) * 2))
    if name in TILES:
        # 3×3 판 가운데 칸(생성된 판의 테두리 추정 → 3등분)
        keep = ~is_mag(raw); ys, xs = np.where(keep)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        cw, ch = (x1 - x0) / 3, (y1 - y0) / 3
        rgb = resample(raw, (x0 + cw, y0 + ch, x0 + 2 * cw, y0 + 2 * ch), orig.width, orig.height)
        out = np.dstack([tidy(rgb, ncol), np.full(rgb.shape[:2], 255)]).astype(np.uint8)
    else:
        ob = orig.getbbox()
        keep = ~is_mag(raw); ys, xs = np.where(keep)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        w, h = ob[2] - ob[0], ob[3] - ob[1]
        rgb = resample(raw, box, w, h)
        alpha = ~is_mag(rgb)
        body = tidy(np.where(alpha[..., None], rgb, 0), ncol)
        out = np.zeros_like(oa)
        out[ob[1]:ob[3], ob[0]:ob[2]] = np.dstack([body, np.where(alpha, 255, 0)]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(src_path(name))
    return name


def seam_bases():
    """받침 타일의 벽지 부분(윗 22줄)은 새 벽지 타일 그대로 — 따로 생성하면 무늬·첫 줄이 달라 두 줄 벽에 가로 띠가 생겼다"""
    for wall, base in (('wallpaper', 'wallpaper_base'), ('wallpaper2', 'wallpaper2_base')):
        w = Image.open(src_path(wall)).convert('RGBA'); b = Image.open(src_path(base)).convert('RGBA')
        b.paste(w.crop((0, 0, w.width, 22)), (0, 0)); b.save(src_path(base))


if __name__ == '__main__':
    cmd, names = sys.argv[1], sys.argv[2:] or PROPS + TILES
    if cmd == 'gen':
        todo = [n for n in names if not (RAW / f'{n}-raw.png').exists()]
        with ThreadPoolExecutor(6) as ex:
            for n, rc, err in ex.map(gen, todo): print(n, 'ok' if rc == 0 else f'FAIL {err}', flush=True)
    elif cmd == 'apply':
        for n in names: print('applied', apply(n))
        seam_bases()
