# Mankatsuki lavender skin edit

Built-in `image_gen` edited three existing captain125 raw grids. Only the requested skin family changes to pale lavender: face, snout, ears, hands, exposed legs, hoof tips, and curly tail. Red eyes, black Itachi hair, black cloak, red clouds, white cloud borders and red trim remain. Ordinary Junhee assets are unchanged.

| Folder | Edit reference | Runtime | Frames |
| --- | --- | --- | --- |
| `skin-idle` | `../captain125/mankatsuki_idle/raw-grid.png` | `assets/enemies/mankatsuki-idle.png` | 4 × 128px, horizontal |
| `skin-attack` | `../captain125/mankatsuki_attack/raw-grid.png` | `assets/enemies/mankatsuki-attack.png` | 6 × 128px, horizontal |
| `skin-walk` | `../captain125/junhee_mankatsuki/raw-grid.png` | `assets/sprites/junhee_mankatsuki.png` | 4 × 4 × 64px, down/up/left/right |

Each folder retains `prompt-used.txt`, generated `raw-sheet.png`, normalized `raw-grid.png`, the previous runtime `runtime-before.png`, processor measurements, final frame PNGs, final grid/strip PNGs, a GIF and `runtime-manifest.json`. The original generated files remain in the built-in generator's storage. Reference originals remain in captain125.

Postprocessing only: normalize whole-sheet resolution with NEAREST (idle 1408×1408; attack 1408×2112; walk 1254×1254), chromakey, split, shared-scale sample, translate and assemble. Battle actions reuse `../captain125/mankatsuki_idle/scale-profile.json` unchanged. Walk reuses the previous processor settings (64px cells, fit0.85, shared scale, feet alignment, trim0, edge-clean0). No anatomy is drawn or recolored in code; every final art pixel comes from the generated edit.

Runtime pixels use NEAREST exports from cleaned raw images via `../captain125/junhee_point/export.py`. Processor LANCZOS previews are not runtime assets. Final integer vertical translations restore each old frame's bottom: idle `[1,1,1,0]`, attack `[0,-1,0,0,0,0]`, walk all zero. Translation does not resize any frame. Final exports are `final-grid.png` for walk and `final-strip.png` for battle.

Strict processing QC: all 26 frames nonempty; no source/output edge contact or paste clamping. Battle source-to-output scale stays 0.1545454545. Relative body-scale drift against accepted battle profile is idle 0.01005 and attack 0.00334. The edit retains proportions and poses with small generated contour differences; it is not a byte-exact palette substitution. Idle is 1–3px shorter, walk is equal or 1px smaller, and attack bounds are essentially unchanged. No runtime enlargement or boss-scale change is introduced.

Final grids were visually inspected for lavender skin, red eyes/clouds, all 16 walking directions/poses, four idles, six attack phases and complete limbs. Frame dimensions and exact previous foot-bottom positions were independently checked on final runtime PNGs. In-engine playback verification belongs to the integration task.
