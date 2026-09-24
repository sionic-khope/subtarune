# Open central gate · BUILD318

Built-in image generation edited the actually viewed `assets/props/castle307_sealed_gate.png`. It preserves the gothic arch, masonry, crystal accents and framing, opens the door leaves inward, lights their seals, and adds a nearly black interior with ominous violet mist. No character or existing closed asset was overwritten.

Raw source: `raw-open-gate.png`, copied from generation `exec-61ede517-a0a0-499f-a939-2103cdec63dc.png`. The source is1145×1374 RGBA. Runtime `assets/props/castle318_open_gate.png` is320×384 RGBA, the same canvas and bottom-center pivot160,384 as the closed gate. Display scale0.75 and position remain unchanged. It is a single open-state prop; opening interpolation and live glow are owned by the runtime, not claimed as generated animation frames.

The general generate2dsprite single-asset processor was run for inspection under `processor/`; its square result is not the runtime asset. As with the existing castle307 tall gate, runtime export preserves source alpha and uses NEAREST316×379 placed at2,3 in320×384. Reproduction from repository root:

```sh
ffmpeg -v error -i assets/source/castle318/gate/raw-open-gate.png -vf 'scale=316:379:flags=neighbor,pad=320:384:2:3:color=black@0' -frames:v 1 assets/props/castle318_open_gate.png
```

The final PNG was directly viewed: complete arch and pillars, inward leaves, two violet seals and dark passable central opening. Camera, actor clipping and transition checks are separate runtime evidence. Exact generation prompt is in `prompt.txt`. No external image API or paid fallback was used.
