"""arena332: final-battle chamber backdrop + ten LoL-cosplay "sub" monsters.

Run: uv run --with pillow --with numpy python3 assets/source/arena332/process.py
- arena-raw.png (1024x1536) -> one BOX downscale x0.75 -> assets/props/arena332_room.png (768x1152, the whole map floor art)
- monsters-raw.png / monsters2-raw.png (3x2 cells of 512) -> magenta key, tight crop, premultiplied BOX to a per-monster height, binary alpha
"""
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
# (sheet, cell index, runtime name, target height px) — sizes vary on purpose (user: "크기 다양하고 특징 다양한")
MONSTERS = [
    ('monsters-raw.png', 0, 'chogath', 112), ('monsters-raw.png', 1, 'teemo', 44), ('monsters-raw.png', 2, 'thresh', 92),
    ('monsters-raw.png', 3, 'blitzcrank', 100), ('monsters-raw.png', 4, 'ahri', 72), ('monsters-raw.png', 5, 'darius', 90),
    ('monsters2-raw.png', 0, 'lux', 58), ('monsters2-raw.png', 1, 'nasus', 96), ('monsters2-raw.png', 2, 'malphite', 118),
    ('monsters2-raw.png', 3, 'fiddlesticks', 94),
]


def key_out(im: np.ndarray) -> np.ndarray:
    r, g, b = (im[..., i].astype(int) for i in range(3))
    key = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)
    near = np.zeros_like(key)
    near[1:, :] |= key[:-1, :]; near[:-1, :] |= key[1:, :]; near[:, 1:] |= key[:, :-1]; near[:, :-1] |= key[:, 1:]
    pinkish = (r > 120) & (b > 120) & (g < 90) & (r - g > 90)
    im = im.copy()
    im[..., 3] = np.where(key | (near & pinkish), 0, 255).astype(np.uint8)
    return im


def shrink(im: np.ndarray, target_h: int) -> np.ndarray:
    ys, xs = np.nonzero(im[..., 3])
    crop = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(float)
    scale = target_h / crop.shape[0]
    size = (max(1, round(crop.shape[1] * scale)), target_h)
    a = crop[..., 3:4] / 255
    prem = Image.fromarray(np.concatenate([crop[..., :3] * a, crop[..., 3:4]], axis=2).astype(np.uint8))
    small = np.array(prem.resize(size, Image.BOX)).astype(float)
    sa = np.maximum(small[..., 3:4], 1) / 255
    out = np.concatenate([np.clip(small[..., :3] / sa, 0, 255), small[..., 3:4]], axis=2).astype(np.uint8)
    out[..., 3] = np.where(out[..., 3] >= 128, 255, 0)
    return out


def main() -> None:
    room = Image.open(HERE / 'arena-raw.png').convert('RGB').resize((768, 1152), Image.BOX)
    room.save('assets/props/arena332_room.png')
    # 위쪽 확장(카메라 대상승용 2400px): 선반 윗띠(240px, 난간 제외)를 위로 이어 붙이고 올라갈수록 어둠으로 사라진다
    band = np.asarray(room)[:240].astype(float)
    upper = np.zeros((2400, 768, 3))
    for y in range(2400):
        k = (y / 2400) ** 1.6
        upper[y] = band[(y - 2400) % 240] * (0.08 + 0.92 * k)
    Image.fromarray(np.clip(upper, 0, 255).astype(np.uint8)).save('assets/props/arena332_upper.png')
    # 청소년(구슬 속): 키 56px
    cheong = shrink(key_out(np.array(Image.open(HERE / 'cheong-raw.png').convert('RGBA'))), 56)
    Image.fromarray(cheong).save('assets/props/arena332_cheong.png')
    # 거대한 근육 팔(청소년 분홍 반팔): 높이 130px — 어깨가 왼쪽 끝, 손이 오른쪽
    arm = shrink(key_out(np.array(Image.open(HERE / 'arm-raw.png').convert('RGBA'))), 130)
    Image.fromarray(arm).save('assets/props/arena332_arm.png')
    # 청소년거인 상체(목까지, 얼굴은 그림자): 높이 480px
    giant = shrink(key_out(np.array(Image.open(HERE / 'giant-raw.png').convert('RGBA'))), 480)
    Image.fromarray(giant).save('assets/props/arena332_giant.png')
    sheets = {}
    board = []
    for sheet, index, name, height in MONSTERS:
        if sheet not in sheets:
            sheets[sheet] = key_out(np.array(Image.open(HERE / sheet).convert('RGBA')))
        row, col = divmod(index, 3)
        cell = sheets[sheet][row * 512:(row + 1) * 512, col * 512:(col + 1) * 512]
        arr = shrink(cell, height)
        Image.fromarray(arr).save(f'assets/props/arena332_{name}.png')
        board.append(arr)
        print(name, arr.shape[1], 'x', arr.shape[0])
    width = sum(a.shape[1] for a in board) + 8 * (len(board) + 1)
    preview = Image.new('RGBA', (width, 130), (30, 34, 60, 255))
    x = 8
    for a in board:
        preview.alpha_composite(Image.fromarray(a), (x, 124 - a.shape[0])); x += a.shape[1] + 8
    preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST).save(HERE / 'monsters-preview.png')


if __name__ == '__main__':
    main()
