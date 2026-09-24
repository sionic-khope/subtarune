# 신드라섭 (Syndrasub) · regret315

Ready sprite delivery; game integration and independent review belong to the parent task.

## Contract

`assets/enemies/syndrasub-battle.png` is RGBA256×256 with four128×128 cells, row-major order:0neutral,1windup,2handcasting,3hurt recoil. `assets/enemies/syndrasub-front.png` is the exact cell0 PNG. Shared foot pivot(64,120), lower-left3/4 view and one anatomical sampling scale. Suggested timing: neutral hold400ms, windup240ms, cast180ms; hurt separately300ms. Attack plays1→2→0, hurt plays3→0. The source GIF cycles all four poses only for inspection; it is not the runtime loop contract. Orbs/large spell effects are deliberately absent and remain separate runtime effects.

Identity: broad cheeks, enormous U-shaped nose, black round glasses with exactly two visible face eyes, no mouth, dark slate-blue skin. Syndra horned crown, silver-gray hair, charcoal/navy caster robes and muted violet jewelry/trim. Existing memory309 seobruto/udyrsub define density, silhouette proportions and target98pxneutralheight; `assets/sprites/gajaeman_shadow.png` defines dark-palette face identity.

## Generation and processing

One built-in `image_gen` call. Backend model/quality/usage/cost unknown; no external API. Actual prompt is `prompt-used.txt`. The three reference PNGs above were directly inspected and passed as reference images. Accepted raw is `raw-sheet.png`; original built-in filename `exec-44e26f1f-2679-42f5-9cbe-bf946585e781.png` remains preserved in generated_images.

The tool returned genuine RGBA transparency despite magenta prompt. `raw-binary-alpha.png` thresholds alpha at128 to remove almost-transparent background specks; opaque RGB colors are unchanged. Existing repository `tools/sprites/sheet_processor.py` performs strict structural QC. `../yisub/export.py` performs only alpha cleanup,2×2 extraction, common98/504 scale with NEAREST, feet alignment, PNG/GIF assembly and final assertions. No character drawing, recoloring, per-frame resizing or pose fabrication.

Reproduce from repository root: `uv run assets/source/regret315/yisub/export.py`. Processing intermediates are not runtime assets.

## Final QC

All four final frames visually inspected at3× in `preview.png`, with approved enemies at matching scale in `scale-comparison.png`. Face markers remain readable; neutral has arms down, windup cups hands, cast clearly extends hands, hurt leans back with chest clutch. Shared scale0.1944444444; final opaque heights98/98/95/94px. Feet all end at exclusivey120. No clipped body/hair/crown, empty frames, edge contact, paste clamp or magenta residue; alpha only0/255. `runtime-qc.json` holds exact final bboxes/hash. Existing processor strict QC passed after binary-alpha cleanup in `processed-final/pipeline-meta.json`. Earlier `processed/` is rejected raw-alpha diagnostics.

Author visual QC passed. Runtime placement and independent reviewer acceptance are not claimed here.
