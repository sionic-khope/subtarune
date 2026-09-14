# Park Guardian attack looseness tiers

Three independent built-in image_gen edits, 2026-09-14. Original PNGs are `loose-raw.png`, `slipping-raw.png`, `adjust-raw.png`; exact prompts are in `prompts.md`. Each edit used the accepted base attack as a six-pose anchor and the corresponding existing tier idle as the costume-state reference. No old attack or idle assets were overwritten.

Runtime files: `assets/enemies/park-guardian-attack-{loose,slipping,adjust}.png`. Each is192×288,2columns×3rows, six96×96frames in row-major order, pivot(48,90),8fps/125ms. Phases: ready, draw back, windup, thrust, follow-through, return. Loose preserves folded ears/slack waist; slipping preserves the lowered face-covering hood; adjust holds the hood with one glove during the thrust and readjusts on return. The fully opaque mascot remains on throughout.

## Reproduction and scale

Run `uv run assets/source/park157/attack-tiers/anchor.py` then `uv run assets/source/park157/attack-tiers/process.py` from the game repository. Anchor generation only pads/copies the accepted attack frames:96px into128pxcells at offset16, then4×NEAREST to1024×1536. The raw outputs retained that1024×1536 geometry. Export uses one0.25raw-pixel magnification for every frame of every tier, calibrated from this anchor. It never fits individual frames or stretches anatomy. Final feet translate to90, and the bottom foot envelope centers at48, matching the earlier asset export contract.

The installed generate2dsprite processor performs color-key cleanup and a strict preserve-scale intermediate QC pass with0.84safety padding. That intermediate thumbnail is not the runtime export. Runtime pixels come from the cleaned raw original at the shared0.25scale. Pink skull/bell details are preserved by the same narrow dark-magenta fringe cleanup used in BUILD155; final alpha is binary and resizing is NEAREST.

## Observed QC

All3standard strict-QC passes exited0. Separately, all18actual final96pxframes passed pre-paste extent checks, post-paste opaque bbox checks, bottom90 and binary-alpha checks: zero edge contacts, empty frames or paste clamps. Each tier's `runtime-contract.json` records actual final bounds and the separate standard processor command. `standard/pipeline-meta.json` metrics describe only the intermediate output.

All18raw poses and final frames were viewed. `preview-2x.png` compares base attack then loose/slipping/adjust; `idle-attack-comparison-2x.png` has one row per tier, accepted idle first then all6new attack frames. Head, torso and leg scale remain comparable; natural hood droop reduces height. Loose final heights73–77px versus78–79idle, slipping67–72px versus70–74idle, adjust73–76px. No pose was enlarged to erase those intended differences. Attack arm extension and hood-holding are visible, with complete pink details and fully contained ears/gloves/tails.

Both processing scripts executed successfully; no-excuse Python audit found no violations. Production images passed asset-level visual QC; actual runtime tier selection and playback are verified by the game integration lane.
