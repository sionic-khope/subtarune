# 만카츠키126 projectile exports

| Asset | Runtime PNG | Pivot |
| --- | --- | --- |
| Shuriken with pig face | `assets/projectiles/mankatsuki-shuriken.png`,32×32 |16,16 |
| White pig back | `assets/projectiles/mankatsuki-pig.png`,48×48 |24,24 |
| Frying pan | `assets/projectiles/mankatsuki-pan.png`,64×32 |32,16 |

Each asset has one static frame. Rotation/motion belongs to runtime. All raw art comes from the parent's built-in image generation; the source and original prompts live in the respective source directories.

Processor: `generate2dsprite.py process`, target asset, mode single, rows1, cols1, align center, shared scale, fit0.9, trim0, edge-clean0, largest component and strict QC. Cell sizes are32/48/64 for shuriken/pig/pan. Full crop/scale/anchor details are in each `processed/pipeline-meta.json`.

`assets/source/captain125/junhee_point/export.py` exports original cleaned source pixels through NEAREST, without quantizing the palette. Run `uv run assets/source/mankatsuki126/pan/finalize.py` after export. It crops only the pan's empty64×64 canvas padding to64×32, keys exterior-connected magenta fringe (R>G+12 and B>G+12), sets alpha0 pixels to RGBA(0,0,0,0), and writes `sprite.png`, the runtime PNG, and `runtime-contract.json` for all three assets. The pan uses its source alpha; black pixels are never keyed out. No artwork is generated, repainted, eroded or recolored in these scripts.

`runtime-contract.json` is the final size/pivot contract. `export-manifest.json` describes the preceding square-canvas intermediate, so the pan's intermediate64×64 size is not its final runtime size. `dark-background-review.png` shows each final sprite enlarged8× on dark navy for transparency/silhouette inspection. Processor preview PNGs/GIFs use LANCZOS and must not replace the separately exported NEAREST runtime PNGs.
