# 따듯한비데 · reuse existing v2

Source: `assets/sprites/warm-bidet-v2/warm-bidet-walk.png` and its existing handoff `docs/handoffs/warm-bidet-assets.md`. No new generation, recoloring, quantization, or replacement of the original. The source remains unchanged.

Runtime: `assets/sprites/warm_bidet.png`,512×640,128×160 rectangular cells,rows down/up/left/right,4 walking phases per row,common stillPivot64,156. Use visualScale1.0 with existing engine pixel division2 and CHAR_SCALE1.43: original body≈280×0.45/2×1.43≈90.09screenpx.

`repack.py` takes each original240×312cell, samples once with NEAREST to108×140, reorders rows0,3,1,2, and translates the scaled documented direction pivot to64,156. Original pivots in original row order: down128,306; left140,300; right106,300; up106,308. All four frames in a direction share the same transform, preserving original foot motion. It does not fit each bbox independently.

`warm-bidet-contract.json` records every bbox and source/destination transform. All16frames are interior and their opaque pixel count is unchanged by the placement step, confirming no clipped axe or feet. The rectangular canvas accommodates the wide axe. Original RGB values are preserved by NEAREST sampling. `warm-bidet-preview.png` was viewed and confirms full axe and tall armor silhouette in4directions.

Run from root: `uv run --with pillow --with numpy python assets/source/lounge148/warm-bidet/repack.py`.

Registry, map placement and gameplay remain owned by parent integration. This pass created no combat animation or abilities.
