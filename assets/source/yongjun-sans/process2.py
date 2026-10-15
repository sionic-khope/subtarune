#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run (repo root): uv run assets/source/yongjun-sans/process2.py idle cough cry hug dark roll blaster fx preview
#   (dark-ref rebuilds the x8 edit reference from the exported idle; --no-export writes only the source folder)
"""Yongjun (Sans outfit) v2 sprites (2026-10-15 rework: smaller, white skin, readable face, gpt-drawn pattern art).

Body sheets (idle/cough/cry): gpt-image raw (2x2, 512 px cells, magenta) -> tools/sprites/sheet_processor.py --strict-qc
-> its raw-sheet-clean.png -> magenta-fringe removal + binary alpha -> ONE shared reduction factor F for all body art
(F = idle frame-0 raw height / 98, i.e. ~4.2 raw px per game px, which is the raw's own stroke width) -> block-vote
downsample straight into a 120 px cell whose feet root lands on pivot [60, 116].

Block vote (instead of NEAREST point sampling): every game pixel looks at its whole F x F raw block; alpha = majority,
colour = the most common colour bin in the block, except that dark line pixels (eyes, brows, mouth, outline) win when
they cover >= DARK_SHARE of the block. Point sampling at a non-integer factor skips 4-5 px strokes (that is how the v1
face lost its eyes/brows); the vote keeps every stroke that is at least about one game pixel wide. Output colours are
medians of real raw pixels (no palette quantisation of the result).
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
CELL: Final = 120
PIVOT: Final = (60, 116)               # feet root x, feet bottom (exclusive) y inside each 120 px cell
TARGET_H: Final = 98                   # idle frame 0 visible height in game px -> defines the shared factor
FEET_BAND: Final = 16                  # raw px band above the lowest opaque row used to find the feet root
MIN_AREA: Final = 64                   # raw px; smaller detached specks are dropped
DARK_LUM: Final = 70                   # luminance below which a raw pixel counts as a dark line
DARK_SHARE: Final = 0.40               # dark lines win a block when they cover this share of it
EXPORT = "--no-export" not in sys.argv  # trial runs write only <name>/final2.png
SHEETS: Final = {"idle": "idle-raw2.png", "cough": "cough-raw2.png", "cry": "cry-raw2.png"}
OUT: Final = {
    "idle": "assets/enemies/yongjun-sans-battle-idle.png",
    "cough": "assets/enemies/yongjun-sans-cough.png",
    "cry": "assets/enemies/yongjun-sans-cry.png",
    "roll": "assets/enemies/yongjun-sans-roll.png",
    "hug": "assets/enemies/yongjun-sans-hug.png",
    "dark": "assets/enemies/yongjun-sans-dark.png",
}


def lum(px: np.ndarray) -> np.ndarray:
    return 0.299 * px[..., 0] + 0.587 * px[..., 1] + 0.114 * px[..., 2]


def processor(name: str, raw: str, args: list[str]) -> tuple[Image.Image, list[str]]:
    """Run the repo processor under strict QC; return its full-sheet clean image (raw resolution)."""
    out_dir = ROOT / name / "v2"
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(ROOT / raw), *args,
               "--output-dir", str(out_dir), "--component-padding", "0", "--trim-border", "0", "--strict-qc"]
    subprocess.run(command, check=True, capture_output=True, text=True)
    with Image.open(out_dir / "raw-sheet-clean.png") as image:
        clean = image.convert("RGBA")
    return clean, [str(Path(c).relative_to(GAME)) if c.startswith(str(GAME)) else c for c in command]


def body_processor(name: str, raw: str, mode: str) -> tuple[Image.Image, list[str]]:
    return processor(name, raw, ["--target", "creature", "--mode", mode, "--rows", "2", "--cols", "2",
                                 "--cell-size", str(CELL), "--fit-scale", "0.85", "--align", "feet", "--shared-scale",
                                 "--scale-strategy", "preserve", "--component-mode", "largest",
                                 "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05"])


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


def tidy(image: Image.Image, min_area: int = MIN_AREA) -> tuple[Image.Image, int, int]:
    """Binary alpha, drop magenta-tinted fringe pixels and tiny detached specks (raw resolution)."""
    px = np.asarray(image).copy()
    rgb = px[:, :, :3].astype(float)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    opaque = px[:, :, 3] >= 128
    fringe = opaque & (r > g * 1.3 + 8) & (b > g * 1.3 + 8) & (r > b * 0.6) & (b > r * 0.6)
    opaque &= ~fringe
    # dark outline pixels blended with the magenta key read as purple: neutralise to a dark navy of the same luminance
    purple = opaque & (r > g * 1.3 + 8) & (b > g * 1.3 + 8) & (np.maximum(r, b) < 130)
    y = np.round(lum(rgb)).astype(np.uint8)
    px[purple, 0] = y[purple]
    px[purple, 1] = y[purple]
    px[purple, 2] = np.minimum(y[purple].astype(int) + 10, 255).astype(np.uint8)
    specks = 0
    for mask in components(opaque):
        if mask.sum() < min_area:
            opaque &= ~mask
            specks += 1
    px[:, :, 3] = np.where(opaque, 255, 0)
    return Image.fromarray(px), int(fringe.sum()), specks


def vote_down(raw: Image.Image, factor: float, origin: tuple[float, float], size: tuple[int, int],
              dark_share: float = DARK_SHARE, stats: dict | None = None, alpha_share: float = 0.5) -> Image.Image:
    """Block-vote downsample: game pixel (i, j) <- raw block [ox + i*F, ox + (i+1)*F) x [oy + j*F, oy + (j+1)*F)."""
    src = np.asarray(raw)
    h, w = src.shape[:2]
    out = np.zeros((size[1], size[0], 4), np.uint8)
    ox, oy = origin
    purity, blocks = 0.0, 0
    for j in range(size[1]):
        y0, y1 = int(round(oy + j * factor)), int(round(oy + (j + 1) * factor))
        if y1 <= 0 or y0 >= h:
            continue
        for i in range(size[0]):
            x0, x1 = int(round(ox + i * factor)), int(round(ox + (i + 1) * factor))
            if x1 <= 0 or x0 >= w:
                continue
            block = src[max(y0, 0):min(y1, h), max(x0, 0):min(x1, w)].reshape(-1, 4)
            area = (y1 - y0) * (x1 - x0)
            opaque = block[block[:, 3] >= 128]
            if len(opaque) < alpha_share * area:
                continue
            rgb = opaque[:, :3].astype(int)
            dark = lum(rgb) < DARK_LUM
            bins = (rgb[:, 0] // 24) * 4096 + (rgb[:, 1] // 24) * 64 + rgb[:, 2] // 24
            values, counts = np.unique(bins, return_counts=True)
            purity += counts.max() / area
            blocks += 1
            if dark.sum() >= dark_share * area:
                pick = rgb[dark]
            else:
                pick = rgb[bins == values[counts.argmax()]]
            out[j, i, :3] = np.median(pick, axis=0).round().astype(np.uint8)
            out[j, i, 3] = 255
    if stats is not None:
        stats["purity"] = purity / max(blocks, 1)
    return Image.fromarray(out)


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


def check_final(image: Image.Image, label: str) -> None:
    px = np.asarray(image)
    assert set(np.unique(px[:, :, 3])).issubset({0, 255}), f"{label}: non-binary alpha"
    magenta = (px[:, :, 0] > 150) & (px[:, :, 2] > 150) & (px[:, :, 1] < 100) & (px[:, :, 3] > 0)
    assert not magenta.any(), f"{label}: {int(magenta.sum())} magenta pixels left"


PHASES: Final = (0.0, 0.25, 0.5, 0.75)   # sub-block grid phases tried per frame (fraction of F)


def best_vote(frame: Image.Image, factor: float, base: tuple[float, float], size: tuple[int, int],
              phases_x: tuple[float, ...] = PHASES, alpha_share: float = 0.5) -> tuple[Image.Image, dict]:
    """Try every grid phase and keep the one whose blocks are most uniform (highest mean mode share): that is the
    phase closest to the raw's own stroke grid, so lines land inside blocks instead of straddling two."""
    best = None
    for py in PHASES:
        for px in phases_x:
            stats: dict = {}
            image = vote_down(frame, factor, (base[0] + px * factor, base[1] + py * factor), size, stats=stats,
                              alpha_share=alpha_share)
            if best is None or stats["purity"] > best[1]["purity"]:
                best = (image, {"purity": round(stats["purity"], 4), "phase": [px, py]})
    assert best is not None
    return best


