# Raft recall pillar lever306

Built-in image_gen produced the new neutral darkstone pillar mechanism, metal lever with red handgrip and pale boat/paddle emblem. The original tiny assets/props/lever_off.png was a pixel-style reference only. Existing lever art remains untouched.

## Runtime contract

| State | Runtime file | Canvas / pivot |
| --- | --- | --- |
| Idle, handle leans left | assets/props/raft_call_lever_off.png | 32×48 RGBA / bottom-center16,48 |
| Pulled, handle leans right | assets/props/raft_call_lever_on.png | 32×48 RGBA / bottom-center16,48 |

Both have the same grounded base at y46, with2px empty bottom margin. Visible bounds are off4,2,25,46 and on8,2,29,46. The larger handle envelope changes side while the pillar center stays fixed. No timing, collision, puzzle flags or recall behavior is encoded in the artwork; integration displays the pulled state during recall.

## Source and mechanical export

raw-sheet.png is the unchanged748×2103 RGBA source, one column with two rows. prompt-used.txt stores the exact prompt; export.json stores generation ID, source/runtime hashes, crops, placement and scale. Tool model and cost are unknown. The built-in generation ID is exec-1a292c45-6d46-4f24-818d-47e33d4c3119.

Only generated alpha below8 is cleared to discard stray haze pixels. All other alpha and original colors are preserved. Both states use one shared scale44/828 and NEAREST resampling; crop bounds are the two alpha silhouettes and horizontal position retains the original shared centerline. No painting, palette quantization, shape synthesis or per-frame scale normalization occurs.

Reproduce from repository root:

```sh
uv run assets/source/raft-call306/export.py
```

states-1x.png is the native64×48 contact sheet, states-8x.png its NEAREST enlargement. Actual final pixels were viewed: left/right red handle motion and aligned pillar bases are clearly distinct; the small pale boat/paddle emblem is present. Both files decode as32×48 RGBA with transparent surroundings and unique hashes. Basedpyright reported0 errors/0 warnings with Pillow/NumPy stubs, and the programming no-excuse audit passed. The exporter owns only mechanical asset conversion; live recall behavior and placement across maps are separate integration QA.
