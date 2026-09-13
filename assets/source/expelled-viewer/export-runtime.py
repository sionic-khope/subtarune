#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "pydantic"]
# ///
# How to run:
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run assets/source/expelled-viewer/export-runtime.py
"""Package image-generated source poses without repainting or color quantization."""
from __future__ import annotations

import json
from pathlib import Path
from typing import ClassVar, Final

from PIL import Image
from pydantic import BaseModel, ConfigDict


class Frame(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]


class Pipeline(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    trim_border: int
    frames: tuple[Frame, ...]


ROOT: Final = Path(__file__).resolve().parent
RUNTIME: Final = ROOT.parents[1] / "sprites"
CELL: Final = 96
PIVOT: Final = (48, 88)
# One fixed magnification per source geometry, never per pose.
ACTIONS: Final = (("crouch", 2, 0.14578352180936993),
                  ("reveal", 2, 0.14578352180936993),
                  ("dance", 4, 0.21),
                  ("knockdown", 2, 0.14578352180936993))


def main() -> None:
    """Export nearest-neighbor cells with shared bottom pivot and audit containment."""
    RUNTIME.mkdir(exist_ok=True)
    contact = Image.new("RGBA", (CELL * 4, CELL * 5), (45, 55, 72, 255))
    report: list[dict[str, str | int | float | tuple[int, int, int, int]]] = []
    contact_index = 0
    for action, rows, scale in ACTIONS:
        action_dir = ROOT / action
        pipeline = Pipeline.model_validate_json((action_dir / "pipeline-meta.json").read_text())
        sheet = Image.new("RGBA", (CELL * 2, CELL * rows))
        with Image.open(action_dir / "raw-sheet-clean.png") as source:
            for index, frame in enumerate(pipeline.frames):
                sx, sy, _, _ = frame.source_box
                x0, y0, x1, y1 = frame.crop_bbox
                trim = pipeline.trim_border
                crop = source.crop((sx + trim + x0, sy + trim + y0,
                                    sx + trim + x1, sy + trim + y1)).convert("RGBA")
                pixels = bytearray(crop.tobytes())
                for offset in range(0, len(pixels), 4):
                    r, g, b = pixels[offset:offset + 3]
                    if r > g + 12 and b > g + 12:
                        pixels[offset] = g
                        pixels[offset + 2] = g
                crop = Image.frombytes("RGBA", crop.size, bytes(pixels))
                size = (round(crop.width * scale), round(crop.height * scale))
                sprite = crop.resize(size, Image.Resampling.NEAREST)
                cell = Image.new("RGBA", (CELL, CELL))
                origin = (PIVOT[0] - size[0] // 2, PIVOT[1] + 1 - size[1])
                assert origin[0] > 0 and origin[1] > 0
                assert origin[0] + size[0] < CELL and origin[1] + size[1] < CELL
                cell.paste(sprite, origin)
                bbox = cell.getbbox()
                assert bbox is not None
                assert 0 < bbox[0] < bbox[2] < CELL and 0 < bbox[1] < bbox[3] < CELL
                cell_bytes = cell.tobytes()
                colors = tuple(zip(cell_bytes[0::4], cell_bytes[1::4], cell_bytes[2::4], cell_bytes[3::4], strict=True))
                opaque_black = sum(1 for r, g, b, a in colors
                                   if max(r, g, b) < 35 and a == 255)
                assert opaque_black > 100
                assert all(not (r > 180 and b > 180 and g < 80) for r, g, b, a in colors if a)
                sheet.paste(cell, ((index % 2) * CELL, (index // 2) * CELL))
                cell.save(action_dir / f"runtime-{index}.png")
                contact.alpha_composite(cell, ((contact_index % 4) * CELL,
                                               (contact_index // 4) * CELL))
                contact_index += 1
                report.append({"action": action, "frame": index, "bbox": bbox,
                               "scale": scale, "opaque_black_pixels": opaque_black})
                if action == "crouch" and index == 0:
                    cell.save(RUNTIME / "expelled-viewer.png")
                if action == "knockdown" and index == 3:
                    cell.save(RUNTIME / "expelled-viewer-down.png")
        sheet.save(RUNTIME / f"expelled-viewer-{action}.png")
    contact.resize((1152, 1440), Image.Resampling.NEAREST).save(ROOT / "contact-preview.png")
    _ = (ROOT / "runtime-qc.json").write_text(json.dumps({
        "cell": [CELL, CELL], "pivot": PIVOT, "filter": "nearest",
        "color_quantization": False, "magenta_despill": True, "source": "builtin image_gen",
        "frames": report, "edge_touch_frames": [], "clipped_frames": [],
        "note": "Crouch intentionally compressed; dance geometry uses fixed anatomical scale."
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
