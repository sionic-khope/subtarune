#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# Install uv: https://docs.astral.sh/uv/
# From repository root: uv run assets/source/regret315/yisub/export.py
# ──────────────────
"""Mechanically export generated regret315 sprites without drawing artwork."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops


def main() -> None:
    """Threshold generated alpha, run existing QC, and assemble runtime PNGs."""
    for identity in ("yisub", "syndrasub"):
        base = Path("assets/source/regret315") / identity
        with Image.open(base / "raw-sheet.png") as opened:
            pixels = np.array(opened.convert("RGBA"))
        pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
        pixels[pixels[:, :, 3] == 0, :3] = 0
        clean = Image.fromarray(pixels)
        clean.save(base / "raw-binary-alpha.png")
        subprocess.run([
            sys.executable, "tools/sprites/sheet_processor.py", "process",
            "--input", str(base / "raw-binary-alpha.png"), "--target", "npc",
            "--mode", "combat", "--rows", "2", "--cols", "2",
            "--output-dir", str(base / "processed-final"), "--cell-size", "128",
            "--fit-scale", "0.80", "--align", "feet", "--shared-scale",
            "--scale-strategy", "fit", "--component-mode", "all",
            "--trim-border", "0", "--edge-clean-depth", "0", "--strict-qc",
            "--max-body-scale-cv", "0.08", "--max-anchor-y-std", "0.05",
            "--prompt-file", str(base / ("prompt-v2-compact-sword.txt" if identity == "yisub" else "prompt-used.txt")),
        ], check=True)
        source_size = clean.width // 2
        sources = [clean.crop((i % 2 * source_size, i // 2 * source_size,
                    (i % 2 + 1) * source_size, (i // 2 + 1) * source_size))
                   for i in range(4)]
        neutral_bounds = sources[0].getbbox()
        assert neutral_bounds is not None
        scale = 98 / (neutral_bounds[3] - neutral_bounds[1])
        frames: list[Image.Image] = []
        metrics = []
        sheet = Image.new("RGBA", (256, 256))
        for index, source in enumerate(sources):
            bounds = source.getbbox()
            assert bounds is not None
            x0, y0, x1, y1 = bounds
            _, foot_x = np.nonzero(np.array(source)[:, :, 3][y1 - 30:y1] > 0)
            root_x = (float(foot_x.min()) + float(foot_x.max()) + 1) / 2
            crop = source.crop(bounds)
            scaled = crop.resize((round(crop.width * scale), round(crop.height * scale)),
                                 Image.Resampling.NEAREST)
            left, top = round(64 - (root_x - x0) * scale), 120 - scaled.height
            assert left > 0 and top > 0 and left + scaled.width < 128
            frame = Image.new("RGBA", (128, 128))
            frame.paste(scaled, (left, top))
            frame.save(base / f"frame-{index}.png")
            frames.append(frame)
            sheet.paste(frame, (index % 2 * 128, index // 2 * 128))
            alpha = np.array(frame)[:, :, 3]
            assert set(np.unique(alpha)) == {0, 255}
            rgba = np.array(frame)
            assert not np.any((rgba[:, :, 0] > 200) & (rgba[:, :, 1] < 80)
                              & (rgba[:, :, 2] > 200) & (alpha > 0))
            final_bounds = frame.getbbox()
            assert final_bounds is not None and final_bounds[3] == 120
            metrics.append({"index": index, "bbox": list(final_bounds),
                            "height": final_bounds[3] - final_bounds[1],
                            "source_bbox": list(bounds), "paste": [left, top]})
        sheet.save(f"assets/enemies/{identity}-battle.png")
        frames[0].save(f"assets/enemies/{identity}-front.png")
        assert ImageChops.difference(sheet.crop((0, 0, 128, 128)), frames[0]).getbbox() is None
        preview = Image.new("RGBA", sheet.size, "#302838")
        preview.alpha_composite(sheet)
        preview.resize((768, 768), Image.Resampling.NEAREST).save(base / "preview.png")
        comparison = Image.new("RGBA", (384, 128), "#302838")
        for position, reference in enumerate(("seobruto", "udyrsub", identity)):
            with Image.open(f"assets/enemies/{reference}-front.png") as opened:
                comparison.alpha_composite(opened.convert("RGBA"), (position * 128, 0))
        comparison.resize((1152, 384), Image.Resampling.NEAREST).save(base / "scale-comparison.png")
        animation = []
        for frame in frames:
            background = Image.new("RGBA", frame.size, "#302838")
            background.alpha_composite(frame)
            animation.append(background.convert("RGB").resize((384, 384), Image.Resampling.NEAREST))
        animation[0].save(base / "animation.gif", save_all=True, append_images=animation[1:],
                          duration=[400, 240, 180, 300], loop=0, disposal=2)
        qc = {"sheet_size": [256, 256], "cell_size": [128, 128], "pivot": [64, 120],
              "frame_order": ["neutral", "windup", "attack", "hurt"],
              "durations_ms": [400, 240, 180, 300], "runtime_loop": False,
              "return_to": 0, "front_equals_cell0": True, "resampling": "NEAREST",
              "magenta_pixels": 0, "empty_frames": [], "edge_touch_frames": [],
              "common_scale": scale, "alpha_values": [0, 255], "frames": metrics,
              "tool": "built-in image_gen", "model": "unknown", "cost": "unknown",
              "raw_sha256": hashlib.sha256((base / "raw-sheet.png").read_bytes()).hexdigest()}
        (base / "runtime-qc.json").write_text(json.dumps(qc, indent=2) + "\n")
        print(json.dumps({"id": identity, "scale": scale, "frames": metrics}))


if __name__ == "__main__":
    main()
