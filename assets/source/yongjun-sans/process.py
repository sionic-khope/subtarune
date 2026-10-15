#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run (repo root): uv run assets/source/yongjun-sans/process.py [idle cough cry roll fish hug dark]
"""Yongjun (Sans outfit) hidden-boss sprites: gpt-image raws (magenta, 512px cells) -> runtime PNGs.

Pipeline per raw: tools/sprites/sheet_processor.py --strict-qc (edge touch / empty / scale CV / anchor QC)
-> its standard/raw-sheet-clean.png as the pixel source -> magenta-fringe removal + binary alpha
-> ONE shared NEAREST scale for idle/cough/cry/dark (no per-frame fit) -> feet-root alignment to pivot [80,156].
Singles (roll/fish/hug) use their own envelope scale, documented in runtime-contract.json.
"""
from __future__ import annotations

import json
import subprocess
import sys
from collections import deque
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
GAME: Final = ROOT.parents[2]
PROCESSOR: Final = GAME / "tools/sprites/sheet_processor.py"
CELL: Final = 160                      # same 2x2 / 160px-cell convention as dohyun/domijorim battle idle
PIVOT: Final = (80, 156)               # feet root x, feet bottom (exclusive) y inside each cell
IDLE_HEIGHT: Final = 136               # idle frame 0 visible height in px -> defines the shared scale
FEET_BAND: Final = 16                  # raw px band above the lowest opaque row used to find the feet root
MIN_AREA: Final = 64                   # raw px; smaller detached specks are dropped
SHEETS: Final = {"idle": "idle-raw.png", "cough": "cough-raw.png", "cry": "cry-raw.png"}
OUT: Final = {
    "idle": "assets/enemies/yongjun-sans-battle-idle.png",
    "cough": "assets/enemies/yongjun-sans-cough.png",
    "cry": "assets/enemies/yongjun-sans-cry.png",
    "roll": "assets/enemies/yongjun-sans-roll.png",
    "hug": "assets/enemies/yongjun-sans-hug.png",
    "dark": "assets/enemies/yongjun-sans-dark.png",
    "fish": "assets/props/yongjun-fish.png",
}
# raw-px measurements read off the raws by eye (README): hair-cap width and standing height of Yongjun
IDLE_HAIR_W: Final = 220               # idle-raw frame 0 hair cap x 145..365
ROLL_HAIR_W: Final = 355               # roll-raw hair cap x 235..590 -> head-matched scale
HUG_YONGJUN_H: Final = 867             # hug-raw Yongjun hair top y 83 .. slipper bottom y 950 -> height-matched scale
HUG_YONGJUN_X: Final = (720, 1170)     # hug-raw x range of Yongjun's legs/slippers for his feet root
FISH_WIDTH: Final = 38


def processor(name: str, raw: str, mode: list[str], extra: list[str]) -> tuple[Image.Image, list[str]]:
    """Run the repo processor under strict QC; return its full-sheet clean image."""
    out_dir = ROOT / name / "standard"
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(ROOT / raw), *mode,
               "--output-dir", str(out_dir), "--component-padding", "0", "--trim-border", "0", "--strict-qc", *extra]
    subprocess.run(command, check=True, capture_output=True, text=True)
    with Image.open(out_dir / "raw-sheet-clean.png") as image:
        clean = image.convert("RGBA")
    return clean, [str(Path(c).relative_to(GAME)) if c.startswith(str(GAME)) else c for c in command]


