# 마스터이섭 (Yisub) · regret315

Ready sprite delivery; game integration and independent review belong to the parent task.

## Contract

`assets/enemies/yisub-battle.png` is RGBA256×256 with four128×128 cells, row-major order:0neutral,1windup,2compact downward strike,3hurt recoil. `assets/enemies/yisub-front.png` is the exact cell0 PNG. All cells share foot pivot(64,120), face lower-left3/4, and one anatomical sampling scale. Suggested timing: neutral hold400ms, windup240ms, strike180ms; hurt separately300ms. Attacking plays1→2→0, hurt plays3→0; the four-cell atlas is not a runtime loop. The source GIF cycles all cells only for inspection.

Identity: broad cheeks, enormous U-shaped nose, black round glasses and exactly two visible face eyes, no mouth, dark slate-blue skin. Master Yi multi-lens helmet equipment is above the eyeglasses, charcoal/navy armor, muted olive/brass accents and narrow sword. Existing memory309 seobruto/udyrsub define density, silhouette proportions and target98pxneutralheight; `assets/sprites/gajaeman_shadow.png` defines dark-palette face identity.

## Generation and lineage

Built-in `image_gen`, backend model/quality/usage/cost unknown; no external API. Initial call used the three reference paths above, after direct image inspection. Actual initial prompt: `prompt-used.txt`; original output retained as `raw-v1-rejected-wide-strike.png` because a horizontal sword exceeded the128pxcell at the required body scale/pivot. Revision prompt: `prompt-v2-compact-sword.txt`, editing only initial raw. Accepted output is `raw-sheet.png`. Generated source filenames: initial `exec-87fa3827-ab99-436e-bcc3-b8eda3daec69.png`, revision `exec-047ce7af-4ddb-4643-8a58-5d60c9dc2399.png`; built-in originals remain preserved in generated_images. Two image calls total.

The tool returned genuine RGBA transparency despite the magenta prompt. `raw-binary-alpha.png` thresholds alpha at128 to remove almost-transparent background specks; opaque RGB colors are not changed. Existing repository `tools/sprites/sheet_processor.py` performs strict structural QC. `export.py` performs only binary-alpha cleanup,2×2 extraction, one common98/452 scale with NEAREST, feet alignment, PNG/GIF assembly and final assertions. No character drawing, recoloring, per-frame resizing or pose fabrication.

Reproduce both owned character bundles from repository root: `uv run assets/source/regret315/yisub/export.py`. Processing intermediates are not runtime assets.

## Final QC

All four final frames visually inspected at3× in `preview.png`, with the approved enemies at matching scale in `scale-comparison.png`. Face markers remain readable, helmet ornaments separate from face eyes. Windup raises sword/hands, strike bends and extends arms downward, hurt leans back with chest clutch. The attack crouches naturally; shared scale is0.2168141593. Final opaque heights98/113/89/96px: frame1 includes raised sword above head, not an enlarged body. Feet all end at exclusivey120. No clipped body/weapon, empty frames, edge contact, paste clamp or magenta residue; alpha only0/255. `runtime-qc.json` holds exact final bboxes/hash. Existing processor strict QC passed after binary-alpha cleanup in `processed-final/pipeline-meta.json`. Earlier `processed/` is rejected raw-alpha diagnostics.

Author visual QC passed. Runtime placement and independent reviewer acceptance are not claimed here.
