# Castle lobby307 environment artwork

Three raw sources were generated with the built-in image_gen tool. Backend model, quality settings and charged cost are unknown; no external paid API was used. Exact submitted prompts are in prompt-gate.txt, prompt-backdrop.txt and prompt-tiles.txt. Existing BUILD306 gate, interior backdrop and mixed-floor preview were actually viewed and attached as the respective style/material references. Existing approved assets and characters are unchanged.

## Runtime contract

| File | Geometry and use |
| --- | --- |
| assets/props/castle307_sealed_gate.png | 320×384 RGBA, bottom-center pivot160,384; exactly two BLACK obsidian spherical seals mounted on the closed door leaves |
| assets/backdrops/castle307_right.png | 480×360 RGB, enclosed blackstone furnace gallery with vaults, chains, purple moss and distant low purple lava light |
| assets/tiles/castle307_floor.png | 32×32 RGB, near-black worn stone floor |
| assets/tiles/castle307_moss.png | 32×32 RGB, matching stone with purple moss |
| assets/tiles/castle307_lava.png | 32×32 RGB, bright purple lava and dark crust |
| assets/tiles/castle307_lava_dark.png | 32×32 RGB, darker broad purple pools and crust |

The central gate is intended to render at0.75, giving240×288px and a120,288 bottom-center pivot. Existing castle306_gate renders144×180 for the two side doors, keeping the central door visibly largest. Art rectangles do not define collision or investigation rectangles; the map lane owns those separately. Door seals are black with violet rim reflections, not purple gems. No door-opening frames are claimed.

The background is architecture only, not a flattened navigable map. There is no sky, exterior horizon or outdoor castle silhouette. Independent floor and lava tiles remain responsible for playable geometry. Lava tiles are nonwalkable environmental material; the map owner supplies collision.

## Sources and reproduction

Built-in generation directory: /Users/khope@sionic.ai/.codex/generated_images/01a0cdb7-4181-7c60-b0d1-a2a93d23f40a. Originals were copied, not moved or overwritten.

| Local source | Generation ID | Input reference |
| --- | --- | --- |
| raw-gate.png | exec-93e87265-408a-4fa8-b9e4-f0925ab015fe | assets/props/castle306_gate.png |
| raw-backdrop.png | exec-50e08c43-e172-4b63-8016-cc92a2289385 | assets/backdrops/castle306_distant.png |
| raw-tiles.png | exec-7edc3cbc-c414-40a1-bbc5-fa705fe5c500 | assets/source/castle306/tiles-mixed-4x.png |

Run from repository root:

```sh
uv run assets/source/castle307/export.py
```

The1145×1374 gate source is scaled uniformly with NEAREST to316×379 and placed at2,3 inside320×384. Original alpha is preserved without thresholding, chroma removal or palette edits. The general sprite processor makes square cells; this tall prop follows the established rectangular BUILD306 export pattern instead. The1448×1086 backdrop is reduced to480×360 with NEAREST. The1254×1254 full-bleed atlas is split into exact627×627 quadrants and reduced to32×32. No sprite-background removal is applied to floor materials. The script only performs deterministic crop, scale, alpha-preserving placement, repeat previews and hash/geometry metadata; it does not paint new artwork.

## Asset QC

All six runtime PNGs decode successfully. The gate alpha range is0–255 and bounds2,3,318,382, leaving safety margins on every side. gate-alpha-dark.png and gate-alpha-light.png show the silhouette on contrasting backgrounds, and gate-preview-2x.png shows the two seals clearly. All four tiles are opaque, distinct and full-bleed. tiles-repeat-1x/4x.png show3×3 repeats of each material; tiles-mixed-1x/4x.png place stone between lava material bands. The repeats were visually checked; they are not mathematically exact seamless-edge tiles, and export.json records observed edge differences instead of claiming exact seam equality. The floor remains visibly darker than lava, while the wall remains enclosed and readable at480×360.

Export execution succeeded. Standalone basedpyright with Pillow/NumPy and Pillow stubs reported0 errors,0 warnings; the programming no-excuse audit passed. The automatic LSP hook could not inspect this worktree because its request cwd belongs to another worktree; standalone checking is the explicit substitute, not a claimed LSP pass. The107-line exporter owns mechanical asset export only, uses typed dependency APIs, adds no runtime behavior or framework, and introduces no new public data boundary or tagged variants. Required PEP723 dependency/usage comments and concise export contract docstrings are retained for reproducibility.

Asset status is ready. Actual map placement, camera framing, movement, collisions and interaction are owned by integration/runtime QA and are not claimed by this asset-only handoff.
