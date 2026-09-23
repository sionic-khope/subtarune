# BUILD303 additional pink fashion props

User request: a few more pink outfits and a slight increase in fashion-pattern difficulty. Existing outfit pixels, spoken comments, damage15, speed126px/s and warning0.55s remain unchanged.

One built-in `image_gen` call produced a four-outfit2×2pack, using `assets/source/choimis-sky294/pattern-art/fashion/preview-4x.png` as the style and pixel-density reference. Backend model, seed, quality and cost were not exposed by the tool and are unknown. Exact prompt: `prompt-used.txt`. Raw output is preserved in `raw-sheet.png`; it returned real alpha despite the requested solid-magenta background. No garment art was drawn procedurally.

## Runtime contract

`assets/props/choimis-fashion303.png` is192×384RGBA, two columns and four rows of96×96cells, center pivot(48,48). Cells0–3 are byte-identical RGBA copies of the previous runtime sheet. New cells4–6 are polka-dot raincoat, ruffled bow dress and lightning varsity jacket/shorts. Cell7 is a paisley poncho/trouser spare, not emitted in this attack. Source-body alpha bounds for new cells are `[15,10,80,85]`, `[9,12,86,84]`, `[12,15,83,81]`, `[14,8,81,88]`.

The runtime attacks once with cells0→6 at0.35/1.3/2.25/3.2/4.15/5.1/6.05seconds. Each warning precedes motion by0.55seconds; directions alternate and the existing upper/lower lanes repeat. Existing four comments repeat for the three new outfits on warning release. Every complete bubble overlaps the fully visible associated garment by at least0.3seconds. Duration9.1seconds allows the last garment to expire at about8.727seconds before board-close. The boss idle presentation uses only its existing four frames. There is no new turn-persistent wardrobe state.

## Processing and visual checks

Initial raw-alpha processing detected low-alpha noise at two source-cell edges. Alpha was then thresholded at128, preserving RGB, and the existing sprite processor used one common NEAREST scale0.14878228782287822 for all four outfits. StrictQC passed: four nonempty unique silhouettes, zero source/output edge contacts, zero paste clamps. Full results are in `processed/pipeline-meta.json`. No fabric color key was applied. `preview-4x.png` was opened and checked for all eight complete garment silhouettes, empty neck/sleeve openings, matching pink palette and outline density. New art remains a generated candidate rather than a claim of user approval.

Reproduction commands from the repository root, with the installed generate2dsprite skill location supplied as `SPRITE_PROCESSOR`:

```sh
ffmpeg -i assets/source/choimis-fashion303/raw-sheet.png -vf "lut=a='if(gte(val,128),255,0)'" -frames:v 1 assets/source/choimis-fashion303/raw-sheet-clean.png
uv run --with pillow --with numpy -- python "$SPRITE_PROCESSOR" process --input assets/source/choimis-fashion303/raw-sheet-clean.png --target asset --mode single --rows 2 --cols 2 --cell-size 96 --output-dir assets/source/choimis-fashion303/processed --fit-scale 0.84 --align center --shared-scale --component-mode largest --component-padding 0 --threshold 0 --edge-threshold 0 --edge-clean-depth 0 --trim-border 0 --strict-qc
ffmpeg -i assets/props/choimis-fashion.png -i assets/source/choimis-fashion303/processed/sheet-transparent.png -filter_complex vstack=inputs=2 -frames:v 1 assets/props/choimis-fashion303.png
ffmpeg -i assets/props/choimis-fashion303.png -vf scale=768:1536:flags=neighbor -frames:v 1 assets/source/choimis-fashion303/preview-4x.png
```

Old sheet and extended sheet top-half decodedRGBA SHA256 both equal `de9dcfb18ee922d3d1764587c4f2dbd93d0ac6a224affd8cf3c40fcf85ea0364`. Final atlas PNG SHA256 is `86753fe2d2ea8a43ae3eef5d43a6ddf38701c9a323774a53ae16665ac560437e`.

Focused `choimis-patterns-b` tests15/15passed, including all seven frame crops, alpha-interior collision, readable per-look timing, a110px/s reachable avoidance path, pressure at every corner, and natural cleanup. Parent owns enemy registry and browser QA; source/asset readiness is not a browser gameplay approval.