def shift(image: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", image.size)
    out.paste(image, (dx, dy))
    return out


def cell_from_raw(frame: Image.Image, factor: float) -> tuple[Image.Image, dict]:
    """Downsample one raw cell straight into a CELL x CELL game cell, then integer-shift the feet root onto PIVOT."""
    root_x, bottom = feet_root(frame)
    base = (root_x - PIVOT[0] * factor, bottom - PIVOT[1] * factor)
    cell, info = best_vote(frame, factor, base, (CELL, CELL))
    bounds = cell.getbbox()
    assert bounds is not None
    alpha = np.asarray(cell)[:, :, 3] > 0
    band = alpha[bounds[3] - 4:bounds[3]]
    xs = np.nonzero(band.any(axis=0))[0]
    feet_x = (xs.min() + xs.max() + 1) / 2
    cell = shift(cell, int(round(PIVOT[0] - feet_x)), PIVOT[1] - bounds[3])
    bounds = cell.getbbox()
    assert bounds is not None and bounds[3] == PIVOT[1]
    assert bounds[0] >= 1 and bounds[1] >= 1 and bounds[2] <= CELL - 1, f"edge contact {bounds}"
    return cell, {"rawBounds": list(frame.getbbox()), "rawFeetRootX": root_x, "rawBottom": bottom, **info,
                  "bounds": list(bounds), "height": bounds[3] - bounds[1]}


def frames_of(clean: Image.Image) -> list[Image.Image]:
    cw, ch = clean.width // 2, clean.height // 2
    return [clean.crop(((i % 2) * cw, (i // 2) * ch, (i % 2 + 1) * cw, (i // 2 + 1) * ch)) for i in range(4)]


def shared_factor(idle_clean: Image.Image) -> float:
    bounds = frames_of(idle_clean)[0].getbbox()
    assert bounds is not None
    return (bounds[3] - bounds[1]) / TARGET_H


def export_sheet(name: str, factor: float, clean: Image.Image, command: list[str], fringe: int, specks: int) -> dict:
    sheet = Image.new("RGBA", (CELL * 2, CELL * 2))
    frames = []
    for index, frame in enumerate(frames_of(clean)):
        cell, info = cell_from_raw(frame, factor)
        sheet.paste(cell, ((index % 2) * CELL, (index // 2) * CELL))
        frames.append(info)
    check_final(sheet, name)
    if EXPORT:
        sheet.save(GAME / OUT[name])
    sheet.save(ROOT / name / "final2.png")
    contract = {"file": OUT[name], "sheet": [CELL * 2, CELL * 2], "cols": 2, "rows": 2, "count": 4, "cell": [CELL, CELL],
                "order": "row-major (top-left, top-right, bottom-left, bottom-right)", "pivot": list(PIVOT),
                "drawScale": 1, "rawPxPerGamePx": factor,
                "scalePolicy": f"one factor for all body art = idle frame0 raw height / {TARGET_H}",
                "alignment": "feet root (centre of lowest 16 raw px band) -> pivot x, lowest opaque row -> pivot y",
                "sampling": f"block vote (majority colour bin, dark lines lum<{DARK_LUM} win at >= {DARK_SHARE} of a block)",
                "binaryAlpha": True, "magentaPixels": 0, "removedFringePixels": fringe, "droppedSpecks": specks,
                "frames": frames, "processorCommand": command}
    (ROOT / name / "runtime-contract2.json").write_text(json.dumps(contract, indent=1) + "\n")
    print(name, sheet.size, "F", round(factor, 3), "heights", [f["height"] for f in frames], "bounds", [f["bounds"] for f in frames])
    return contract


DARK: Final = {"upscale": 8, "offset": [32, 32], "eyeBox": [40, 38, 68, 48], "eyeRows": [41, 46], "skinRow": 50, "noseX": 52,
               "minBlob": 4, "raw": "dark-raw2.png", "ref": "dark/ref2-frame0-x8.png"}


def make_dark_ref() -> None:
    """Exported idle frame 0, x8 NEAREST, on a 1024 magenta canvas at offset 32 (the edit is sampled back on this grid)."""
    with Image.open(GAME / OUT["idle"]) as idle:
        frame = idle.convert("RGBA").crop((0, 0, CELL, CELL))
    up = DARK["upscale"]
    canvas = Image.new("RGBA", (1024, 1024), (255, 0, 255, 255))
    canvas.alpha_composite(frame.resize((CELL * up, CELL * up), Image.Resampling.NEAREST), tuple(DARK["offset"]))
    (ROOT / "dark").mkdir(exist_ok=True)
    canvas.convert("RGB").save(ROOT / DARK["ref"], optimize=True)
    print("dark ref", ROOT / DARK["ref"])


def export_dark() -> dict:
    """Idle frame 0 with Sans-style empty black eye sockets: sample the generated edit back on the x8 grid and paste
    only the dark blobs inside the eye box onto the exported idle frame 0; old eye lines/glints left uncovered in the
    eye rows become skin. Everything outside the eye box stays byte-identical to idle frame 0."""
    with Image.open(ROOT / DARK["raw"]) as image:
        raw = np.asarray(image.convert("RGBA"))
    up, (ox, oy) = DARK["upscale"], DARK["offset"]
    xs = [ox + i * up + up // 2 for i in range(CELL)]
    ys = [oy + j * up + up // 2 for j in range(CELL)]
    sampled = raw[np.ix_(ys, xs)]
    with Image.open(GAME / OUT["idle"]) as idle:
        idle0 = np.asarray(idle.convert("RGBA").crop((0, 0, CELL, CELL)))
    base = idle0.copy()
    x0, y0, x1, y1 = DARK["eyeBox"]
    inside = np.zeros((CELL, CELL), bool)
    inside[y0:y1, x0:x1] = True
    opaque = base[:, :, 3] > 0
    ey0, ey1 = DARK["eyeRows"]
    # snap each generated socket (shape unchanged) so its centroid sits on the centroid of the original eye on the same
    # side of the nose (guards against small drift in the edit; measured moves are in the contract)
    base_dark = (lum(base[:, :, :3].astype(float)) < 60) & opaque
    eye_rows = np.zeros((CELL, CELL), bool)
    eye_rows[ey0:ey1, x0:x1] = True
    hole = np.zeros((CELL, CELL), bool)
    moves = []
    for blob in components(inside & (lum(sampled[:, :, :3].astype(float)) < 60)):
        if blob.sum() < DARK["minBlob"]:
            continue
        bys, bxs = np.nonzero(blob)
        side = np.zeros((CELL, CELL), bool)
        if bxs.mean() < DARK["noseX"] + 4:
            side[:, :DARK["noseX"]] = True
        else:
            side[:, DARK["noseX"]:] = True
        oys, oxs = np.nonzero(base_dark & eye_rows & side)
        dx, dy = int(round(oxs.mean() - bxs.mean())), int(round(oys.mean() - bys.mean()))
        moves.append([dx, dy])
        hole[bys + dy, bxs + dx] = True
        sampled[bys + dy, bxs + dx] = sampled[bys, bxs]
    hole &= opaque
    rows = np.zeros((CELL, CELL), bool)
    rows[ey0:ey1, x0:x1] = True
    base_rgb = base[:, :, :3].astype(float)
    old_eye = rows & opaque & ~hole & ((lum(base_rgb) < 140) | (base_rgb.min(axis=2) > 250))
    skin_row = base[DARK["skinRow"], x0:x1, :3]
    colours, counts = np.unique(skin_row.reshape(-1, 3), axis=0, return_counts=True)
    skin = colours[counts.argmax()]
    base[old_eye, :3] = skin
    base[hole, :3] = sampled[hole, :3]
    out = Image.fromarray(base)
    check_final(out, "dark")
    if EXPORT:
        out.save(GAME / OUT["dark"])
    out.save(ROOT / "dark" / "final2.png")
    diff = (base != idle0).any(axis=2)
    outside = diff & ~inside
    assert not outside.any(), "dark: pixels changed outside the eye box"
    contract = {"file": OUT["dark"], "size": [CELL, CELL], "frames": 1, "pivot": list(PIVOT), "drawScale": 1,
                "matches": f"{OUT['idle']} frame 0 (byte-identical outside eyeBox)", **{k: DARK[k] for k in ("eyeBox", "upscale", "offset")},
                "changedPixels": int(diff.sum()), "socketPixels": int(hole.sum()), "socketMoves": moves, "skin": [int(v) for v in skin], "source": DARK["raw"],
                "method": "exported idle frame 0 x8 NEAREST on magenta -> gpt-image edit -> block-centre resample -> eye box pasted on frame 0"}
    (ROOT / "dark" / "runtime-contract2.json").write_text(json.dumps(contract, indent=1) + "\n")
    print("dark", out.size, "changed px", int(diff.sum()), "socket px", int(hole.sum()))
    return contract


# effect / bullet sprites: (raw, rows, cols, raw cells used, frame size, output, layout of frames, anchor, margin)
FX: Final = {
    "spit": ("fx-drops-raw.png", 1, 3, [0], (8, 8), "assets/props/yongjun-spit.png", "h", "center", 0),
    "tear": ("fx-drops-raw.png", 1, 3, [1], (14, 18), "assets/props/yongjun-tear.png", "h", "center", 0),
    "crumb": ("fx-drops-raw.png", 1, 3, [2], (10, 10), "assets/props/yongjun-crumb.png", "h", "center", 0),
    # stench: fx-puffs-raw.png top row was drawn ~30 art px tall, its 1-px stink lines collapse at 16 px -> raw2 made for 16 px
    "stench": ("fx-stench-raw2.png", 1, 2, [0, 1], (16, 16), "assets/props/yongjun-stench.png", "h", "center", 0),
    "spark": ("fx-puffs-raw.png", 2, 2, [2, 3], (12, 12), "assets/props/yongjun-spark.png", "h", "center", 0),
    "bolt": ("fx-bolt-raw.png", 2, 1, [0, 1], (96, 20), "assets/props/yongjun-bolt.png", "v", "ends", 0),
    "beam": ("fx-beam-raw.png", 2, 1, [0, 1], (128, 28), "assets/props/yongjun-stench-beam.png", "v", "ends", 0),
    "blaster": ("blaster-raw.png", 1, 2, [0, 1], (64, 64), "assets/props/yongjun-blaster.png", "h", "topleft", 2),
    # roll: the raw came out ~1.45x idle scale; the contract asks for a ~64 px ball, so it is fitted to 64 (own factor)
    "roll": ("roll-raw2.png", 1, 1, [0], (64, 64), "assets/enemies/yongjun-sans-roll.png", "h", "center", 1),
}
# thin 1-art-pixel stink lines are ~0.77 game px wide at 16 px: a block becomes opaque at 30% coverage so they survive
FX_ALPHA: Final = {"stench": 0.3}
HUG_RAW: Final = "hug-raw3.png"       # raw2: neckline hidden behind her arm; raw3 adopted
HUG_YONGJUN_X: Final = (690, 1020)     # hug-raw3 x range of Yongjun's legs/slippers (raw px), right of her heel
HUG_HEAD_X: Final = (800, 1010)        # hug-raw3 x range of Yongjun's hair cap only (her bob ends left of 780)


def export_hug(_shared: float) -> dict:
    """Hug scene with Yongjun at the idle height (TARGET_H): the raw drew him ~1.8x idle scale, so the factor is his raw
    height / TARGET_H rather than the shared body factor. Pivot = Yongjun's feet root."""
    clean, command = processor("hug", HUG_RAW, ["--target", "asset", "--mode", "single", "--rows", "1", "--cols", "1",
                                                "--cell-size", "256", "--fit-scale", "0.84", "--align", "center",
                                                "--component-mode", "largest"])
    clean, fringe, specks = tidy(clean)
    b = clean.getbbox()
    assert b is not None
    alpha = np.asarray(clean)[:, :, 3] > 0
    head_top = int(np.nonzero(alpha[:, HUG_HEAD_X[0]:HUG_HEAD_X[1]].any(axis=1))[0].min())
    _, feet_bottom = feet_root(clean, HUG_YONGJUN_X)
    factor = (feet_bottom - head_top) / TARGET_H
    pad = 2
    size = (int(np.ceil((b[2] - b[0]) / factor)) + pad * 2, int(np.ceil((b[3] - b[1]) / factor)) + pad * 2)
    image, info = best_vote(clean, factor, (b[0] - pad * factor, b[1] - pad * factor), size)
    final = image.getbbox()
    assert final is not None and final[0] >= 1 and final[1] >= 1 and final[2] <= size[0] - 1 and final[3] <= size[1] - 1
    # pivot measured on the OUTPUT (the chosen grid phase can move it by up to one pixel vs a raw-space estimate)
    out_alpha = np.asarray(image)[:, :, 3] > 0
    gx0, gx1 = int((HUG_YONGJUN_X[0] - b[0]) / factor + pad), int((HUG_YONGJUN_X[1] - b[0]) / factor + pad)
    out_alpha[:, :gx0] = False
    out_alpha[:, gx1:] = False
    bottom = int(np.nonzero(out_alpha.any(axis=1))[0].max()) + 1
    xs = np.nonzero(out_alpha[bottom - 4:bottom].any(axis=0))[0]
    pivot = [int(round((xs.min() + xs.max() + 1) / 2)), bottom]
    check_final(image, "hug")
    (ROOT / "hug").mkdir(exist_ok=True)
    if EXPORT:
        image.save(GAME / OUT["hug"])
    image.save(ROOT / "hug" / "final2.png")
    contract = {"file": OUT["hug"], "size": list(size), "frames": 1, "bounds": list(final), "pivot": pivot, "drawScale": 1,
                "pivotMeaning": "Yongjun's feet root (centre of his slippers, bottom row)", "rawBounds": list(b),
                "yongjunHeight": TARGET_H, "scalePolicy": "Yongjun raw height / TARGET_H (same on-screen height as idle)",
                "rawPxPerGamePx": factor, "sampling": "block vote (see process2.py)", **info, "binaryAlpha": True,
                "magentaPixels": 0, "removedFringePixels": fringe, "droppedSpecks": specks, "processorCommand": command}
    (ROOT / "hug" / "runtime-contract2.json").write_text(json.dumps(contract, indent=1) + "\n")
    print("hug", size, "bounds", final, "pivot", pivot)
    return contract


def export_fx(name: str) -> dict:
    """Key the raw with the repo processor (all components kept: stink lines, bubbles, bolt branches), then block-vote
    every used cell with ONE factor per effect (the largest needed so every frame fits its frame box) and lay the
    frames out as a strip. 'ends' = the strip runs edge to edge horizontally (flat ends for stretching)."""
    raw, rows, cols, used, (fw, fh), out_path, layout, anchor, margin = FX[name]
    clean, command = processor(f"fx-{name}", raw, ["--target", "asset", "--mode", "fx", "--rows", str(rows), "--cols", str(cols),
                                                   "--cell-size", "256", "--fit-scale", "0.9", "--align", "center",
                                                   "--component-mode", "all", "--min-component-area", "24"])
    clean, fringe, specks = tidy(clean, min_area=24)
    cw, ch = clean.width // cols, clean.height // rows
    cells = [clean.crop(((i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch)) for i in used]
    boxes = [c.getbbox() for c in cells]
    assert all(boxes), f"{name}: empty cell"
    if anchor == "ends":
        factor = max((b[2] - b[0]) / fw for b in boxes)
    else:
        factor = max(max((b[2] - b[0]) / (fw - 2 * margin), (b[3] - b[1]) / (fh - 2 * margin)) for b in boxes)
    frames, infos = [], []
    for cell, b in zip(cells, boxes):
        if anchor == "ends":
            # stretchable strips: every frame spans the full width (own width factor, frames differ by < 1%)
            factor = (b[2] - b[0]) / fw
        bw, bh = (b[2] - b[0]) / factor, (b[3] - b[1]) / factor
        if anchor == "topleft":
            gx, gy = margin, margin
        elif anchor == "ends":
            gx, gy = 0, (fh - bh) / 2
        else:
            gx, gy = (fw - bw) / 2, (fh - bh) / 2
        image, info = best_vote(cell, factor, (b[0] - gx * factor, b[1] - gy * factor), (fw, fh),
                                phases_x=(0.0,) if anchor == "ends" else PHASES, alpha_share=FX_ALPHA.get(name, 0.5))
        # the phase search may move content by up to one pixel: integer-shift it back to the anchor
        got = image.getbbox()
        assert got is not None
        if anchor == "topleft":
            dx, dy = margin - got[0], margin - got[1]
        elif anchor == "ends":
            dx, dy = -got[0], (fh - (got[3] - got[1])) // 2 - got[1]
        else:
            dx, dy = (fw - (got[2] - got[0])) // 2 - got[0], (fh - (got[3] - got[1])) // 2 - got[1]
        image = shift(image, dx, dy)
        frames.append(image)
        infos.append({**info, "rawPxPerGamePx": round(factor, 3), "rawBounds": list(b), "bounds": list(image.getbbox() or (0, 0, 0, 0))})
    if layout == "h":
        strip = Image.new("RGBA", (fw * len(frames), fh))
        for k, f in enumerate(frames):
            strip.paste(f, (k * fw, 0))
    else:
        strip = Image.new("RGBA", (fw, fh * len(frames)))
        for k, f in enumerate(frames):
            strip.paste(f, (0, k * fh))
    check_final(strip, name)
    (ROOT / f"fx-{name}").mkdir(exist_ok=True)
    if EXPORT:
        strip.save(GAME / out_path)
    strip.save(ROOT / f"fx-{name}" / "final.png")
    contract = {"file": out_path, "size": list(strip.size), "frames": len(frames), "frame": [fw, fh],
                "layout": "side by side, left to right" if layout == "h" else "stacked, top to bottom",
                "anchor": anchor, "rawPxPerGamePx": round(factor, 3), "sampling": "block vote (see process2.py)",
                "binaryAlpha": True, "magentaPixels": 0, "removedFringePixels": fringe, "droppedSpecks": specks,
                "frameInfo": infos, "processorCommand": command}
    (ROOT / f"fx-{name}" / "runtime-contract.json").write_text(json.dumps(contract, indent=1) + "\n")
    print(name, strip.size, "F", round(factor, 2), "bounds", [i["bounds"] for i in infos])
    return contract


def mono(image: Image.Image, threshold: float = 0.5) -> Image.Image:
    """Python copy of src/core/gfx.js monoPortrait (whiteSprite threshold 0.5) for silhouette previews."""
    px = np.asarray(image).astype(float)
    op = px[:, :, 3] >= 128
    y = lum(px) / 255
    dark = op & (y < threshold)
    pad = np.pad(op, 1)
    edge = op & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    white = op & (~dark | edge)
    out = np.zeros(px.shape, np.uint8)
    out[op, 3] = 255
    out[white, :3] = 255
    return Image.fromarray(out)


def previews() -> None:
    """preview2-2x.png (all v2 game files at 1x, shown 2x on the battle-dark background), silhouette2-2x.png (whiteSprite
    2-tone), old-vs-new-4x.png (v1 idle frame 0 next to v2 idle frame 0 at the same zoom)."""
    bodies = [GAME / OUT[n] for n in ("idle", "cough", "cry")]
    singles = [GAME / OUT[n] for n in ("dark", "roll", "hug")]
    props = [GAME / FX[n][5] for n in ("blaster", "stench", "spit", "tear", "crumb", "spark", "bolt", "beam")]
    props.append(GAME / "assets/props/yongjun-fish.png")
    width = CELL * 2 * 3 + 16 * 4
    canvas = Image.new("RGBA", (width, CELL * 2 + 16 + 120 + 16 + 80), (30, 33, 43, 255))
    sil = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
    def put(path: Path, xy: tuple[int, int]) -> int:
        with Image.open(path) as im:
            im = im.convert("RGBA")
            canvas.alpha_composite(im, xy)
            sil.alpha_composite(mono(im), xy)
            return im.width
    x = 16
    for f in bodies:
        x += put(f, (x, 8)) + 16
    x = 16
    for f in singles:
        x += put(f, (x, CELL * 2 + 16)) + 16
    x, y = 16, CELL * 2 + 16 + 120 + 16
    for f in props:
        w = put(f, (x, y))
        x += w + 12
        if x > width - 140:
            x, y = 16, y + 44
    canvas.resize((canvas.width * 2, canvas.height * 2), Image.Resampling.NEAREST).save(ROOT / "preview2-2x.png")
    sil.resize((sil.width * 2, sil.height * 2), Image.Resampling.NEAREST).save(ROOT / "silhouette2-2x.png")
    old = ROOT / "idle" / "final.png"
    if old.exists():
        with Image.open(old) as o, Image.open(GAME / OUT["idle"]) as n:
            side = Image.new("RGBA", (160 + 16 + CELL, 160), (30, 33, 43, 255))
            side.alpha_composite(o.convert("RGBA").crop((0, 0, 160, 160)), (0, 0))
            side.alpha_composite(n.convert("RGBA").crop((0, 0, CELL, CELL)), (176, 160 - 4 - PIVOT[1]))
            side.resize((side.width * 4, side.height * 4), Image.Resampling.NEAREST).save(ROOT / "old-vs-new-4x.png")


def main(targets: list[str]) -> None:
    idle_clean, idle_cmd = body_processor("idle", SHEETS["idle"], "idle")
    idle_clean, fringe, specks = tidy(idle_clean)
    factor = shared_factor(idle_clean)
    for name in ("idle", "cough", "cry"):
        if name not in targets:
            continue
        if name == "idle":
            clean, command = idle_clean, idle_cmd
        else:
            clean, command = body_processor(name, SHEETS[name], "actions")
            clean, fringe, specks = tidy(clean)
        export_sheet(name, factor, clean, command, fringe, specks)
    if "hug" in targets:
        export_hug(factor)
    if "dark-ref" in targets:
        make_dark_ref()
    if "dark" in targets:
        export_dark()
    for name in FX:
        if name in targets or ("fx" in targets and name not in ("blaster", "roll")):
            export_fx(name)
    if "preview" in targets:
        previews()


if __name__ == "__main__":
    main([a for a in sys.argv[1:] if not a.startswith("--")] or ["idle"])
