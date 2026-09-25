"""arena332: final-battle chamber backdrop + ten LoL-cosplay "sub" monsters.

Run: uv run --with pillow --with numpy python3 assets/source/arena332/process.py
- arena-raw.png (1024x1536) -> one BOX downscale x0.75 -> assets/props/arena332_room.png (768x1152, the whole map floor art)
- monsters-raw.png / monsters2-raw.png (3x2 cells of 512) -> magenta key, tight crop, premultiplied BOX to a per-monster height, binary alpha
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

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


def thicken_lines(path: Path, size: int = 5) -> np.ndarray:
    """White contour lines survive the downscale: dilate bright pixels on the RGB before keying."""
    im = Image.open(path).convert('RGB')
    return np.array(im.filter(ImageFilter.MaxFilter(size)).convert('RGBA'))


def darken(im: np.ndarray, k: float = 0.52) -> np.ndarray:
    """Ominous look (user: “색깔이 너무 밝고 선명… 어두운느낌”): desaturate, darken, push shadows toward violet-navy."""
    rgb = im[..., :3].astype(float)
    grey = rgb.mean(axis=2, keepdims=True)
    rgb = grey + (rgb - grey) * 0.55
    rgb = rgb * k + np.array([18, 10, 34]) * (1 - k) * 0.6
    out = im.copy(); out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    return out


def fade_bottom(im: np.ndarray, part: float) -> np.ndarray:
    """Lower `part` of the image melts into black (alpha kept, colour → near black)."""
    h = im.shape[0]; start = int(h * (1 - part)); out = im.copy()
    for y in range(start, h):
        k = (y - start) / max(1, h - start)
        out[y, :, :3] = (out[y, :, :3].astype(float) * (1 - k) + np.array([4, 3, 10]) * k).astype(np.uint8)
    return out


def main() -> None:
    # BUILD333: 좌우로 넓힌 결전지(arena-wide-raw, 1536×1024) → 1152×768(사용자 “왼쪽 오른쪽 공간을 넓혀서 카메라이동으로”)
    room = Image.open(HERE / 'arena-wide-raw.png').convert('RGB').resize((1152, 768), Image.BOX)
    room.save('assets/props/arena332_room.png')
    # 위쪽 확장(카메라 대상승용 2400px): 선반 윗띠(240px, 난간 제외)를 위로 이어 붙이고 올라갈수록 어둠으로 사라진다
    # BUILD336: 생성한 탑 벽(upper-raw, 위아래 이어지게)을 반복하고, 방 그림 윗부분과는 80px 섞어 이음새 없이. 위로 갈수록 어두워진다
    tower = np.asarray(Image.open(HERE / 'upper-raw.png').convert('RGB').resize((1152, 1728), Image.BOX)).astype(float)
    th = tower.shape[0]; blend = 96
    for i in range(blend):
        w = 0.5 * (1 - i / blend)
        a_, b_ = tower[i].copy(), tower[th - 1 - i].copy()
        tower[i] = a_ * (1 - w) + b_ * w; tower[th - 1 - i] = b_ * (1 - w) + a_ * w
    upper = np.zeros((2400, 1152, 3))
    for y in range(2400):
        k = (y / 2400) ** 1.3
        upper[y] = tower[(y - 2400) % th] * (0.1 + 0.9 * k) * 0.8
    top = np.asarray(room)[:80].astype(float)
    for i in range(80):
        w = i / 80
        upper[2400 - 80 + i] = upper[2400 - 80 + i] * (1 - w) + top[i] * w
    Image.fromarray(np.clip(upper, 0, 255).astype(np.uint8)).save('assets/props/arena332_upper.png')
    # 청소년(구슬 속): 키 56px
    # BUILD333 재생성(cheong-raw2): 입 없음, 앞머리 그림자가 눈을 가림. 구슬 안에서는 보랏빛으로 물든 버전을 쓴다
    cheong = shrink(key_out(np.array(Image.open(HERE / 'cheong-raw2.png').convert('RGBA'))), 56)
    Image.fromarray(cheong).save('assets/props/arena332_cheong.png')
    tinted = cheong.copy()
    rgb = tinted[..., :3].astype(float)
    tinted[..., :3] = np.clip(rgb * 0.5 + np.array([110, 50, 190]) * 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(tinted).save('assets/props/arena332_cheong_orb.png')
    # 거대한 근육 팔(청소년 분홍 반팔): 높이 130px — 어깨가 왼쪽 끝, 손이 오른쪽
    # BUILD333: 델타룬 타이탄식(검은 채움 + 흰 윤곽선, 사용자 참고 lineart-fist-ref) 팔
    arm = shrink(key_out(thicken_lines(HERE / 'arm-raw3.png', 7)), 260)
    Image.fromarray(arm).save('assets/props/arena332_arm.png')
    # 청소년거인 상체(목까지, 얼굴은 그림자): 높이 480px
    # 더 거대하게(높이 820) + 어둡게 + 아래는 어둠으로 사라진다(하체가 잘려 보이지 않게)
    giant = fade_bottom(shrink(key_out(thicken_lines(HERE / 'giant-raw2.png', 3)), 1100), 0.18)
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
