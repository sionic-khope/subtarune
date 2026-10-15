#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
# How to run (repo root): uv run assets/source/janitor-hidden/process.py kick whirl slash star preview
#   (--no-export writes only this source folder)
"""Hidden janitor (Gerson parody) battle art: kick body sheet + whirl / slash / star effects.

Every raw first passes tools/sprites/sheet_processor.py --strict-qc (magenta key at raw resolution); its
raw-sheet-clean.png is the pixel source. Reduction is the block vote from assets/source/yongjun-sans/process2.py
(copied here so this folder reproduces on its own): each game pixel looks at its whole F x F raw block, alpha =
majority, colour = the most common colour bin, dark line pixels win at DARK_SHARE of a block; output colours are
medians of real raw pixels.

kick : raw cells are mapped with the anchor's exact geometry (kick-anchor.png = attack frame 0 at 3x NEAREST, feet
       root [164,236] -> raw cell [430,430]), so F = 3 and x positions are the attack sheet's; each frame is then
       integer-shifted vertically so the planted foot stands on y 236. Grid phase is searched (0, 1/3, 2/3).
fx   : ONE factor per effect and ONE cell-local origin for all its frames (gpt drew every frame at the same spot in its
       cell, so the animation keeps that placement and does not jitter); one common grid phase for all frames.
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
EXPORT: Final = "--no-export" not in sys.argv
BG: Final = (30, 33, 43, 255)

KICK_RAW: Final = "kick-raw.png"
KICK_OUT: Final = "assets/battle/janitor-hero-kick.png"
KICK_CELL: Final = 320
KICK_PIVOT: Final = (164, 236)          # same as assets/battle/janitor-hero-attack.png
KICK_F: Final = 3.0                     # kick-anchor.png scale (refs.py ANCHOR_SCALE)
KICK_RAW_ROOT: Final = (430, 430)       # refs.py ANCHOR_ROOT: raw cell point of the attack feet root
KICK_RAW_CELL: Final = (768, 512)
KICK_USED: Final = [1, 2]               # raw cells: 0 ready (QC only), 1 wind-up, 2 kick, 3 recover (QC only)
PLANTED_X: Final = (130, 185)           # game x range of the planted (rear) foot in every kick frame


def lum(px: np.ndarray) -> np.ndarray:
    return 0.299 * px[..., 0] + 0.587 * px[..., 1] + 0.114 * px[..., 2]


def processor(name: str, raw: str, args: list[str]) -> tuple[Image.Image, list[str]]:
    """Run the repo processor under strict QC; return its full-sheet clean image (raw resolution)."""
    out_dir = ROOT / name / "standard"
    command = [sys.executable, str(PROCESSOR), "process", "--input", str(ROOT / raw), *args,
               "--output-dir", str(out_dir), "--component-padding", "0", "--trim-border", "0", "--strict-qc"]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout[-3000:], result.stderr[-3000:])
        raise SystemExit(f"{name}: sheet_processor failed")
    with Image.open(out_dir / "raw-sheet-clean.png") as image:
        clean = image.convert("RGBA")
    return clean, [str(Path(c).relative_to(GAME)) if c.startswith(str(GAME)) else c for c in command]


def components(alpha: np.ndarray) -> list[np.ndarray]:
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


def tidy(image: Image.Image, min_area: int) -> tuple[Image.Image, int, int]:
    """Binary alpha, drop magenta-tinted fringe pixels and tiny detached specks (raw resolution)."""
    px = np.asarray(image).copy()
    rgb = px[:, :, :3].astype(float)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    opaque = px[:, :, 3] >= 128
    fringe = opaque & (r > g * 1.3 + 8) & (b > g * 1.3 + 8) & (r > b * 0.6) & (b > r * 0.6)
    opaque &= ~fringe
    # white/light-grey art blended with the magenta key (gap and streak edges) reads light pink: same-luminance cool grey
    pinkish = opaque & (r > 190) & (b > 190) & (g < np.minimum(r, b) - 25)
    y = np.round(lum(rgb)).astype(int)
    px[pinkish, 0] = y[pinkish]
    px[pinkish, 1] = y[pinkish]
    px[pinkish, 2] = np.minimum(y[pinkish] + 8, 255)
    specks = 0
    for mask in components(opaque):
        if mask.sum() < min_area:
            opaque &= ~mask
            specks += 1
    px[:, :, 3] = np.where(opaque, 255, 0)
    return Image.fromarray(px), int(fringe.sum()), specks


def vote_down(raw: Image.Image, factor: float, origin: tuple[float, float], size: tuple[int, int],
              dark_lum: float, dark_share: float, stats: dict | None = None) -> Image.Image:
    """Block vote: game pixel (i, j) <- raw block [ox + i*F, ox + (i+1)*F) x [oy + j*F, oy + (j+1)*F)."""
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
            if len(opaque) < 0.5 * area:
                continue
            rgb = opaque[:, :3].astype(int)
            dark = lum(rgb) < dark_lum
            bins = (rgb[:, 0] // 24) * 4096 + (rgb[:, 1] // 24) * 64 + rgb[:, 2] // 24
            values, counts = np.unique(bins, return_counts=True)
            purity += counts.max() / area
            blocks += 1
            pick = rgb[dark] if dark.sum() >= dark_share * area else rgb[bins == values[counts.argmax()]]
            out[j, i, :3] = np.median(pick, axis=0).round().astype(np.uint8)
            out[j, i, 3] = 255
    if stats is not None:
        stats["purity"] = purity / max(blocks, 1)
    return Image.fromarray(out)


def shift(image: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", image.size)
    out.paste(image, (dx, dy))
    return out


def check_final(image: Image.Image, label: str) -> None:
    px = np.asarray(image)
    assert set(np.unique(px[:, :, 3])).issubset({0, 255}), f"{label}: non-binary alpha"
    magenta = (px[:, :, 0] > 150) & (px[:, :, 2] > 150) & (px[:, :, 1] < 100) & (px[:, :, 3] > 0)
    assert not magenta.any(), f"{label}: {int(magenta.sum())} magenta pixels left"


def inside(image: Image.Image, margin: int = 1) -> tuple[int, int, int, int]:
    box = image.getbbox()
    assert box is not None, "empty frame"
    assert box[0] >= margin and box[1] >= margin and box[2] <= image.width - margin and box[3] <= image.height - margin, \
        f"cell-edge contact {box} in {image.size}"
    return box


def cells_of(clean: Image.Image, rows: int, cols: int) -> list[Image.Image]:
    cw, ch = clean.width // cols, clean.height // rows
    return [clean.crop(((i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch))
            for i in range(rows * cols)]


def save_contract(folder: str, contract: dict) -> None:
    (ROOT / folder).mkdir(exist_ok=True)
    (ROOT / folder / "runtime-contract.json").write_text(json.dumps(contract, indent=1, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------------------------------- kick body sheet
def kick_frame(cell: Image.Image) -> tuple[Image.Image, dict]:
    base = (KICK_RAW_ROOT[0] - KICK_PIVOT[0] * KICK_F, KICK_RAW_ROOT[1] - KICK_PIVOT[1] * KICK_F)
    best = None
    for py in (0.0, 1 / 3, 2 / 3):
        for px in (0.0, 1 / 3, 2 / 3):
            stats: dict = {}
            image = vote_down(cell, KICK_F, (base[0] + px * KICK_F, base[1] + py * KICK_F), (KICK_CELL, KICK_CELL),
                              dark_lum=70, dark_share=0.4, stats=stats)
            if best is None or stats["purity"] > best[2]:
                best = (image, (px, py), stats["purity"])
    assert best is not None
    image, (px, py), purity = best
    alpha = np.asarray(image)[:, :, 3] > 0
    planted = alpha[:, PLANTED_X[0]:PLANTED_X[1]]
    bottom = int(np.nonzero(planted.any(axis=1))[0].max()) + 1
    dx, dy = int(round(px)), KICK_PIVOT[1] - bottom
    image = shift(image, dx, dy)
    box = inside(image)
    alpha = np.asarray(image)[:, :, 3] > 0
    band = alpha[KICK_PIVOT[1] - 3:KICK_PIVOT[1], PLANTED_X[0]:PLANTED_X[1]]
    xs = np.nonzero(band.any(axis=0))[0] + PLANTED_X[0]
    return image, {"phase": [round(px, 3), round(py, 3)], "purity": round(purity, 4), "shift": [dx, dy],
                   "bounds": list(box), "visibleSize": [box[2] - box[0], box[3] - box[1]],
                   "plantedFootX": [int(xs.min()), int(xs.max()) + 1], "plantedFootBottom": KICK_PIVOT[1]}


def export_kick() -> dict:
    clean, command = processor("kick", KICK_RAW, ["--target", "creature", "--mode", "attack", "--rows", "2", "--cols", "2",
                                                  "--cell-size", str(KICK_CELL), "--fit-scale", "0.85", "--align", "feet",
                                                  "--shared-scale", "--scale-strategy", "preserve",
                                                  "--component-mode", "all", "--min-component-area", "64"])
    clean, fringe, specks = tidy(clean, 64)
    cells = cells_of(clean, 2, 2)
    with Image.open(ROOT / "kick-anchor.png") as anchor:
        anchor_box = cells_of(anchor.convert("RGB"), 2, 2)[0]
    a = np.asarray(anchor_box).astype(int)
    a_box = Image.fromarray((~((a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255)) * 255).astype(np.uint8)).getbbox()
    # scale check: the ready cell gpt redrew must keep the anchor's exact extent (else F = 3 would be wrong)
    assert cells[0].getbbox() is not None and max(abs(p - q) for p, q in zip(cells[0].getbbox(), a_box)) <= 6, \
        f"ready cell {cells[0].getbbox()} drifted from anchor {a_box}"
    frames, infos = [], []
    for index in range(4):
        frame, info = kick_frame(cells[index])
        frames.append(frame)
        infos.append({"rawCell": index, **info})
    sheet = Image.new("RGBA", (KICK_CELL * len(KICK_USED), KICK_CELL))
    for k, index in enumerate(KICK_USED):
        sheet.paste(frames[index], (k * KICK_CELL, 0))
    check_final(sheet, "kick")
    (ROOT / "kick").mkdir(exist_ok=True)
    sheet.save(ROOT / "kick" / "final.png")
    if EXPORT:
        sheet.save(GAME / KICK_OUT)
    for index, label in ((0, "ready"), (3, "recover")):
        frames[index].save(ROOT / "kick" / f"qc-{label}.png")
    # ready frame vs approved attack frame 0 (both in the 320 cell, same pivot): how many pixels differ
    with Image.open(GAME / "assets/battle/janitor-hero-attack.png") as attack:
        attack0 = np.asarray(attack.convert("RGBA").crop((0, 0, KICK_CELL, KICK_CELL)))
    ready = np.asarray(frames[0])
    alpha_diff = int(((attack0[:, :, 3] > 0) != (ready[:, :, 3] > 0)).sum())
    contract = {"file": KICK_OUT, "sheet": list(sheet.size), "cols": 2, "rows": 1, "count": 2, "cell": [KICK_CELL, KICK_CELL],
                "order": "left to right: 0 wind-up (knee up, pole raised back), 1 kick (leg straight out to the right at hip height)",
                "facing": "right (code mirrors with flipX for the enemy side)", "pivot": list(KICK_PIVOT),
                "pivotMeaning": "feet root on the ground line, same as assets/battle/janitor-hero-attack.png",
                "drawScale": 1, "rawPxPerGamePx": KICK_F,
                "scalePolicy": "anchor geometry: kick-anchor.png = attack frame 0 x3 NEAREST, feet root -> raw cell [430,430]",
                "alignment": "x from the anchor geometry (planted rear foot lands where the attack stance's rear foot is), "
                             "y integer shift so the planted foot's lowest row is the pivot row",
                "sampling": "block vote (majority colour bin, dark lines lum<70 win at >=0.4 of a block), grid phase searched",
                "suggestedHoldsMs": [200, 260], "loop": False,
                "binaryAlpha": True, "magentaPixels": 0, "removedFringePixels": fringe, "droppedSpecks": specks,
                "frames": [infos[i] for i in KICK_USED],
                "qc": {"readyCellVsAttackFrame0AlphaDiffPx": alpha_diff, "readyFrame": infos[0], "recoverFrame": infos[3]},
                "processorCommand": command}
    save_contract("kick", contract)
    print("kick", sheet.size, "frames", [(infos[i]["bounds"], infos[i]["shift"]) for i in KICK_USED],
          "ready-vs-attack0 alpha diff", alpha_diff)
    return contract


# ------------------------------------------------------------------------------------------------------------ effects
# name: raw, rows, cols, used raw cells, frame size, output, margin (px), dark_lum, dark_share (whirl: dark rule off)
FX: Final = {
    "whirl": ("whirl-raw.png", 2, 2, [0, 1, 2, 3], (96, 96), "assets/fx/janitor-whirl.png", 1, 0, 1.01),
    "slash": ("slash-raw.png", 2, 2, [0, 1, 2], (128, 128), "assets/fx/janitor-slash.png", 2, 90, 0.4),
}
FX_NOTES: Final = {
    "whirl": "0 forming (loose thin streaks), 1 full spinning-top tornado, 2 spinning wider and tearing, 3 dissolving wisps. "
             "Play 0-1-2-3 to vanish (teleport out) and 3-2-1-0 to appear.",
    "slash": "0 growing (upper two thirds of the arc), 1 full crescent, 2 fading (fill broken by horizontal gaps). "
             "Arc bulges to the RIGHT (in front of a right-facing janitor); code mirrors it for the enemy side. "
             "raw cell 3 (thin dashed sliver) is left unused in slash-raw.png.",
}


def export_fx(name: str) -> dict:
    raw, rows, cols, used, (fw, fh), out_path, margin, dark_lum, dark_share = FX[name]
    clean, command = processor(f"fx-{name}", raw, ["--target", "asset", "--mode", "fx", "--rows", str(rows), "--cols", str(cols),
                                                   "--cell-size", "256", "--fit-scale", "0.9", "--align", "center",
                                                   "--component-mode", "all", "--min-component-area", "24"])
    clean, fringe, specks = tidy(clean, 24)
    cells = [cells_of(clean, rows, cols)[i] for i in used]
    boxes = [c.getbbox() for c in cells]
    assert all(boxes), f"{name}: empty cell"
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    factor = max((union[2] - union[0]) / (fw - 2 * margin - 1), (union[3] - union[1]) / (fh - 2 * margin - 1))
    centre = ((union[0] + union[2]) / 2, (union[1] + union[3]) / 2)
    base = (centre[0] - fw / 2 * factor, centre[1] - fh / 2 * factor)
    best = None
    for py in (0.0, 0.25, 0.5, 0.75):
        for px in (0.0, 0.25, 0.5, 0.75):
            images, total = [], 0.0
            for cell in cells:
                stats: dict = {}
                images.append(vote_down(cell, factor, (base[0] + px * factor, base[1] + py * factor), (fw, fh),
                                        dark_lum=dark_lum, dark_share=dark_share, stats=stats))
                total += stats["purity"]
            if best is None or total > best[2]:
                best = (images, (px, py), total)
    assert best is not None
    frames, phase, purity = best
    infos = []
    for k, frame in enumerate(frames):
        box = inside(frame, margin)
        infos.append({"rawCell": used[k], "rawBounds": list(boxes[k]), "bounds": list(box),
                      "visibleSize": [box[2] - box[0], box[3] - box[1]]})
    strip = Image.new("RGBA", (fw * len(frames), fh))
    for k, frame in enumerate(frames):
        strip.paste(frame, (k * fw, 0))
    check_final(strip, name)
    (ROOT / f"fx-{name}").mkdir(exist_ok=True)
    strip.save(ROOT / f"fx-{name}" / "final.png")
    if EXPORT:
        strip.save(GAME / out_path)
    contract = {"file": out_path, "size": list(strip.size), "frames": len(frames), "frame": [fw, fh],
                "layout": "side by side, left to right", "pivot": [fw // 2, fh // 2], "pivotMeaning": "frame centre",
                "content": FX_NOTES[name], "rawPxPerGamePx": round(factor, 3),
                "placement": "one cell-local origin for all frames (raw union bbox centred in the frame), one grid phase",
                "phase": list(phase), "meanPurity": round(purity / len(frames), 4),
                "sampling": f"block vote (dark lum<{dark_lum} wins at >={dark_share} of a block)",
                "binaryAlpha": True, "magentaPixels": 0, "removedFringePixels": fringe, "droppedSpecks": specks,
                "frameInfo": infos, "processorCommand": command}
    save_contract(f"fx-{name}", contract)
    print(name, strip.size, "F", round(factor, 3), "bounds", [i["bounds"] for i in infos])
    return contract


STAR_OUT: Final = "assets/props/janitor-star.png"


def export_star() -> dict:
    clean, command = processor("star", "star-raw.png", ["--target", "asset", "--mode", "single", "--rows", "1", "--cols", "1",
                                                        "--cell-size", "256", "--fit-scale", "0.9", "--align", "center",
                                                        "--component-mode", "largest"])
    clean, fringe, specks = tidy(clean, 64)
    b = clean.getbbox()
    assert b is not None
    # the raw is drawn on its own ~21 px art grid: search the factor and phase that land on it (highest block purity)
    best = None
    for factor in np.arange(20.4, 22.81, 0.2):
        size = int(np.ceil(max(b[2] - b[0], b[3] - b[1]) / factor)) + 2
        for py in (0.0, 0.25, 0.5, 0.75):
            for px in (0.0, 0.25, 0.5, 0.75):
                stats: dict = {}
                origin = ((b[0] + b[2]) / 2 - size / 2 * factor + px * factor, (b[1] + b[3]) / 2 - size / 2 * factor + py * factor)
                image = vote_down(clean, float(factor), origin, (size, size), dark_lum=90, dark_share=0.4, stats=stats)
                if best is None or stats["purity"] > best[2]:
                    best = (image, float(factor), stats["purity"], (px, py))
    assert best is not None
    image, factor, purity, phase = best
    box = image.getbbox()
    assert box is not None
    w, h = box[2] - box[0], box[3] - box[1]
    side = max(w, h) + 2
    star = Image.new("RGBA", (side, side))
    star.paste(image.crop(box), ((side - w) // 2, (side - h) // 2))
    box = inside(star)
    check_final(star, "star")
    (ROOT / "star").mkdir(exist_ok=True)
    star.save(ROOT / "star" / "final.png")
    if EXPORT:
        star.save(GAME / STAR_OUT)
    contract = {"file": STAR_OUT, "size": list(star.size), "frames": 1, "pivot": [side // 2, side // 2], "pivotMeaning": "centre",
                "bounds": list(box), "visibleSize": [w, h], "rawPxPerGamePx": round(factor, 2), "phase": list(phase),
                "purity": round(purity, 4), "sampling": "block vote, factor/phase searched on the raw's own art grid",
                "content": "white plump five-point star, light grey shade lower right, 1 px dark outline (#1C1A28-ish)",
                "binaryAlpha": True, "magentaPixels": 0, "removedFringePixels": fringe, "droppedSpecks": specks,
                "processorCommand": command}
    save_contract("star", contract)
    print("star", star.size, "F", round(factor, 2), "bounds", box, "purity", round(purity, 4))
    return contract


# ----------------------------------------------------------------------------------------------------------- previews
def on(image: Image.Image, colour: tuple[int, int, int, int] = BG) -> Image.Image:
    bg = Image.new("RGBA", image.size, colour)
    bg.alpha_composite(image)
    return bg


def previews() -> None:
    """kick-compare-4x.png: approved attack frame 0 | processed ready cell | kick 0 | kick 1, same crop, 4x.
    preview-2x.png: the four game files at 1x on the battle-dark and on a light background, shown 2x."""
    with Image.open(GAME / "assets/battle/janitor-hero-attack.png") as attack:
        attack0 = attack.convert("RGBA").crop((0, 0, KICK_CELL, KICK_CELL))
    with Image.open(GAME / KICK_OUT if EXPORT else ROOT / "kick" / "final.png") as kick:
        kick = kick.convert("RGBA")
    with Image.open(ROOT / "kick" / "qc-ready.png") as ready:
        ready = ready.convert("RGBA")
    crop = (30, 80, 300, 252)
    tiles = [attack0, ready, kick.crop((0, 0, KICK_CELL, KICK_CELL)), kick.crop((KICK_CELL, 0, KICK_CELL * 2, KICK_CELL))]
    w, h = crop[2] - crop[0], crop[3] - crop[1]
    sheet = Image.new("RGBA", (w * 2 + 8, h * 2 + 8), BG)
    for k, tile in enumerate(tiles):
        t = on(tile.crop(crop))
        # ground line at the pivot row for the eye
        for x in range(t.width):
            if t.getpixel((x, KICK_PIVOT[1] - crop[1])) == BG:
                t.putpixel((x, KICK_PIVOT[1] - crop[1]), (70, 76, 96, 255))
        sheet.paste(t, ((k % 2) * (w + 8), (k // 2) * (h + 8)))
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.Resampling.NEAREST).save(ROOT / "kick-compare-4x.png")
    # playback check: approved attack ready frame -> wind-up -> kick -> ready, same 320 cell and pivot, 2x
    gif = [on(t.crop(crop)).resize((w * 2, h * 2), Image.Resampling.NEAREST).convert("RGB") for t in (tiles[0], tiles[2], tiles[3], tiles[0])]
    gif[0].save(ROOT / "kick.gif", save_all=True, append_images=gif[1:], duration=[300, 200, 300, 300], loop=0)
    files = [GAME / KICK_OUT, GAME / FX["whirl"][5], GAME / FX["slash"][5], GAME / STAR_OUT]
    if not EXPORT:
        files = [ROOT / "kick" / "final.png", ROOT / "fx-whirl" / "final.png", ROOT / "fx-slash" / "final.png", ROOT / "star" / "final.png"]
    images = []
    for f in files:
        with Image.open(f) as im:
            images.append(im.convert("RGBA"))
    width = max(images[0].width, images[1].width + images[3].width + 16, images[2].width) + 16
    height = images[0].height + images[1].height + images[2].height + 16 * 4
    out = Image.new("RGBA", (width * 2, height), BG)
    light = Image.new("RGBA", (width, height), (214, 214, 220, 255))
    out.paste(light, (width, 0))
    for col in range(2):
        x0 = col * width + 8
        y = 8
        out.alpha_composite(images[0], (x0, y))
        y += images[0].height + 16
        out.alpha_composite(images[1], (x0, y))
        out.alpha_composite(images[3], (x0 + images[1].width + 16, y + 36))
        y += images[1].height + 16
        out.alpha_composite(images[2], (x0, y))
    out.resize((out.width * 2, out.height * 2), Image.Resampling.NEAREST).save(ROOT / "preview-2x.png")
    print("previews written")


def main(targets: list[str]) -> None:
    if "kick" in targets:
        export_kick()
    for name in FX:
        if name in targets:
            export_fx(name)
    if "star" in targets:
        export_star()
    if "preview" in targets:
        previews()


if __name__ == "__main__":
    main([a for a in sys.argv[1:] if not a.startswith("--")] or ["kick", "whirl", "slash", "star", "preview"])
