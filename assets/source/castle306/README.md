# Castle approach306 artwork

Built-in image_gen created the tile, gate, initial exterior backdrop and corrected interior backdrop sources. Actual model and cost are unknown. Exact prompts are preserved in prompt-tiles.txt, prompt-gate.txt, prompt-distant.txt and prompt-interior-v2.txt. Approved assets/props/gajaeman_castle.png supplies architectural style; BUILD305 mixed-floor-preview-6x.png supplies floor material continuity.

The user's latest correction requires a castle interior. The active backdrop is raw-interior-v2.png: enclosed blackstone wall, towering columns, ribbed stone vaults, purple moss and small violet lights. It has no sky, exterior towers, chasm or outdoor horizon. The original exterior source raw-distant.png, prompt-distant.txt, runtime preview backdrop-exterior-v1.png and export-exterior-v1.json are retained as superseded provenance and are not exported to the game.

## Runtime contract

| File | Geometry |
| --- | --- |
| assets/tiles/castle306_floor.png | 32×32 RGB, clean worn dark stone |
| assets/tiles/castle306_moss.png | 32×32 RGB, sparse purple moss |
| assets/tiles/castle306_cracked.png | 32×32 RGB, cracked stone |
| assets/tiles/castle306_moss_dense.png | 32×32 RGB, denser purple moss |
| assets/props/castle306_gate.png | 256×320 RGBA, bottom-center pivot128,320; visible bounds2,3,254,318 |
| assets/backdrops/castle306_distant.png | 480×360 RGB, enclosed castle interior; columns centered near x65 and x415 |

The tile source is a1254×1254 atlas. Exact627×627 quadrants in row-major order become the four32px variants. Tile previews show repeated and mixed placement at native1× and NEAREST4×. Edge RGB differences are recorded in export.json; this is a visually checked repeatable texture set, not a mathematically exact seamless-edge guarantee.

The gate source is1122×1402 RGBA. Its entire canvas is scaled with NEAREST to252×315 and copied at2,3 into a256×320 transparent canvas. No source cropping, chroma-key removal, palette change, alpha threshold or manual painting occurs. Original generated alpha is preserved. The general sprite processor produces square cells, so the existing rectangular prop export pattern from ship-castle is used for this tall gate.

The active interior backdrop source is1448×1086 RGB, exactly4:3, and its whole composition is reduced with NEAREST to480×360. The stable runtime filename castle306_distant.png is retained for existing loader compatibility; its content is now wholly indoors. Floor variants and gate pixels are unchanged by this correction.

## Reproduction and evidence

Run from the repository root:

```sh
uv run assets/source/castle306/export.py
```

export.json records source hashes, generation IDs, runtime hashes, geometry, gate alpha range and tile edge measurements. Source images remain unchanged.

All six runtime files were actually viewed. Gate silhouette, closed door, arch, purple windows and threshold remain readable at256×320; the corrected interior wall, columns and vaults remain distinct at480×360; mixed32px tiles retain material continuity. All four tiles are opaque and hash-distinct; gate alpha spans0–255 and has nonzero safety margins on all sides. The export executed successfully. Standalone basedpyright with Pillow/NumPy stubs reported0 errors/0 warnings; programming no-excuse audit passed. This exporter owns only mechanical art export and introduces no runtime behavior or new framework. No placeholder tests were added. Map placement, camera behavior and collision remain the integration lane's verification responsibility.
