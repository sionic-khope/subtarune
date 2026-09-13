# BUILD145 puzzle props

Generated with built-in image generation, then processed using generate2dsprite's process command. Exact generation prompts are in each prompt-used.txt; original generated images and processing parameters are recorded in pipeline-meta.json and raw-sheet.png.

- crate: 48×48 transparent cell, visible 36×44, bounding box (6,3)–(42,47). Runtime: assets/props/factory_crate145.png. Blue cargo crate contrasts with beige movable zone; game draws native size, bottom aligned to collision footprint.
- angel-door: 96×96 transparent cell, visible 49×82, bounding box (23,8)–(72,90). Runtime: assets/props/youngcle_angel_door145.png. Only TV-room left door uses this variant. Original storage/right door remains unchanged. Prompt's estimated original silhouette was superseded by measured 96×96 source cell.

Both outputs passed strict processing QC: one valid component, no empty frame, clipping, or edge touch. Magenta keying, nearest-neighbor fit, bottom alignment; edge-clean-depth 0. Process options: target asset, mode single, rows 1, cols 1, component-mode largest, strict-qc; crate cell-size 48/fit-scale .92, door cell-size 96/fit-scale .86. Use the bundled generate2dsprite.py process command with the recorded input and these options to reproduce.

