#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run (repo root): uv run assets/source/yongjun-sans/refs2.py
"""v2 identity reference for the idle raw2: previous idle raw frame 0 (pose/outfit/view) | shop face (facial features),
both with the skin mechanically recoloured to a pale/fair tone so the reference does not fight the 'white skin' prompt."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
MAGENTA = (255, 0, 255)


def pale(rgb: np.ndarray, skin: np.ndarray, gain: float = 1.0, base: float = 0.0) -> np.ndarray:
    out = rgb.copy()
    y = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    y = np.clip(base + y * gain, 0, 255)
    for ch, add in enumerate((28, 20, 16)):
        out[..., ch] = np.where(skin, np.clip(y + add, 0, 255), rgb[..., ch])
    return out


def skin_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 120) & (r > g + 15) & (g > b) & (r - b > 40) & ~((r > 200) & (b > 200))


def main() -> None:
    with Image.open(ROOT / "idle-raw.png") as im:
        frame = np.asarray(im.convert("RGB").crop((0, 0, 512, 512))).astype(float)
    frame = pale(frame, skin_mask(frame))
    with Image.open(ROOT / "ref-shop-face.png") as im:
        face = im.convert("RGB")
    face = face.resize((face.width * 3 // 2, face.height * 3 // 2), Image.Resampling.NEAREST)
    f = np.asarray(face).astype(float)
    # shop palette is dark orange; lift skin luminance ~140 -> ~223 before tinting pale
    f = pale(f, skin_mask(f), gain=1.0, base=83)
    canvas = Image.new("RGB", (512 + 16 + face.width, 512), MAGENTA)
    canvas.paste(Image.fromarray(frame.astype(np.uint8)), (0, 0))
    canvas.paste(Image.fromarray(f.astype(np.uint8)), (528, (512 - face.height) // 2))
    canvas.save(ROOT / "ref2-idle.png", optimize=True)
    print("ref2-idle.png", canvas.size, (ROOT / "ref2-idle.png").stat().st_size)
    # anchors cut from the adopted idle raw2: whole sheet at 0.5 (pose/scale/feet anchor for 2x2 action sheets) and frame 0
    raw2 = ROOT / "idle-raw2.png"
    if raw2.exists():
        with Image.open(raw2) as im:
            sheet = im.convert("RGB")
        sheet.resize((512, 512), Image.Resampling.NEAREST).save(ROOT / "ref2-idle-sheet.png", optimize=True)
        sheet.crop((0, 0, 512, 512)).save(ROOT / "ref2-idle-frame.png", optimize=True)
        for name in ("ref2-idle-sheet.png", "ref2-idle-frame.png"):
            print(name, (ROOT / name).stat().st_size)


if __name__ == "__main__":
    main()
