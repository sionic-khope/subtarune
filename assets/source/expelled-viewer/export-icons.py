#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# Run: uv run assets/source/expelled-viewer/export-icons.py
"""Extract generated battle icons, preserving source RGB and opaque silhouettes."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
DESTINATION: Final = ROOT.parents[1] / "battle"
ICONS: Final = (("chicken", (0, 0, 627, 627)),
               ("timeout", (627, 0, 1254, 627)),
               ("rock", (0, 627, 627, 1254)),
               ("shard", (700, 690, 937, 950)))


def main() -> None:
    """Export four 32-pixel icons with a three-pixel safe margin."""
    DESTINATION.mkdir(exist_ok=True)
    preview = Image.new("RGBA", (128, 32), (45, 55, 72, 255))
    report: list[dict[str, str | tuple[int, int, int, int]]] = []
    with Image.open(ROOT / "icons" / "raw-sheet.png") as source:
        for index, (name, region) in enumerate(ICONS):
            cropped = source.crop(region).convert("RGBA")
            pixels = bytearray(cropped.tobytes())
            for offset in range(3, len(pixels), 4):
                pixels[offset] = 255 if pixels[offset] >= 128 else 0
            cropped = Image.frombytes("RGBA", cropped.size, bytes(pixels))
            bbox = cropped.getbbox()
            assert bbox is not None
            cropped = cropped.crop(bbox)
            scale = 26 / max(cropped.size)
            size = (round(cropped.width * scale), round(cropped.height * scale))
            sprite = cropped.resize(size, Image.Resampling.NEAREST)
            frame = Image.new("RGBA", (32, 32))
            frame.paste(sprite, ((32 - size[0]) // 2, (32 - size[1]) // 2))
            bounds = frame.getbbox()
            assert bounds is not None and all(0 < value < 32 for value in bounds)
            assert set(frame.getchannel("A").tobytes()) == {0, 255}
            frame.save(DESTINATION / f"expelled-viewer-{name}.png")
            preview.alpha_composite(frame, (index * 32, 0))
            report.append({"name": name, "source_region": region, "bbox": bounds})
    preview.resize((768, 192), Image.Resampling.NEAREST).save(ROOT / "icons-preview.png")
    _ = (ROOT / "icons-qc.json").write_text(json.dumps({
        "size": [32, 32], "filter": "nearest", "source_has_alpha": True,
        "alpha_cleanup_threshold": 128, "rgb_quantization": False,
        "shard": "Single upper-left fragment from the supplied generated shard pack.",
        "icons": report, "edge_touch_frames": [], "empty_frames": []
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