def components(alpha: np.ndarray) -> list[np.ndarray]:
    """4-connected opaque components as boolean masks."""
    seen = np.zeros(alpha.shape, bool)
    found = []
    for y0, x0 in zip(*np.nonzero(alpha)):
        if seen[y0, x0]:
            continue
        queue, pts = deque([(y0, x0)]), []
        seen[y0, x0] = True
        while queue:
            y, x = queue.popleft()
            pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < alpha.shape[0] and 0 <= nx < alpha.shape[1] and alpha[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        mask = np.zeros(alpha.shape, bool)
        ys, xs = zip(*pts)
        mask[list(ys), list(xs)] = True
        found.append(mask)
    return found


def tidy(image: Image.Image) -> tuple[Image.Image, int, int]:
    """Binary alpha, drop magenta-tinted fringe pixels and tiny detached specks (raw resolution)."""
    px = np.asarray(image).copy()
    rgb = px[:, :, :3].astype(float)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    opaque = px[:, :, 3] >= 128
    fringe = opaque & (r > g * 1.3 + 8) & (b > g * 1.3 + 8) & (r > b * 0.6) & (b > r * 0.6)
    opaque &= ~fringe
    # dark outline pixels blended with the magenta key read as purple: neutralise to a dark navy of the same luminance
    purple = opaque & (r > g * 1.3 + 8) & (b > g * 1.3 + 8) & (np.maximum(r, b) < 130)
    lum = np.round(0.299 * r + 0.587 * g + 0.114 * b).astype(np.uint8)
    px[purple, 0] = lum[purple]
    px[purple, 1] = lum[purple]
    px[purple, 2] = np.minimum(lum[purple].astype(int) + 10, 255).astype(np.uint8)
    specks = 0
    for mask in components(opaque):
        if mask.sum() < MIN_AREA:
            opaque &= ~mask
            specks += 1
    px[:, :, 3] = np.where(opaque, 255, 0)
    return Image.fromarray(px), int(fringe.sum()), specks


def feet_root(frame: Image.Image, x_range: tuple[int, int] | None = None) -> tuple[float, int]:
    """Centre x of the opaque pixels in the lowest FEET_BAND rows, and the lowest opaque row (exclusive)."""
    alpha = np.asarray(frame)[:, :, 3] > 0
    if x_range:
        alpha = alpha.copy()
        alpha[:, :x_range[0]] = False
        alpha[:, x_range[1]:] = False
    ys = np.nonzero(alpha.any(axis=1))[0]
    bottom = int(ys.max()) + 1
    band = alpha[bottom - FEET_BAND:bottom]
    xs = np.nonzero(band.any(axis=0))[0]
    return (xs.min() + xs.max() + 1) / 2, bottom


def shrink(image: Image.Image, scale: float) -> Image.Image:
    small = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.NEAREST)
    px = np.asarray(small).copy()
    px[:, :, 3] = np.where(px[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(px)


def check_final(image: Image.Image, label: str) -> None:
    px = np.asarray(image)
    assert set(np.unique(px[:, :, 3])).issubset({0, 255}), f"{label}: non-binary alpha"
    magenta = (px[:, :, 0] > 150) & (px[:, :, 2] > 150) & (px[:, :, 1] < 100) & (px[:, :, 3] > 0)
    assert not magenta.any(), f"{label}: {int(magenta.sum())} magenta pixels left"


def place_in_cell(frame: Image.Image, scale: float) -> tuple[Image.Image, dict]:
    """Scale one raw cell with the shared scale and put its feet root on PIVOT."""
    bounds = frame.getbbox()
    assert bounds is not None
    root_x, bottom = feet_root(frame)
    art = shrink(frame.crop(bounds), scale)
    x = round(PIVOT[0] - (root_x - bounds[0]) * scale)
    y = PIVOT[1] - art.height
    assert x >= 1 and y >= 1 and x + art.width <= CELL - 1, f"frame does not fit the cell: {x},{y},{art.size}"
    cell = Image.new("RGBA", (CELL, CELL))
    cell.paste(art, (x, y))
    final = cell.getbbox()
    assert final is not None and final[3] == PIVOT[1]
    return cell, {"rawBounds": list(bounds), "rawFeetRootX": root_x, "size": list(art.size), "paste": [x, y], "bounds": list(final)}


def shared_scale(idle_clean: Image.Image) -> float:
    frame0 = idle_clean.crop((0, 0, idle_clean.width // 2, idle_clean.height // 2))
    bounds = frame0.getbbox()
    assert bounds is not None
    return IDLE_HEIGHT / (bounds[3] - bounds[1])


def export_sheet(name: str, scale: float, clean: Image.Image, command: list[str], fringe: int, specks: int) -> dict:
    cw, ch = clean.width // 2, clean.height // 2
    sheet = Image.new("RGBA", (CELL * 2, CELL * 2))
    frames = []
    for index in range(4):
        col, row = index % 2, index // 2
        cell, info = place_in_cell(clean.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch)), scale)
        sheet.paste(cell, (col * CELL, row * CELL))
        frames.append(info)
    check_final(sheet, name)
    out = GAME / OUT[name]
    sheet.save(out)
    sheet.save(ROOT / name / "final.png")
    contract = {"file": OUT[name], "sheet": [CELL * 2, CELL * 2], "cols": 2, "rows": 2, "count": 4, "cell": [CELL, CELL],
                "order": "row-major (top-left, top-right, bottom-left, bottom-right)", "pivot": list(PIVOT),
                "rawPixelScale": scale, "scalePolicy": f"one scale for idle/cough/cry/dark = {IDLE_HEIGHT} / idle frame0 raw height",
                "alignment": "feet root (centre of lowest 16 raw px band) -> pivot x, lowest opaque row -> pivot y",
                "sampling": "NEAREST", "binaryAlpha": True, "magentaPixels": 0, "removedFringePixels": fringe,
                "droppedSpecks": specks, "frames": frames, "processorCommand": command}
    (ROOT / name / "runtime-contract.json").write_text(json.dumps(contract, indent=1) + "\n")
    print(name, sheet.size, "scale", round(scale, 4), "heights", [f["size"][1] for f in frames], "bounds", [f["bounds"] for f in frames])
    return contract


def export_single(name: str, raw: str, scale_of, pivot_of, pad: int = 2, square: bool = False) -> dict:
    clean, command = processor(name, raw, ["--target", "asset", "--mode", "single", "--rows", "1", "--cols", "1",
                                           "--cell-size", "256", "--fit-scale", "0.84", "--align", "center",
                                           "--component-mode", "largest"], [])
    clean, fringe, specks = tidy(clean)
    bounds = clean.getbbox()
    assert bounds is not None
    scale = scale_of(clean, bounds)
    art = shrink(clean.crop(bounds), scale)
    if square:
        side = max(art.size) + pad * 2
        size = (side, side)
        pos = ((side - art.width) // 2, (side - art.height) // 2)
    else:
        size = (art.width + pad * 2, art.height + pad * 2)
        pos = (pad, pad)
    out_image = Image.new("RGBA", size)
    out_image.paste(art, pos)
    check_final(out_image, name)
    final = out_image.getbbox()
    assert final is not None and final[0] >= 1 and final[1] >= 1 and final[2] <= size[0] - 1 and final[3] <= size[1] - 1
    pivot = pivot_of(clean, bounds, scale, pos, size)
    out = GAME / OUT[name]
    out_image.save(out)
    out_image.save(ROOT / name / "final.png")
    contract = {"file": OUT[name], "size": list(size), "frames": 1, "bounds": list(final), "pivot": pivot,
                "rawBounds": list(bounds), "rawPixelScale": scale, "sampling": "NEAREST", "binaryAlpha": True,
                "magentaPixels": 0, "removedFringePixels": fringe, "droppedSpecks": specks, "processorCommand": command}
    (ROOT / name / "runtime-contract.json").write_text(json.dumps(contract, indent=1) + "\n")
    print(name, size, "scale", round(scale, 4), "bounds", final, "pivot", pivot)
    return contract


def mono(image: Image.Image, threshold: float = 0.5) -> Image.Image:
    """Python copy of src/core/gfx.js monoPortrait (whiteSprite threshold 0.5) for silhouette previews."""
    px = np.asarray(image).astype(float)
    op = px[:, :, 3] >= 128
    lum = (0.299 * px[:, :, 0] + 0.587 * px[:, :, 1] + 0.114 * px[:, :, 2]) / 255
    dark = op & (lum < threshold)
    pad = np.pad(op, 1)
    edge = op & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    white = op & (~dark | edge)
    out = np.zeros(px.shape, np.uint8)
    out[op, 3] = 255
    out[white, :3] = 255
    return Image.fromarray(out)


def previews(scale: float) -> None:
    files = [GAME / OUT[n] for n in ("idle", "cough", "cry")]
    singles = [GAME / OUT[n] for n in ("dark", "roll", "hug", "fish") if (GAME / OUT[n]).exists()]
    width = CELL * 2 * 3 + 16 * 4
    canvas = Image.new("RGBA", (width, CELL * 2 + 16 + 200), (30, 33, 43, 255))
    sil = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
    x = 16
    for f in files:
        with Image.open(f) as im:
            im = im.convert("RGBA")
            canvas.alpha_composite(im, (x, 8))
            sil.alpha_composite(mono(im), (x, 8))
        x += CELL * 2 + 16
    x = 16
    for f in singles:
        with Image.open(f) as im:
            im = im.convert("RGBA")
            canvas.alpha_composite(im, (x, CELL * 2 + 16))
            sil.alpha_composite(mono(im), (x, CELL * 2 + 16))
            x += im.width + 16
    canvas.resize((canvas.width * 2, canvas.height * 2), Image.Resampling.NEAREST).save(ROOT / "preview-2x.png")
    sil.resize((sil.width * 2, sil.height * 2), Image.Resampling.NEAREST).save(ROOT / "silhouette-2x.png")
    # scale check: idle frame 0 next to the field sheet front frame (68x88 cell) and the same frame at idle scale
    with Image.open(GAME / "assets/sprites/yongjun.png") as field, Image.open(GAME / OUT["idle"]) as idle:
        side = Image.new("RGBA", (68 + CELL + 24, CELL), (30, 33, 43, 255))
        side.alpha_composite(field.convert("RGBA").crop((0, 0, 68, 88)), (8, CELL - 4 - 88))
        side.alpha_composite(idle.convert("RGBA").crop((0, 0, CELL, CELL)), (68 + 16, 0))
        side.resize((side.width * 2, side.height * 2), Image.Resampling.NEAREST).save(ROOT / "field-vs-battle-2x.png")


def export_dark(scale: float) -> dict:
    """Idle frame 0 with Sans-style empty black eye sockets: the generated edit (dark-raw*.png, made from the exported
    frame 0 upscaled 6x into a 1024 canvas) is sampled back on the same 6x grid; only the eye box is pasted onto
    the exported idle frame 0 so pose, scale and feet stay byte-identical outside the eyes."""
    meta = json.loads((ROOT / "dark" / "ref-meta.json").read_text())
    raw_name = meta.get("adopted", "dark-raw.png")
    with Image.open(ROOT / raw_name) as image:
        raw = image.convert("RGBA")
    up, offset = meta["upscale"], meta["offset"]
    # sample the centre of every 6x6 block back to the 160 grid
    xs = [offset[0] + i * up + up // 2 for i in range(CELL)]
    ys = [offset[1] + j * up + up // 2 for j in range(CELL)]
    sampled = np.asarray(raw)[np.ix_(ys, xs)]
    with Image.open(GAME / OUT["idle"]) as idle:
        base = np.asarray(idle.convert("RGBA").crop((0, 0, CELL, CELL))).copy()
    x0, y0, x1, y1 = meta["eyeBox"]
    lum = lambda px: 0.299 * px[..., 0] + 0.587 * px[..., 1] + 0.114 * px[..., 2]
    inside = np.zeros((CELL, CELL), bool)
    inside[y0:y1, x0:x1] = True
    opaque = base[:, :, 3] > 0
    # generated sockets: dark blobs (>= 30 px) inside the eye box
    hole = np.zeros((CELL, CELL), bool)
    for blob in components(inside & opaque & (lum(sampled[:, :, :3].astype(float)) < 60)):
        if blob.sum() >= 30:
            hole |= blob
    # original narrow eyes (dark lines + white glints) in the eye rows that the sockets do not cover -> skin
    ey0, ey1 = meta["eyeRows"]
    rows = np.zeros((CELL, CELL), bool)
    rows[ey0:ey1, x0:x1] = True
    base_rgb = base[:, :, :3].astype(float)
    old_eye = rows & opaque & ~hole & ((lum(base_rgb) < 60) | (base_rgb.min(axis=2) > 230))
    skin_row = base[meta["skinRow"], x0:x1, :3]
    colours, counts = np.unique(skin_row.reshape(-1, 3), axis=0, return_counts=True)
    skin = colours[counts.argmax()]
    base[old_eye, :3] = skin
    base[hole, :3] = sampled[hole, :3]
    out = Image.fromarray(base)
    check_final(out, "dark")
    (ROOT / "dark").mkdir(exist_ok=True)
    out.save(GAME / OUT["dark"])
    out.save(ROOT / "dark" / "final.png")
    changed = int((np.asarray(out) != np.asarray(Image.open(GAME / OUT["idle"]).convert("RGBA").crop((0, 0, CELL, CELL)))).any(axis=2).sum())
    contract = {"file": OUT["dark"], "size": [CELL, CELL], "frames": 1, "pivot": list(PIVOT), "matches": f"{OUT['idle']} frame 0",
                "eyeBox": [x0, y0, x1, y1], "changedPixels": changed, "skin": [int(v) for v in skin], "rawPixelScale": scale, "source": raw_name,
                "method": "exported idle frame 0 x6 NEAREST on magenta -> gpt-image edit -> block-centre resample -> eye box pasted on frame 0"}
    (ROOT / "dark" / "runtime-contract.json").write_text(json.dumps(contract, indent=1) + "\n")
    print("dark", out.size, "changed px", changed)
    return contract


def main(targets: list[str]) -> None:
    idle_clean, idle_cmd = processor("idle", SHEETS["idle"], ["--target", "creature", "--mode", "idle", "--rows", "2", "--cols", "2"],
                                     ["--cell-size", "160", "--fit-scale", "0.85", "--align", "feet", "--shared-scale",
                                      "--scale-strategy", "preserve", "--component-mode", "largest",
                                      "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05"])
    idle_clean, fringe, specks = tidy(idle_clean)
    scale = shared_scale(idle_clean)
    for name in ("idle", "cough", "cry"):
        if name not in targets:
            continue
        if name == "idle":
            clean, command = idle_clean, idle_cmd
        else:
            clean, command = processor(name, SHEETS[name], ["--target", "creature", "--mode", "actions", "--rows", "2", "--cols", "2"],
                                       ["--cell-size", "160", "--fit-scale", "0.85", "--align", "feet", "--shared-scale",
                                        "--scale-strategy", "preserve", "--component-mode", "largest",
                                        "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05"])
            clean, fringe, specks = tidy(clean)
        export_sheet(name, scale, clean, command, fringe, specks)
    if "roll" in targets:
        export_single("roll", "roll-raw.png", lambda c, b: scale * IDLE_HAIR_W / ROLL_HAIR_W,
                      lambda c, b, s, pos, size: [size[0] // 2, size[1] // 2], square=True)
    if "fish" in targets:
        export_single("fish", "fish-raw.png", lambda c, b: FISH_WIDTH / (b[2] - b[0]),
                      lambda c, b, s, pos, size: [size[0] // 2, size[1] // 2])

    def hug_pivot(clean: Image.Image, bounds, s, pos, size):
        root_x, bottom = feet_root(clean, HUG_YONGJUN_X)
        return [round(pos[0] + (root_x - bounds[0]) * s), round(pos[1] + (bottom - bounds[1]) * s)]
    if "hug" in targets:
        export_single("hug", "hug-raw.png", lambda c, b: IDLE_HEIGHT / HUG_YONGJUN_H, hug_pivot, pad=4)
    if "dark" in targets:
        export_dark(scale)
    previews(scale)


if __name__ == "__main__":
    main(sys.argv[1:] or ["idle", "cough", "cry", "roll", "fish", "hug"])
