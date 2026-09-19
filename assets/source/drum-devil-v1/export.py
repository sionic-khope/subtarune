#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy", "scipy"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run assets/source/drum-devil-v1/export.py
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
SCALE: Final = 0.34
PIVOT: Final = (148, 238)
ROOTS: Final = {
    "idle": ((347, 600), (957, 600), (350, 1198), (954, 1200)),
    "attack": ((375, 600), (940, 604), (443, 1177), (957, 1180)),
}
DURATIONS: Final = {"idle": (220, 220, 220, 220), "attack": (180, 220, 140, 260)}


def main() -> None:
    metadata = {"scale": SCALE, "cell": [256, 256], "grid": [2, 2],
                "pivot": PIVOT, "filter": "NEAREST", "actions": {}}
    preview = Image.new("RGBA", (1024, 512))
    for action, roots in ROOTS.items():
        with Image.open(HERE / f"{action}-raw.png") as source:
            pixels = np.array(source.convert("RGBA"))
        labels, _ = label(pixels[:, :, 3] > 0)
        components = []
        for identifier, region in enumerate(find_objects(labels), start=1):
            if region is not None and int(np.sum(labels[region] == identifier)) > 10000:
                components.append((identifier, region))
        components.sort(key=lambda item: (item[1][0].start // 627, item[1][1].start))
        assert len(components) == 4, (action, len(components))
        frames: list[Image.Image] = []
        records = []
        sheet = Image.new("RGBA", (512, 512))
        for index, ((identifier, region), root) in enumerate(zip(components, roots, strict=True)):
            ys, xs = region
            component = pixels[region].copy()
            component[labels[region] != identifier] = 0
            figure = Image.fromarray(component)
            scaled = figure.resize((round(figure.width * SCALE), round(figure.height * SCALE)), Image.Resampling.NEAREST)
            offset = (PIVOT[0] - round((root[0] - xs.start) * SCALE),
                      PIVOT[1] - round((root[1] - ys.start) * SCALE))
            assert offset[0] > 0 and offset[1] > 0, (action, index, offset)
            assert offset[0] + scaled.width < 256 and offset[1] + scaled.height < 256
            frame = Image.new("RGBA", (256, 256))
            frame.paste(scaled, offset)
            frame.save(HERE / f"{action}-{index}.png")
            frames.append(frame)
            sheet.paste(frame, ((index % 2) * 256, (index // 2) * 256))
            preview.paste(frame, (index * 256, (0 if action == "idle" else 256)))
            records.append({"index": index, "sourceBbox": [xs.start, ys.start, xs.stop, ys.stop],
                            "sourceRoot": root, "outputBbox": frame.getbbox(),
                            "pasteOffset": offset, "durationMs": DURATIONS[action][index]})
        sheet.save(ROOT / "assets" / "enemies" / f"drum-devil-{action}.png")
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
    with Image.open(HERE / "idle-0.png") as idle:
        idle.save(ROOT / "assets" / "enemies" / "drum-devil-field.png")
        comparison = Image.new("RGBA", (360, 256))
        comparison.paste(idle, (0, 0))
    with Image.open(ROOT / "assets" / "sprites" / "hyungsub.png") as hero:
        hero_frame = hero.crop((0, 0, hero.width // 4, hero.height // 4))
        comparison.paste(hero_frame, (270, 238 - hero_frame.height))
    comparison.save(HERE / "yoplait-comparison-native.png")
    (HERE / "runtime-contract.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata))


if __name__ == "__main__":
    main()
