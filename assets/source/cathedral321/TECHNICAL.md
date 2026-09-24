# BUILD321 cathedral prop export

The raw artwork was produced by Codex built-in imagegen. The tool did not expose the backend model ID, quality setting, seed, usage or charged cost; those values are unknown. `generated-raw.png` files are untouched copies of the actual generation output. The generation prompts and generation-side reference records belong to the root task's companion documentation.

`references/cathedral.png` and `references/corridor.png` are copies of the two supplied visual references. Their role is cathedral architecture, purple/lavender palette and pixel density; they are not identity references for new characters. No creative drawing, palette quantization, recoloring or silhouette redesign occurs in this export.

| Runtime PNG | Canvas | Frame/animation | Alignment |
| --- | --- | --- | --- |
| `assets/props/castle321_window.png` | 72×176 RGBA | one static frame | centered |
| `assets/props/castle321_column.png` | 80×160 RGBA | one static frame | centered |
| `assets/props/castle321_sconce.png` | 40×72 RGBA | one static frame | centered |

These are complete prop canvases, not animation atlases. Use their full dimensions without stretching. Map ownership determines placement, layers and collision; the alpha silhouette is not a collision rectangle. This technical export does not certify runtime placement or game integration.

## Reproduction

From the repository root, run:

```sh
uv run assets/source/cathedral321/export.py /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py
```

Supply the installed skill processor's actual path on another machine. The script declares its numpy/Pillow dependencies. It invokes `generate2dsprite.py process` for each 1×1 source with strict QC, zero trim, zero edge erasure, all components and no global magenta key. Only magenta within RGB Euclidean distance 90 of `#FF00FF` and connected to the image background is removed. The processor's square preview is retained for inspection but is not the runtime PNG.

Runtime export finds the cleaned subject bbox using alpha≥2, excluding distant almost invisible alpha=1 specks from the crop envelope. It retains every alpha value inside that crop, computes one fit scale inside a two-pixel margin, rounds the resulting dimensions to whole pixels, and samples with NEAREST. Actual alpha values are preserved by paste without a mask. The result is centered in the exact rectangular canvas. `export-meta.json` records the full crop, scale, integer dimensions, offset, final alpha bbox and the exact processor command for each asset.

The column source contains almost invisible alpha=1 fringe extending to x=0; its visible column is complete. The processor permits this reviewed source-edge fringe only. Output-edge contact, empty outputs, incorrect dimensions, PNG decoding errors and residual near-magenta pixels remain failing conditions. Connected magenta fringe is removed from true-alpha sources; crop selection excludes distant alpha=1 noise and preserves other samples without alpha thresholding.

Each asset folder retains the untouched raw, processor outputs and QC, `final.png` identical to the runtime file, `preview-4x.png` enlarged by NEAREST, and `export-meta.json`. Only the three runtime PNGs should be registered in the game.

## Export verification

All three final runtime PNGs decoded successfully, contain visible pixels, have the requested dimensions, preserve complete silhouettes with no output-edge contact, and contain zero visible pixels within RGB distance90 of magenta. NEAREST4× final previews were opened and visually inspected: the window arch and lower sill, column cap and base, and complete sconce stem all remain present. This is the producer's visual inspection, not independent approval.

| Asset | Final alpha bbox (right/bottom exclusive) | Nonempty / output clipping / magenta |
| --- | --- | --- |
| window | (3,2,68,174) | pass / none / 0 |
| column | (10,2,69,158) | pass / none / 0 |
| sconce | (3,2,36,70) | pass / none / 0 |

The skill processor passed strict QC for all three with the documented column source-edge exception. The exporter passed the programming rule audit and repository-configured Ruff check. The automatic LSP hook could not inspect this external worktree because its path is outside the tool request cwd; this is a tooling scope limitation, not a claimed LSP pass. `git diff --check` passed.
