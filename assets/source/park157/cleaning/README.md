# Park Guardian cleaning projectiles

Three independent built-in image_gen single-object images, 2026-09-14. `raw/` preserves the original PNGs; `prompts.md` stores the exact prompts. The studio pixel-style-motion-sheet.png was a style-only reference. No procedural sprite artwork.

Run `uv run assets/source/park157/cleaning/process.py` from the game repository. It uses the installed generate2dsprite processor for magenta extraction and strict QC, then uniformly downsamples the clean generated silhouette with NEAREST into custom delivery cells. Binary alpha and residual chroma fringe removal preserve the black/blue/red/yellow palette. The long broom was generated alone on a portrait canvas.

| PNG in assets/projectiles | Cell | Visible bounds (exclusive right/bottom) | Bottom pivot |
| --- | --- | --- | --- |
| park-cleaning-bag.png | 64×64 | (9,6)–(55,60) | (32,60) |
| park-cleaning-dustpan.png | 96×64 | (8,12)–(88,60) | (48,60) |
| park-cleaning-broom.png | 64×128 | (17,8)–(47,124) | (32,124) |

Each PNG is one static frame. Translation/rotation and encounter timing belong to runtime; there are no baked trails or effects. Dustpan opening and broom bristles face down. Collision should use the visible shape or a forgiving inset, not transparent cell dimensions. Bag max envelope54×54; dustpan84×48; broom44×116, with actual narrower geometry retained instead of stretching.

`preview.png` shows native size and `preview-3x.png` nearest enlargement on dark gray. The three originals and final preview were visually inspected: distinct silhouettes, no clipped parts, readable knot/scoop/bristles. Per-asset `runtime-contract.json` records exact output bounds, pivot, alpha, scaling and processor command. Processor QC passed; runtime integration/playtest is owned by the game implementation lane.
