# Park Guardian battle sprites · BUILD155

Seven originals were generated with the built-in image tool. Actual prompts are preserved in `prompts.md`; `<action>-raw.png` is an unchanged copy of each original. No creative raster drawing was used during processing.

## Runtime contract

All sheets face left, use row-major order, binary transparency, NEAREST-only runtime resizing and a shared bottom baseline of90. Each action directory contains `runtime-contract.json` with the exact frame bounds, magnification and pivot.

| Runtime file in `assets/enemies/` | Frames | Cell | Sheet | Pivot |
| --- | --- | --- | --- | --- |
| `park-guardian-attack.png` | 6 | 96×96 | 192×288 | 48,90 |
| `park-guardian-scratch.png` | 4 | 128×96 | 256×192 | 64,90 |
| `park-guardian-adjust.png` | 4 | 96×96 | 192×192 | 48,90 |
| `park-guardian-dance.png` | 4 | 96×96 | 192×192 | 48,90 |
| `park-guardian-loose.png` | 4 | 96×96 | 192×192 | 48,90 |
| `park-guardian-slipping.png` | 4 | 96×96 | 192×192 | 48,90 |
| `park-guardian-empty-costume.png` | 1 | 96×96 | 96×96 | 48,90 |

Attack was actually generated as3columns×2rows. It is repacked into2columns×3rows without changing row-major sequence. Scratch has deliberately wider cells so the fully extended arm fits at the same standing-equivalent body scale. Its runtime action must consume the128×96cell and64,90pivot; never treat it as a96px-square sheet or compensate with a smaller actor.

Dance, loose and slipping reuse exactly80/515 raw-pixel magnification. This preserves their matching pose/body scale and allows drooping ears to reduce visible height naturally. Their respective final heights are78–80,78–79 and70–74px. No frame or looseness tier is independently fit to an80px bbox. Attack, scratch, adjust and empty costume use one magnification per source sheet, calibrated to a standing-equivalent80px body, not the maximum attack width.

Frame bottoms are translated to90 and each source foot envelope is aligned to the action pivot. Every frame has zero additional corrective root offset. Art is not stretched, rotated, repainted or normalized per frame. GIFs use150ms/frame as visual previews; the runtime owns actual action timing.

## Reproduce

Run from the game repository root:

```sh
uv run assets/source/park155/process.py
```

The script first runs the installed `generate2dsprite.py process` for all7 originals with strict QC. Full commands, logs and standard processor artifacts are under `<action>/standard/`. It then exports runtime pixels from the cleaned original, never from the processor's interpolated thumbnail. The script depends on the installed skill at `~/.codex/skills/generate2dsprite/scripts/generate2dsprite.py`.

For native RGBA originals (scratch, adjust, empty costume), both chroma thresholds are0: existing transparency is preserved and pink costume features are never keyed by color. Final alpha uses a128threshold. Magenta RGB originals use the standard100/150color-key cleanup plus a narrow low-green magenta fringe filter; the pink forehead skull, bells and nose retain their opaque light-pink pixels. There is no palette quantization or blur in runtime PNGs.

## QC

- Standard strict-QC: all7 runs exited0; zero empty frames, edge contacts or paste clamps.
- Standard body-scale CV:0.000–0.01636; anchor-Y std:0.000–0.02181. Both below the usual0.08/0.05grounded-body thresholds.
- Runtime export asserts nonempty interior bounds, exact frame layouts, binary alpha, bottom90 and full containment at authored magnification.
- `preview.png` contains every delivered frame at2×NEAREST. Original sheets and the final contact sheet were visually inspected: costume identity, left-facing wearer, complete scratch arm, progressive fabric/ear droop and full pink details remain visible.
- Reproduction script: Ruff passed; basedpyright returned0errors/0warnings. LSP post-edit hooks could not resolve this external worktree path, so these diagnostics were run directly from its owning worktree.

This is asset-production evidence. The battle integration lane separately owns registration, playback, stack thresholds, re-costuming, real-scene placement and gameplay verification.
