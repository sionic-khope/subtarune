#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy", "pillow"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# uv run assets/source/cathedral321/export.py /path/to/generate2dsprite.py
# ──────────────────
"""Mechanically export the three generated cathedral props without repainting."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
PROPS: Final = ROOT.parents[1] / "props"
SPECS: Final = (("window", (72, 176), 90), ("column", (80, 160), 90),
               ("sconce", (40, 72), 90))


def main() -> None:
    """Run the skill processor, preserve alpha, fit once and record exact QC."""
    processor = Path(sys.argv[1]).resolve(strict=True)
    for name, canvas_size, edge_threshold in SPECS:
        directory = ROOT / name
        raw_path = directory / "generated-raw.png"
        processed = directory / "processor"
        command = [
            sys.executable, str(processor), "process", "--input", str(raw_path),
            "--target", "asset", "--mode", "single", "--rows", "1", "--cols", "1",
            "--output-dir", str(processed), "--cell-size", "256",
            "--threshold", "0", "--edge-threshold", str(edge_threshold),
            "--trim-border", "0", "--edge-clean-depth", "0",
            "--component-mode", "all", "--component-padding", "0",
            "--min-component-area", "1", "--fit-scale", "0.90",
            "--align", "center", "--strict-qc",
        ]
        if name == "column":
            command.append("--allow-source-edge-touch")
        subprocess.run(command, check=True)
        with Image.open(raw_path) as raw:
            raw_mode, raw_size = raw.mode, raw.size
            raw_alpha = raw.convert("RGBA").getchannel("A")
        with Image.open(processed / "raw-sheet-clean.png") as source:
            clean = source.convert("RGBA")
        bbox = clean.getchannel("A").point(lambda alpha: 255 if alpha >= 2 else 0).getbbox()
        assert bbox is not None, name
        crop = clean.crop(bbox)
        scale = min((canvas_size[0] - 4) / crop.width,
                    (canvas_size[1] - 4) / crop.height)
        resized_size = (round(crop.width * scale), round(crop.height * scale))
        subject = crop.resize(resized_size, Image.Resampling.NEAREST)
        offset = ((canvas_size[0] - subject.width) // 2,
                  (canvas_size[1] - subject.height) // 2)
        result = Image.new("RGBA", canvas_size)
        result.paste(subject, offset)
        final_path = PROPS / f"castle321_{name}.png"
        result.save(final_path)
        result.save(directory / "final.png")
        result.resize((canvas_size[0] * 4, canvas_size[1] * 4),
                      Image.Resampling.NEAREST).save(directory / "preview-4x.png")
        with Image.open(final_path) as final:
            final.load()
            pixels = np.asarray(final)
            alpha_bbox = final.getchannel("A").getbbox()
            assert final.format == "PNG" and final.size == canvas_size
        assert alpha_bbox is not None, name
        x0, y0, x1, y1 = alpha_bbox
        assert x0 > 0 and y0 > 0 and x1 < canvas_size[0] and y1 < canvas_size[1]
        rgb = pixels[:, :, :3].astype(np.int32)
        distance = np.sum((rgb - np.array([255, 0, 255])) ** 2, axis=2)
        residual_magenta = int(np.count_nonzero((distance < 90 ** 2) & (pixels[:, :, 3] > 0)))
        assert residual_magenta == 0, (name, residual_magenta)
        alpha_preserved = bool(np.array_equal(np.asarray(raw_alpha),
                                             np.asarray(clean.getchannel("A"))))
        metadata = {
            "asset": name, "raw_mode": raw_mode, "raw_size": raw_size,
            "backend": "Codex built-in imagegen; backend model/quality/usage unknown",
            "processor_command": command, "raw_alpha_preserved": alpha_preserved,
            "background": "generated alpha preserved except border-connected magenta distance <90",
            "crop_bbox": bbox, "crop_detection_min_alpha": 2,
            "crop_alpha_policy": "retain all original alpha inside crop; exclude distant alpha=1 noise",
            "nominal_uniform_scale": scale,
            "resized_size": resized_size, "integer_rounding": "nearest pixel",
            "resampling": "NEAREST", "canvas_size": canvas_size,
            "paste_offset": offset, "alpha_bbox": alpha_bbox,
            "source_edge_exception": name == "column",
            "source_edge_reason": "invisible alpha fringe at x=0; complete visible subject reviewed" if name == "column" else None,
            "opaque_or_partial_pixels": int(np.count_nonzero(pixels[:, :, 3])),
            "residual_magenta_pixels": residual_magenta,
            "qc": "PNG decoded; exact dimensions; nonempty; no output edge contact; no residual magenta",
        }
        (directory / "export-meta.json").write_text(json.dumps(metadata, indent=2) + "\n")
        print(name, canvas_size, alpha_bbox, "magenta", residual_magenta)


if __name__ == "__main__":
    main()
