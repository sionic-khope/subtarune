# Memory308 environment export

These four built-in image_gen results supply the new memory door, replace the runtime castle307 background/materials, and add an isolated charcoal wall variant. Model and charged cost are unknown. Exact submitted prompts are preserved in prompt-door.txt, prompt-backdrop.txt, prompt-tiles.txt and prompt-wall.txt. The first three belong to the main generation owner; the wall edit was generated in this asset lane.

## Runtime contract

| Asset | Geometry |
| --- | --- |
| assets/props/castle-memory-door.png | 96×128 RGBA; bottom-center pivot (48,128); closed door only |
| assets/backdrops/castle307_right.png | 480×360 RGB; enclosed blackstone interior wall |
| assets/tiles/castle307_floor.png | 32×32 RGB; dark stone |
| assets/tiles/castle307_moss.png | 32×32 RGB; purple-moss stone |
| assets/tiles/castle307_lava.png | 32×32 RGB; narrow purple lava cracks |
| assets/tiles/castle307_lava_dark.png | 32×32 RGB; broad darker purple lava pools |
| assets/tiles/castle308_wall.png | 32×32 RGB; charcoal brick wall with sparse muted purple moss; right1/memory maps only |

The door has a one-pixel bottom safety margin and at least one transparent pixel on every side. Collision and investigation rectangles remain the map owner's responsibility. No animation or opening frame is supplied. All output pixels come from generated sources through crop, nearest-neighbor resize and alpha-preserving placement; no painting, sharpening, quantization, thresholding or color correction is performed.

## Sources and reproduction

The original generation directory is /Users/khope@sionic.ai/.codex/generated_images/01a09daa-6644-71a0-a0b4-284c735f3b96. Sources were copied byte-for-byte, not moved.

| Preserved source | Generation ID | Size |
| --- | --- | --- |
| raw-door.png | exec-6d47190c-07b2-41c1-87b8-d0f4560e100f | 1086×1448 RGBA |
| raw-backdrop.png | exec-807301ea-c630-43fb-8a15-5be62f3a8949 | 1448×1086 RGB |
| raw-tiles.png | exec-397564cd-c4ab-40df-b828-cf59dade6870 | 1254×1254 RGB |
| raw-wall.png | exec-0e814fc0-78a2-4556-beb6-c124c7fabd11 | 1254×1254 RGB |

The wall raw source is copied from /Users/khope@sionic.ai/.codex/generated_images/01a0cd55-5ce6-7712-bca7-a7f331646c1f. Its actual attached edit target was assets/tiles/gajaeman_castle_wall.png, viewed before generation. The new wall retains staggered brick courses and changes the dominant purple material to charcoal; the original wall file and global tile remain unchanged. Full-source NEAREST reduction produces the isolated 32×32 variant; the map owner registers its separate key only for the right corridor and memory maps.

Run from the repository root:

```sh
uv run assets/source/memory308/environment/export.py
```

The door's nonzero-alpha bounding rectangle is cropped, uniformly fitted within 94×126 with NEAREST, then fully transparent sampled margins are cropped before bottom-center placement. Surviving source alpha values are unchanged; paste does not apply a second alpha mask. The backdrop uses the complete source at the matching 4:3 aspect ratio. The tile atlas is divided into four exact 627×627 quadrants, row-major floor/moss/lava/lava_dark, and each is reduced to 32×32. export.json records exact crop, placement, geometry and source/runtime SHA-256 hashes.

The historical assets/source/castle307 directory and its exporter are intentionally unchanged. Memory308 supersedes its runtime backdrop and four tiles, not its preserved sources or central sealed gate. Running the old castle307 exporter restores its historical background/materials; run this exporter afterward to restore the current memory308 version.

## Verification and previews

All four sources and seven runtime outputs passed Pillow PNG CRC verification followed by complete pixel decoding. The door alpha range is 0–255. Two consecutive exports produced identical export.json SHA-256 a82e3a2ca21d0a9ff1d688538888e37ad2c839351ed26fdd6a0110619bdda4c3, including all seven identical runtime hashes. Source hashes match the original generated files.

door-preview-2x.png and door-alpha-light/dark.png show the intact arch, lock and threshold. tiles-repeat-1x/4x.png show each material repeated 3×3; tiles-mixed-1x/4x.png show a mixed stone strip beside lava. wall-repeat-1x/4x.png show the charcoal wall repeated 3×3. These previews and the final 480×360 background were visually inspected. Repeats remain generated textures, not a guarantee of mathematically seamless edges.

The programming no-excuse audit passed, and standalone basedpyright with Pillow stubs reported zero errors and zero warnings. The automatic LSP hook cannot inspect this worktree because its request cwd points elsewhere; standalone type checking is the explicit substitute. The PEP 723 comments and concise public export-contract docstrings are retained for reproducible execution and handoff.

This asset-only handoff does not claim runtime positioning, map movement, interaction or gameplay QA; those checks belong to the map/integration owner.
