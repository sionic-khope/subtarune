#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow==12.3.0"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# From repository root: uv run tools/sprites/prepare_ship_castle.py
# ──────────────────
"""Export image-model castle sequence assets without painting or shape changes."""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parents[2]
SOURCE: Final = ROOT / "assets/source/ship-castle/visuals"


@dataclass(frozen=True, slots=True)
class Prop:
    source: str
    output: str
    canvas: tuple[int, int]


@dataclass(frozen=True, slots=True)
class Export:
    source: str
    source_size: tuple[int, int]
    source_sha256: str
    output: str
    output_size: tuple[int, int]
    output_sha256: str
    source_bounds: tuple[int, int, int, int]
    content_size: tuple[int, int]
    placement: tuple[int, int]


PROPS: Final = (
    Prop("purple-cord-raw.png", "purple_cord.png", (48, 32)),
    Prop("lounge-window-raw.png", "ship_lounge_window.png", (96, 144)),
    Prop("gajaeman-castle-corrected-raw.png", "gajaeman_castle.png", (768, 768)),
)


def main() -> None:
    """Fit complete alpha silhouettes and record the reproducible export contract."""
    records: list[Export] = []
    for prop in PROPS:
        source_path = SOURCE / prop.source
        with Image.open(source_path) as raw:
            assert raw.mode == "RGBA", "Inspect a new transparency format before export."
            source = raw.copy()
        source.putalpha(source.getchannel("A").point([value if value >= 8 else 0 for value in range(256)]))
        bounds = source.getchannel("A").getbbox()
        assert bounds is not None, f"Empty source: {prop.source}"
        content = source.crop(bounds)
        scale = min((prop.canvas[0] - 4) / content.width, (prop.canvas[1] - 4) / content.height)
        size = (round(content.width * scale), round(content.height * scale))
        placement = ((prop.canvas[0] - size[0]) // 2, prop.canvas[1] - 2 - size[1])
        output = Image.new("RGBA", prop.canvas)
        output.paste(content.resize(size, Image.Resampling.NEAREST), placement)
        output_path = ROOT / "assets/props" / prop.output
        output.save(output_path)
        preview_scale = min(4, 768 / max(prop.canvas))
        preview_size = (round(prop.canvas[0] * preview_scale), round(prop.canvas[1] * preview_scale))
        output.resize(preview_size, Image.Resampling.NEAREST).save(SOURCE / f"{output_path.stem}-preview.png")
        records.append(Export(str(source_path.relative_to(ROOT)), source.size,
                              hashlib.sha256(source_path.read_bytes()).hexdigest(),
                              str(output_path.relative_to(ROOT)), output.size,
                              hashlib.sha256(output_path.read_bytes()).hexdigest(), bounds, size, placement))
    memory_contact = Image.new("RGB", (1152, 432), "black")
    for index in range(1, 6):
        source_path = SOURCE / f"gajaeman-memory-{index}-corrected-raw.png"
        with Image.open(source_path) as raw:
            source = raw.convert("RGB")
        scale = min(384 / source.width, 216 / source.height)
        size = (round(source.width * scale), round(source.height * scale))
        placement = ((384 - size[0]) // 2, (216 - size[1]) // 2)
        panel = Image.new("RGB", (384, 216), "black")
        panel.paste(source.resize(size, Image.Resampling.NEAREST), placement)
        output_path = ROOT / "assets/illustrations" / f"gajaeman-memory-{index}.png"
        panel.save(output_path)
        memory_contact.paste(panel, ((index - 1) % 3 * 384, (index - 1) // 3 * 216))
        records.append(Export(str(source_path.relative_to(ROOT)), source.size,
                              hashlib.sha256(source_path.read_bytes()).hexdigest(),
                              str(output_path.relative_to(ROOT)), panel.size,
                              hashlib.sha256(output_path.read_bytes()).hexdigest(),
                              (0, 0, source.width, source.height), size, placement))
    memory_contact.save(SOURCE / "memory-contact-runtime.png")
    metadata = {"backend": "built-in image_gen", "model": "unknown", "usageCost": "unknown",
                "resampling": "NEAREST", "paletteQuantization": False,
                "alpha": "clear values below 8 only, otherwise preserve actual alpha; no RGB key",
                "anchor": "props bottom-center, 2px safety margin",
                "memoryPanels": "opaque full composition, aspect fit centered on black canvas; no crop",
                "references": [{"path": str((SOURCE / name).relative_to(ROOT)),
                                "sha256": hashlib.sha256((SOURCE / name).read_bytes()).hexdigest()}
                               for name in ("gajaeman-castle-reference.png", "memory-character-reference.png",
                                            "memory-yellow-style-reference.png")],
                "exports": [asdict(record) for record in records]}
    _ = (SOURCE / "export.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
