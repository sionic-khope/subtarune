#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy", "scipy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run assets/source/drum-devil-raisedhands-v4/export.py
# ──────────────────
from __future__ import annotations

import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image
from scipy.ndimage import find_objects, label

HERE: Final = Path(__file__).resolve().parent
ROOT: Final = HERE.parents[2]
SCALE: Final = 0.44
CELL: Final = 384
PIVOT: Final = (216, 320)
ROOTS: Final = {
    "idle": ((334, 577), (962, 577), (334, 1176), (958, 1176)),
    "attack": ((348, 603), (950, 602), (440, 1177), (956, 1186)),
}
DURATIONS: Final = {"idle": (220, 220, 220, 220), "attack": (180, 220, 140, 260)}
HAND_REGIONS: Final = {
    "idle": (((70, 170, 165, 280), (255, 170, 350, 280)),) * 4,
    "attack": (((115, 128, 185, 200), (255, 175, 350, 280)),
               ((85, 133, 150, 200), (255, 175, 350, 280)),
               ((38, 195, 145, 280), (235, 135, 302, 210)),
               ((70, 170, 165, 280), (255, 170, 350, 280))),
}


def main() -> None:
    metadata = {"scale": SCALE, "cell": [CELL, CELL], "grid": [2, 2],
                "pivot": PIVOT, "filter": "NEAREST", "actions": {}}
    preview = Image.new("RGBA", (CELL * 4, CELL * 2))
    idle_bounds: list[tuple[int, int, int, int]] = []
    all_bounds: list[tuple[int, int, int, int]] = []
    for action, roots in ROOTS.items():
        raw_name = f"{action}-raw.png"
        with Image.open(HERE / raw_name) as source:
            pixels = np.array(source.convert("RGBA"))
        labels, _ = label(pixels[:, :, 3] > 1)
        components = []
        for identifier, region in enumerate(find_objects(labels), start=1):
            if region is not None and int(np.sum(labels[region] == identifier)) > 10000:
                components.append((identifier, region))
        components.sort(key=lambda item: (item[1][0].start // 627, item[1][1].start))
        assert len(components) == 4, (action, len(components))
        frames: list[Image.Image] = []
        records = []
        sheet = Image.new("RGBA", (CELL * 2, CELL * 2))
        for index, ((identifier, region), root) in enumerate(zip(components, roots, strict=True)):
            ys, xs = region
            component = pixels[region].copy()
            component[labels[region] != identifier] = 0
            figure = Image.fromarray(component)
            scaled = figure.resize((round(figure.width * SCALE), round(figure.height * SCALE)), Image.Resampling.NEAREST)
            offset = (PIVOT[0] - round((root[0] - xs.start) * SCALE),
                      PIVOT[1] - round((root[1] - ys.start) * SCALE))
            assert offset[0] > 0 and offset[1] > 0, (action, index, offset)
            assert offset[0] + scaled.width < CELL and offset[1] + scaled.height < CELL
            frame = Image.new("RGBA", (CELL, CELL))
            frame.paste(scaled, offset)
            frame.save(HERE / f"{action}-{index}.png")
            bbox = frame.getbbox()
            assert bbox is not None
            all_bounds.append(bbox)
            if action == "idle":
                idle_bounds.append(bbox)
            frames.append(frame)
            sheet.paste(frame, ((index % 2) * CELL, (index // 2) * CELL))
            preview.paste(frame, (index * CELL, (0 if action == "idle" else CELL)))
            records.append({"index": index, "sourceBbox": [xs.start, ys.start, xs.stop, ys.stop],
                            "sourceRoot": root, "outputBbox": frame.getbbox(),
                            "pasteOffset": offset, "durationMs": DURATIONS[action][index],
                            "fullHandReviewRegions": HAND_REGIONS[action][index]})
        sheet.save(HERE / f"{action}-transparent.png")
        gif_frames = []
        for frame in frames:
            palette = frame.convert("RGB").quantize(colors=255)
            palette.paste(255, mask=frame.getchannel("A").point(lambda alpha: 255 if alpha < 128 else 0))
            palette.info["transparency"] = 255
            gif_frames.append(palette)
        gif_frames[0].save(HERE / f"{action}.gif", save_all=True, append_images=gif_frames[1:],
                           duration=DURATIONS[action], loop=0, transparency=255, disposal=2)
        metadata["actions"][action] = {"frames": records, "loop": action == "idle",
                                        "previewGifLoops": True, "outputEdgeTouch": [], "pasteClamped": []}
    preview.save(HERE / "preview-transparent.png")
    dark_preview = Image.new("RGBA", preview.size, (48, 52, 61, 255))
    dark_preview.alpha_composite(preview)
    dark_preview.save(HERE / "preview-dark.png")
    field_box = (min(b[0] for b in idle_bounds) - 4, min(b[1] for b in idle_bounds) - 4,
                 max(b[2] for b in idle_bounds) + 4, max(b[3] for b in idle_bounds) + 4)
    with Image.open(HERE / "idle-0.png") as idle:
        field = idle.crop(field_box)
        field.save(HERE / "field-transparent.png")
        metadata["field"] = {"source": "idle-0.png", "cropXYWH": [*field_box[:2], *field.size],
                             "size": field.size, "pivot": [PIVOT[0]-field_box[0], PIVOT[1]-field_box[1]], "scale": 1}
        comparison = Image.new("RGBA", (CELL + 120, CELL))
        comparison.paste(idle, (0, 0))
    with Image.open(ROOT / "assets" / "sprites" / "hyungsub.png") as hero:
        hero_frame = hero.crop((0, 0, hero.width // 4, hero.height // 4))
        comparison.paste(hero_frame, (CELL + 14, PIVOT[1] - hero_frame.height))
    comparison.save(HERE / "yoplait-comparison-native.png")
    before_after = Image.new("RGBA", (CELL * 2, CELL), (48, 52, 61, 255))
    with Image.open(HERE.parent / "drum-devil-longarms-v3" / "idle-0.png") as old:
        before_after.alpha_composite(old, (0, 0))
    with Image.open(HERE / "idle-0.png") as current:
        before_after.alpha_composite(current, (CELL, 0))
    before_after.save(HERE / "before-after-same-scale.png")
    metadata["allFrameBounds"] = [min(b[0] for b in all_bounds), min(b[1] for b in all_bounds),
                                  max(b[2] for b in all_bounds), max(b[3] for b in all_bounds)]
    metadata["throwHand"] = {"action": "attack", "frame": 1, "contact": [108, 160],
                              "relativeToPivot": [-108, -160], "palmCenter": [108, 171]}
    metadata["overallEnlargement"] = {"runtimeFactor": 1.2, "bakedIntoImages": False}
    metadata["menuClearance"] = {"reviewRegionMaxY": 280, "rootScreenY": 272,
                                  "runtimeScale": 1.2, "maxRegionScreenY": 224,
                                  "menuTop": 246, "margin": 22,
                                  "regionMethod": "Manually reviewed conservative full-hand rectangles, not alpha segmentation."}
    (HERE / "runtime-contract.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata))


if __name__ == "__main__":
    main()
