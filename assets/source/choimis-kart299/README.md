# BUILD299: Dao and Bazzi kart riders

New image-model artwork replaces standing-character imagery in the Choimis pink kart attack. This folder is the asset delivery; runtime registration and live battle verification belong to the integration worker.

## Runtime contract

| Variant | Final PNG | Canvas | Opaque content bbox, exclusive right/bottom | Center pivot |
| --- | --- | --- | --- | --- |
| Dao | `assets/props/choimis-dao-kart.png` | 48×40 | [2,3,45,36], 43×33 | [24,20] |
| Bazzi | `assets/props/choimis-bazzi-kart.png` | 48×40 | [2,3,45,37], 43×34 | [24,20] |

Each file contains one static pose, facing lower-left in three-quarter view. No animation timing, no loop, no baked boost effects. Draw using the whole 48×40 canvas with nearest-neighbor sampling and center anchoring. Preserve the 1.2 canvas aspect ratio; 50px-wide rendering is approximately 41.667px tall. Vehicle collision sizing is an integration decision.

## Generation and references

Provider: built-in `image_gen`, two calls, one per variant, no retries. Backend model, quality setting, usage and monetary cost: **unknown**, not exposed by the tool. No external image API was used.

The `dao/reference.png` and `bazzi/reference.png` files are byte copies of the corresponding `assets/enemies/*-battle.png` images, inspected before generation and attached separately to their own calls. They preserve identity and existing pixel-art language; the seated rider and vehicle are new model-generated art. Exact prompts are `dao/prompt-used.txt` and `bazzi/prompt-used.txt`.

Original tool outputs, also preserved as each variant's `raw.png`:

- Dao: `/Users/khope@sionic.ai/.codex/generated_images/01a0cbd4-6971-7ef1-9c57-e94c148e389f/exec-e535d8a8-051a-41e7-a1b7-c0f8054b5b92.png`
- Bazzi: `/Users/khope@sionic.ai/.codex/generated_images/01a0cbd4-6971-7ef1-9c57-e94c148e389f/exec-65e3b81a-ada0-4d1a-8870-b444b5a0089a.png`

The prompt requested magenta, but the actual tool outputs have genuine alpha. That alpha is used; no background artwork is synthesized. The final binary-alpha threshold matches the runtime's alpha cutoff at128. No palette quantization or hand-drawn vehicle parts were added.

## Reproduce processing

From repository root, run for each `NAME=dao` and `NAME=bazzi`:

```sh
uv run --with pillow --with numpy python /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py process --input "assets/source/choimis-kart299/$NAME/raw.png" --target asset --mode projectile --rows 1 --cols 1 --output-dir "assets/source/choimis-kart299/$NAME/processed" --cell-size 48 --fit-scale 0.90 --align center --component-mode largest --component-padding 0 --trim-border 0 --edge-clean-depth 0 --strict-qc --prompt-file "assets/source/choimis-kart299/$NAME/prompt-used.txt"
bash assets/source/choimis-kart299/export.sh
```

The existing skill processor extracts the connected subject, scales uniformly with NEAREST, and centers it in48×48. `export.sh` mechanically crops four transparent rows from top/bottom to48×40, applies the runtime alpha threshold, verifies PNG CRC/decode/containment, and produces the color/monochrome comparison. The two subjects are separate static assets; each fit preserves its own aspect ratio.

## Asset verification

Both final PNGs: decoded, all PNG chunk CRCs checked, alpha values exactly0/255, zero magenta pixels, nonempty, and content clear of every image edge. Both processor strict-QC results have zero source/output edge touches, empty frames, or paste clamps. Machine evidence: `qc.json`, per-variant `processed/pipeline-meta.json`.

`preview-color-monochrome-2x.png` shows color above and the runtime `whiteSprite` threshold0.5 transformation below. The transformation reproduces `src/core/gfx.js:monoPortrait`: luminance threshold plus white alpha-outline pixels. Visually inspected: seated drivers, complete front bumper/bonnet, steering contact, and separated wheel hubs remain visible in both variants. White/black sprite silhouette is the intended battle appearance; color is retained in the final PNG for source fidelity.

Status: asset QC passed by producer. Independent review and actual battle integration are separate checks; this README does not claim those passed.
