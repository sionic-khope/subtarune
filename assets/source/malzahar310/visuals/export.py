#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "pydantic>=2"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# Run: uv run export.py
# ──────────────────
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Final

from PIL import Image
from pydantic import BaseModel, ConfigDict


class SourceFrame(BaseModel):
    model_config = ConfigDict(frozen=True)
    source_box: tuple[int, int, int, int]
    crop_bbox: tuple[int, int, int, int]


class SourceMetadata(BaseModel):
    model_config = ConfigDict(frozen=True)
    frames: tuple[SourceFrame, ...]


BASE: Final = Path(__file__).resolve().parent
ACTIONS: Final = ("hover", "cast", "dash", "hit", "voidling")
CELLS: Final = {"hover": 128, "cast": 128, "dash": 128, "hit": 128, "voidling": 64}
SCALES: Final = {"hover": 96 / 542, "cast": 96 / 542, "dash": 96 / 542, "hit": 96 / 542, "voidling": 44 / 519}
DURATIONS: Final = {"hover": [180, 180, 180, 180], "cast": [150, 200, 150, 180], "dash": [240, 100, 120, 200], "hit": [80, 130, 140, 180], "voidling": [90, 90, 90, 90]}


def main() -> None:
    contact = Image.new("RGBA", (512, 640), (31, 35, 47, 255))
    report = []
    for row, action in enumerate(ACTIONS):
        folder = BASE / action
        meta = SourceMetadata.model_validate_json((folder / "pipeline-meta.json").read_text())
        frames = []
        frame_reports = []
        cell = CELLS[action]
        scale = SCALES[action]
        with Image.open(folder / "raw-sheet-clean.png") as source:
            for index, frame_meta in enumerate(meta.frames):
                origin_x, origin_y = frame_meta.source_box[:2]
                left, top, right, bottom = frame_meta.crop_bbox
                source_rect = (origin_x + left, origin_y + top, origin_x + right, origin_y + bottom)
                crop = source.convert("RGBA").crop(source_rect)
                crop.putalpha(crop.getchannel("A").point(lambda value: 255 if value >= 128 else 0))
                size = (round(crop.width * scale), round(crop.height * scale))
                sprite = crop.resize(size, Image.Resampling.NEAREST)
                paste = ((cell - size[0]) // 2, (cell - size[1]) // 2)
                canvas = Image.new("RGBA", (cell, cell))
                canvas.alpha_composite(sprite, paste)
                bounds = canvas.getbbox()
                assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < cell and bounds[3] < cell
                assert set(canvas.getchannel("A").get_flattened_data()) == {0, 255}
                frame_reports.append({"index": index, "source_cell": frame_meta.source_box, "crop_cell_local": frame_meta.crop_bbox, "source_rect_global": source_rect, "source_to_output_scale": scale, "output_bounds": bounds, "pivot": [cell // 2, cell // 2], "sha256_rgba": hashlib.sha256(canvas.tobytes()).hexdigest(), "edge_touch": False, "paste_clamped": False})
                canvas.save(folder / f"frame-{index}.png")
                frames.append(canvas)
                contact.alpha_composite(canvas, (index * 128 + (128 - cell) // 2, row * 128 + (128 - cell) // 2))
        sheet = Image.new("RGBA", (cell * 2, cell * 2))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, ((index % 2) * cell, (index // 2) * cell))
        sheet.save(BASE / f"{action}.png")
        preview_frames = []
        for frame in frames:
            preview = Image.new("RGBA", frame.size, (31, 35, 47, 255))
            preview.alpha_composite(frame)
            preview_frames.append(preview.convert("RGB").resize((cell * 3, cell * 3), Image.Resampling.NEAREST))
        preview_frames[0].save(folder / "final-animation.gif", save_all=True, append_images=preview_frames[1:], duration=DURATIONS[action], loop=0)
        assert len({item["sha256_rgba"] for item in frame_reports}) == 4
        report.append({"action": action, "sheet_size": sheet.size, "cell_size": cell, "durations_ms": DURATIONS[action], "frames": frame_reports})
    contact.resize((1024, 1280), Image.Resampling.NEAREST).save(BASE / "contact-preview-2x.png")
    (BASE / "final-qc.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
