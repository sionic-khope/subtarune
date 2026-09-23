# Udyrsub · memory308 ordinary enemy combat asset

This package supplies the requested compact four-pose combat artwork only. It does not register the enemy or change memory battle runtime code.

## Identity and source

- User identity reference: `assets/references/memory308-udyrsub.png`, copied here as `references/identity.png`.
- Pixel-density/style reference: `references/hyungsub-style.png`, a byte copy of the approved `assets/sprites/hyungsub.png`.
- Required traits preserved: long brown hair and beard, the bright blue left hair strand, glasses with two eyes, broad face and enormous U-shaped nose, bare muscular tattooed torso, orange beads, white wraps, leather skirt, and wrapped boots.
- `raw-sheet.png` is an unchanged copy of the built-in `image_gen` result. Backend model, quality, usage, and monetary cost are unknown because the built-in tool does not expose them. It is not an OpenGateway/API generation.
- The exact built-in prompt is `prompt-used.txt`; input roles were the identity reference and the approved style sheet.

## Deliverables and memory308_battle handoff

| File | Contract |
| --- | --- |
| `assets/enemies/udyrsub-battle.png` | 256×256 transparent RGBA, 2×2 grid, 128px cells, row-major neutral → anticipation → release → recovery. |
| `assets/enemies/udyrsub-front.png` | 128×128 transparent neutral frame copied from cell 0. |
| `memory308_battle-contract.json` | Consumer contract: pivot `[64,120]`, one source scale, frame durations 180/160/140/200ms, no additional root offsets or runtime scale. |

The compact ordinary enemy is rooted, lower-left three-quarter facing, and not a boss. The small dark-violet energy remains behind the upper body; the glasses, both eyes, and nose stay unobscured.

## Deterministic processing and QC

The existing `generate2dsprite.py process` first processed `raw-sheet.png` with strict QC: 2×2, 128px cells, `--align feet --shared-scale --scale-strategy preserve --component-mode largest --fit-scale 0.84 --trim-border 0 --edge-clean-depth 0 --strict-qc`. Its `processed/pipeline-meta.json` reports four nonempty frames, zero source/output edge contacts, zero paste clamps, one shared raw-cell scale `0.17148325358851674`, body-scale CV `0.0188633`, and anchor-y std `0.01885`.

The final runtime PNGs are a mechanical export from that cleaned source: the selected processor regions and common scale are retained, the resample is NEAREST, alpha is thresholded to binary at128, and each frame is translated only to the common y120 feet pivot. No character pixels were repainted, palette-quantized, or individually rescaled. `runtime-qc.json` contains the resulting bounds, alpha values, and output paths.

`animation.gif` and `contact-preview-2x.png` are visual QC artifacts, not runtime files. The final images were inspected on a black background: all four poses remain full-body and readable, frame 2 visibly releases a claw/spirit cast without a detached projectile, and all requested face/clothing markers remain clear.

Image asset QC passed. `memory308_battle` still owns registration, preload, timing hookup, and in-battle validation.
