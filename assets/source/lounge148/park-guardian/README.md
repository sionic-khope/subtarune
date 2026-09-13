# 파크가디언 · BUILD148 아트

Built-in `image_gen` generated four separate raw sheets on 2026-09-14. No CLI/API fallback or programmatically drawn character art was used. User references are preserved under `references/`; exact submitted prompts are the four `*-prompt.txt` files. The walking raws were subsequently used as identity references for the matching battle-idle calls.

## Runtime files

| File (from repository root) | Sheet / cell | Order | Pivot | Art height |
| --- | --- | --- | --- | --- |
| `assets/sprites/park_guardian_costume.png` | 256×256 / 64×64 | down, up, left, right; 4 walking phases each | 32,60 | 54–56 |
| `assets/sprites/park_guardian.png` | 256×256 / 64×64 | down, up, left, right; 4 walking phases each | 32,60 | 53–56 |
| `assets/enemies/park-guardian-costume-idle.png` | 192×192 / 96×96 | 2×2 row-major, facing left | 48,90 | 79–80 |
| `assets/enemies/park-guardian-idle.png` | 192×192 / 96×96 | 2×2 row-major, facing left | 48,90 | 79–80 |

`runtime-contract.json` records every final frame bbox and pivot. The parent integration owns field display scaling (requested costume approximately 1.2× Hyungsub), registration, maps, and battle mechanics. These images add no HP or attacks.

## Identity and visual checks

The costume keeps the black jester rabbit head, pink forehead skull, white face and padded body, oversized mittens/slipper feet, collar and tail. Broad white body folds and a back seam identify a mascot suit. The exposed wearer keeps a wrinkled human face on a tan dog body, dark back patch, floppy ears and short tail. Every direction is upright on two hind legs, with front paws reaching forward; visible views include cold sweat. Back views have no face.

The four generated raws and all four final runtime sheets were viewed. Costume raw walk rows were actually down/right/left/up despite the requested ordering; export uses observed order `(0,3,2,1)`. Dog raw rows were down/left/right/up; export uses `(0,3,1,2)`. Idle frames all face left and visibly vary through breathing/paw/eye motion.

The costume raw's fourth row started slightly above the nominal equal-cell boundary. `prepare-costume-grid.py` crops at observed empty row separators y=0,310,620,925,1254 and pads to330px square cells without resizing. This preserves complete ear tips. Initial uniform-grid QC failed; corrected-grid QC passes with zero overrides.

## Deterministic processing

`process-nearest.py` is the installed generate2dsprite processor copied for reproducibility, with only its three `Image.Resampling.LANCZOS` uses changed to `NEAREST`. Its existing structure is retained. No installed skill files were modified. Shared scale is applied across each sheet; field and battle have deliberately different output-size contracts. No per-frame scale normalization or color quantization was used for runtime PNGs. GIFs are processor previews only.

Run from repository root:

```sh
uv run --with pillow python assets/source/lounge148/park-guardian/prepare-costume-grid.py
```

For each of costume-walk, dog-walk, costume-idle, dog-idle run:

```sh
uv run --with pillow --with numpy python assets/source/lounge148/park-guardian/process-nearest.py process --input <raw-or-corrected-grid> --target npc --mode <player_sheet-or-idle> --rows <4-or-2> --cols <4-or-2> --output-dir assets/source/lounge148/park-guardian/<action> --prompt-file assets/source/lounge148/park-guardian/<action>-prompt.txt --cell-size <64-or-96> --fit-scale <0.89-or-0.84> --align feet --shared-scale --component-mode largest --component-padding 0 --trim-border 0 --edge-clean-depth 0 --strict-qc --max-body-scale-cv 0.08 --max-anchor-y-std 0.05
uv run --with pillow --with numpy python assets/source/lounge148/park-guardian/export-runtime.py
```

Costume-walk input is `costume-walk-grid.png`; the other inputs are `<action>-raw.png`. Each `pipeline-meta.json` records exact processing flags, source boxes and output metrics. Export reorders rows, removes residual magenta-colored edge pixels using a hue mask, aligns each frame to the specified baseline without resizing, validates binary alpha and containment, writes runtime-contract.json, and creates the NEAREST enlarged preview.

## QC result

All four strict-QC runs exited0. Every sheet has zero empty frames, source-edge contacts, output-edge contacts and paste clamping. Body-scale CV: costume walk0.04135, dog walk0.01140, costume idle0.01112, dog idle0.01437; max permitted0.08. Anchor-Y standard deviation:0.01131,0.02838,0.02672,0.03429 respectively; max permitted0.05. Final export validates full binary transparency, interior bboxes and shared bottom anchors. `preview.png` shows all delivered frames at2×.

Engine placement and loop playback are the parent integration/QA lane's responsibility. Asset authoring did not edit registry/maps/STATE/main and made no commits.
