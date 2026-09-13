#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "numpy"]
# ///
# ─── How to run ───
# uv run reprocess.py
# Uses the preserved process-nearest.py beside this script.
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
ROWS: Final = ((40, 312), (320, 588), (604, 870), (886, 1145))
COLUMNS: Final = ((90, 315), (380, 605), (680, 905), (980, 1205))
ENGINE_ROWS: Final = (0, 3, 1, 2)
DIRECTIONS: Final = ("down", "up", "left", "right")


def main() -> None:
    with Image.open(ROOT / "raw-sheet.png") as source:
        raw = source.convert("RGBA")
    pixels = np.asarray(raw).astype(float)
    foreground = np.linalg.norm(pixels[:, :, :3] - [255, 0, 255], axis=2) >= 150
    covered = np.zeros(foreground.shape, dtype=bool)
    regrouped = Image.new("RGBA", (1400, 1400), (255, 0, 255, 255))
    source_bounds = []
    for row, (top, bottom) in enumerate(ROWS):
        for col, (left, right) in enumerate(COLUMNS):
            mask = foreground[top:bottom, left:right]
            ys, xs = np.where(mask)
            bounds = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
            assert bounds[0] > 0 and bounds[1] > 0
            assert bounds[2] < right - left and bounds[3] < bottom - top
            covered[top:bottom, left:right] = True
            crop = raw.crop((left, top, right, bottom))
            regrouped.paste(crop, (col * 350 + (350 - crop.width) // 2, row * 350 + (350 - crop.height) // 2))
            source_bounds.append([left + bounds[0], top + bounds[1], left + bounds[2], top + bounds[3]])
    assert int(np.count_nonzero(foreground & ~covered)) == 0
    regrouped.save(ROOT / "regrouped-350.png")
    output = ROOT / "processed-v2"
    subprocess.run([sys.executable, str(ROOT / "process-nearest.py"), "process",
                    "--input", "regrouped-350.png", "--output-dir", "processed-v2",
                    "--target", "player", "--mode", "player_sheet", "--rows", "4", "--cols", "4",
                    "--cell-size", "64", "--fit-scale", "0.875", "--align", "feet", "--shared-scale",
                    "--component-mode", "all", "--trim-border", "0", "--edge-clean-depth", "0",
                    "--strict-qc", "--prompt-file", "prompt-used.txt"], check=True, cwd=ROOT)
    frames = []
    despill_counts = []
    source_order_sheet = Image.new("RGBA", (256, 256))
    for row in ENGINE_ROWS:
        for col in range(4):
            frame_path = output / f"player_sheet-{row * 4 + col + 1}.png"
            with Image.open(frame_path) as image:
                original = np.asarray(image.convert("RGBA")).astype(np.int16)
            transparent = np.pad(original[:, :, 3] == 0, 1, constant_values=True)
            edge = np.zeros((64, 64), dtype=bool)
            for dy in range(3):
                for dx in range(3):
                    edge |= transparent[dy:dy + 64, dx:dx + 64]
            spill = edge & (original[:, :, 3] > 0) & (original[:, :, 0] > original[:, :, 1] + 35) & (original[:, :, 2] > original[:, :, 1] + 35)
            corrected = original.copy()
            corrected[spill, 0] = original[spill, 1]
            corrected[spill, 2] = original[spill, 1]
            assert np.array_equal(original[:, :, 3], corrected[:, :, 3])
            assert np.array_equal(original[~edge], corrected[~edge])
            pink_ear = (original[:, :, 0] > original[:, :, 1] + 25) & (original[:, :, 1] > 80) & (np.abs(original[:, :, 2] - original[:, :, 1]) < 35)
            assert np.array_equal(original[pink_ear], corrected[pink_ear])
            frame = Image.fromarray(corrected.astype(np.uint8))
            frame.save(frame_path)
            source_order_sheet.paste(frame, (col * 64, row * 64))
            frames.append(frame)
            despill_counts.append(int(np.count_nonzero(spill)))
    source_order_sheet.save(output / "sheet-transparent.png")
    sheet = Image.new("RGBA", (256, 256))
    output_bounds = []
    for index, frame in enumerate(frames):
        bounds = frame.getbbox()
        assert bounds is not None
        assert 0 < bounds[0] < bounds[2] < 64 and 0 < bounds[1] < bounds[3] < 64
        assert bounds[3] == 60
        sheet.paste(frame, (index % 4 * 64, index // 4 * 64))
        output_bounds.append(bounds)
    sheet.save(ROOT / "ttuulla.png")
    preview = Image.new("RGBA", sheet.size, (34, 39, 53, 255))
    preview.alpha_composite(sheet)
    preview.resize((1024, 1024), Image.Resampling.NEAREST).save(ROOT / "preview.png")
    animations = [(ROOT / f"{direction}.gif", frames[row * 4:row * 4 + 4]) for row, direction in enumerate(DIRECTIONS)]
    animations.append((output / "animation.gif", frames))
    for destination, animation_frames in animations:
        gif_frames = []
        for frame in animation_frames:
            enlarged = frame.resize((256, 256), Image.Resampling.NEAREST)
            palette = enlarged.convert("RGB").quantize(colors=255)
            palette.paste(255, mask=enlarged.getchannel("A").point(lambda alpha: 255 if alpha == 0 else 0))
            gif_frames.append(palette)
        gif_frames[0].save(destination, save_all=True, append_images=gif_frames[1:],
                           duration=180, loop=0, transparency=255, disposal=2, optimize=False)
    pipeline = json.loads((output / "pipeline-meta.json").read_text(encoding="utf-8"))
    scales = sorted({frame["source_to_output_scale"] for frame in pipeline["frames"]})
    assert len(scales) == 1
    report = {"source_size": raw.size, "source_row_bands": ROWS, "source_column_bands": COLUMNS,
              "source_bounds": source_bounds, "regrouped_cell_size": 350,
              "uncovered_foreground_pixels": 0, "resized_during_regroup": False,
              "engine_rows": DIRECTIONS, "frame_count": len(frames), "cell": [64, 64], "pivot": [32, 60],
              "output_bounds": output_bounds, "interpolation": "NEAREST", "component_filter": "all",
              "uniform_raw_pixel_scale": scales[0], "qc_summary": pipeline["qc_summary"],
              "despill": {"pixels_per_engine_frame": despill_counts, "total_pixels": sum(despill_counts),
                          "rule": "opaque pixels adjacent to transparency in 8-neighborhood, R>G+35 and B>G+35: R=B=G",
                          "alpha_unchanged": True, "interior_unchanged": True, "pink_ear_unchanged": True},
              "trim_border": 0, "edge_clean_depth": 0, "frame_milliseconds": 180,
              "source": "builtin imagegen raw-sheet.png; prompt-used.txt",
              "failed_draft": "processed/ is preserved; do not use"}
    (ROOT / "qc.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
