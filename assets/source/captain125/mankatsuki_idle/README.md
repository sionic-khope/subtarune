# 만카츠키 battle asset processing

These are prepared left-facing enemy animations, not an active battle implementation.

| Runtime asset | Frames | Cell | Timing |
| --- | --- | --- | --- |
| `assets/enemies/mankatsuki-idle.png` | 4, horizontal | 128×128 | 180 ms, loop |
| `assets/enemies/mankatsuki-attack.png` | 6, horizontal | 128×128 | 110 ms, one shot then idle |

The shared origin is `(64, 119)`. `scale-profile.json` locks the raw-to-output scale, feet alignment, and processing settings for both actions. Source idle is a generated RGBA 1254×1254 2×2 sheet. Source attack is a generated RGB 1024×1536 2×3 magenta sheet.

`prepare.py` uniformly resizes the whole attack sheet to 1254×1881 with NEAREST, preserving relative frame scale. It moves complete cells onto a 704px grid without changing individual poses. Attack's column split is x608 in normalized coordinates, preserving the extended palm that crossed the nominal x627 split. Idle uses x627. No anatomy, palette, outlines, effects, or animation poses are drawn in code.

Run preparation from repository root:

```sh
uv run assets/source/captain125/mankatsuki_idle/prepare.py
```

Process idle with `generate2dsprite.py process`: target creature, mode idle, 2 rows, 2 columns, cell128, align feet, shared scale, preserve strategy, fit0.85, trim0, edge-clean0, largest component, duration180, strict QC, and write this directory's scale profile with max profile drift0.08. Process attack with 3 rows, 2 columns, duration110, strict QC and the same profile. Full parameters and measured source boxes are preserved in each `processed/pipeline-meta.json`.

Export the original cleaned pixels through NEAREST sampling:

```sh
uv run assets/source/captain125/junhee_point/export.py assets/source/captain125/mankatsuki_idle assets/enemies/mankatsuki-idle.png
uv run assets/source/captain125/junhee_point/export.py assets/source/captain125/mankatsuki_attack assets/enemies/mankatsuki-attack.png
```

Final strict QC: both actions have zero empty frames, source/output edge contacts, and paste clamps. Idle body-scale CV0.02741; attack CV0.01099; cross-action profile drift0.00365. Final exported PNG frame bounds were independently checked for empty frames and cell-edge contacts. The exported grid/strip PNGs were visually inspected for whole-body containment and matching anatomical scale; GIFs preserve the same frame sequence for playback review.

The processor's own resized previews use LANCZOS and are working intermediates. Runtime, numbered frames, `sheet-transparent.png`, `strip-transparent.png`, and animation GIFs here are exported separately from original cleaned pixels with NEAREST. Do not stage processor preview PNGs or GIFs as runtime assets.
