# Malzahar-seob BUILD310 sprite delivery

Five actual built-in image_gen generations, one per action family. Runtime registration and game integration are owned by the parent developer; this package is asset-ready only.

## Runtime assets

| File | Sheet | Cell / pivot | Playback |
| --- | --- | --- | --- |
| hover.png | 256×256, 2×2 | 128×128 / 64,64 | 0→1→2→3 loop, 180ms each |
| cast.png | 256×256, 2×2 | 128×128 / 64,64 | prepare150→raise200→release150→recover180ms, then hover |
| dash.png | 256×256, 2×2 | 128×128 / 64,64 | windup240→strike100→follow120→recover200ms, then hover |
| hit.png | 256×256, 2×2 | 128×128 / 64,64 | impact80→recoil130→curl140→recover180ms, then hover |
| voidling.png | 128×128, 2×2 | 64×64 / 32,32 | four running-leg phases, 90ms each loop |

All indices are zero-based row-major. Cast release is frame2; dash strike begins frame1. World translation, boss smoke, purple aura, projectiles, impact flash, debris and audio are runtime layers and intentionally absent from body art. The GIFs repeat even one-shot actions for inspection; the runtime contract still marks those one-shot.

## Identity and visible motion

Attachment is copied as identity-reference.png. Plum pointed hood with three cyan gems, two cyan eyes behind black glasses, broad pale cheeks, plum mouth scarf, slate open vest, visible pale belly, plum waist wrap, gloves and boots are preserved. All views face left with a readable 3/4 face. Hover has scarf flutter, modest hand changes and loose knees. Cast has four distinguishable hand phases. Dash has a tucked windup, two left-lean strikes, upright recovery. Hit has flinch, rightward recoil, protective curl and recovery. Voidling has four alternating leg configurations.

## Raw and processing lineage

Each action folder contains the exact prompt, original raw-sheet.png, keyed raw-sheet-clean.png, processor metadata and preview, plus final frame-0.png through frame-3.png and final-animation.gif. The processor's sheet-transparent.png is an INTERMEDIATE LANCZOS export; only the five root PNGs are runtime delivery. Do not integrate intermediate sheets.

Prompts request solid magenta. The built-in tool returned RGBA1254×1254 images (627px source cells); some already contain native alpha. Native alpha is preserved, remaining magenta is keyed. Backend model, quality setting and usage cost are not exposed by the built-in tool and are unknown. generation-calls.json records input roles and saved outputs.

Processor: generate2dsprite/scripts/generate2dsprite.py process, target creature, rows2 cols2, align center, component largest, trim-border0, edge-clean-depth0, strict-qc. Hover used preserve scale/fit0.9/cell128 and wrote scale-profile.json; cast/dash/hit reused it. Voidling used shared fit0.69/cell64. The intermediate scale drift was cast3.61%, dash7.65% (intentional lean/compression), hit1.22%; all pass under8%.

Final export uses export.py with one common96/542 raw-pixel scale for all boss frames and44/519 for the voidling. No per-frame anatomical scaling, color redrawing, pose compositing, face repair, or palette quantization. Bbox crop is translated to common cell center. Source crop metadata is CELL-LOCAL; export adds the row/column source origin, explicitly recorded in final-qc.json. Source images and exports are separate.

Reproduce final files from the retained clean/raw metadata:

    uv run export.py

## QC actually performed

Final PNG decode, expected dimensions, all20 cells nonempty, exact binary alpha, zero opaque magenta pixels, zero frame-edge contact, zero paste clamp. All20 frames have distinct pixel hashes; pose differences were also visually inspected (hash differences alone are not pose evidence).

Final hover heights94,95,94,93px; cast94,95,92,94px; dash91,82,77,92px (tilted postures); hit91,89,87,93px. Head and limb magnification remains shared across actions. Voidling max width43px, normal height26–29px with intact legs/pincers. Final contact-preview-2x.png displays all frames at shared scale.

Actual GIF playback inspected in the Codex in-app browser at preview.html, with different phases visibly captured on consecutive observations. Four distinct decoded frames in every GIF. Only asset playback is covered; in-game positioning, damage timing and transitions remain parent integration QA.

Export script is64 nonblank, non-comment lines, owns only mechanical sprite export/QC, uses typed source metadata and no untyped escape hatches. Programming audit reports no violations. Local LSP hook cannot inspect this external worktree path and reports a path-scope error; actual script execution succeeded.
