# BUILD316 giant boulder props

Generated on 2026-09-24 for the regret bridge's east-end collision. Base revision: `43d267f53b25f11750c3c235262dcb32057a1780`. Only the props and their production records are owned by this asset task; scene/map integration is separate.

## Runtime contract

| Asset | Canvas | Visible body / placement |
| --- | --- | --- |
| `assets/props/castle-boulder316.png` | 256 × 256 RGBA | Near-round rock, alpha bounds `(18,20)-(238,236)`, visible 220 × 216. Rotate about `(128,128)`; no floor, shadow, wall or dust baked in. |
| `assets/props/castle-boulder-wall316.png` | 384 × 320 RGBA | Whole prop alpha bounds `(34,34)-(305,306)`. The same rock is approximately 220 × 217, centered at `(144,176)`. Shattered east wall's contact plane is approximately local `x=224`; visible face points west. |

Use scale **1** for both assets. A 288-pixel rolling canvas would enlarge the rock to 247.5 pixels and cause a scale jump against the embedded prop. For scene contact `(3344,628)`, draw the embedded image at `(3200,452)`; its wall contact plane aligns to world `x=3424`. The embedded center/contact plane are measured art anchors, not collision masks; scene collision remains explicit.

Both final PNGs have binary alpha `0/255`, transparent margins on all sides, and uniform nearest-neighbor scaling. No new raster artwork was drawn by code. Small thresholding removes faint generated edge residue; no creative recoloring or silhouette repainting was applied.

## Generation provenance

Two built-in `image_gen` calls, one per asset. The model identifier, quality tier, and monetary charge were not exposed by the tool, so actual cost is unknown.

1. `rock-prompt.txt` is the exact generation prompt. References: existing `castle306_floor.png` and `gajaeman_castle_wall.png`. The original output is preserved as `rock-raw.png` (1254 × 1254). Original generated file: `/Users/khope@sionic.ai/.codex/generated_images/01a0cd22-5fd7-7ec1-bf16-bbabde9e4336/exec-1b04e4c5-aea5-477b-b92d-f348f9021c18.png`.
2. `wall-prompt.txt` is the exact follow-up prompt. References: `rock-raw.png` and the existing castle wall tile. The original output is preserved as `wall-raw.png` (1374 × 1145). Original generated file: `/Users/khope@sionic.ai/.codex/generated_images/01a0cd22-5fd7-7ec1-bf16-bbabde9e4336/exec-c7509d50-9555-4519-b130-a6888756c047.png`.

Although prompts requested a chroma background, the backend supplied native transparency; chroma removal was unnecessary. Alpha was thresholded at 128 before cropping and resizing.

## Reproduction and verification

Run from the repository root:

```sh
sh assets/source/boulder316/props/export-rock.sh
sh assets/source/boulder316/props/export-wall.sh
```

The exporters pin Pillow 12.3.0, validate the input PNGs, apply only mechanical alpha/crop/NEAREST operations, save runtime files and 3× previews, and record SHA256 and geometry in `rock-qc.json` / `wall-qc.json`. The rock is centered after scaling to a 220-pixel maximum diameter. The wall crop is uniformly scaled by `220/906` to match the referenced rock and placed at `(34,34)`.

The reusable `generate2dsprite.py process --strict-qc` pipeline additionally passed for both assets. `rock-processed/` and `wall-processed/` preserve those reports and intermediates. Those generic square, smoothly resized outputs are **not runtime assets**; the dedicated nearest-neighbor exporters above produce the final 256×256 and 384×320 files.

Visual checks: native raw references and both `*-preview-3x.png` images inspected. The boulder reads as a heavy near-spherical grey/charcoal mass with sparse violet mineral seams; the wall variant keeps the same identity while adding a broken purple masonry rim and rubble. Runtime camera/collision composition must still be verified by the scene QA owner.

Final SHA256:

- Rock: `66a4654cf2d3ac563a7d2291f0d592a43a084c841538d90b13175e208dca6df6`
- Embedded: `ac91a8a157f85661000d203d9da92d65656db23d849485bbf8d0d79e5c23bf77`
