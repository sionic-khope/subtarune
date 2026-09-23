# Castle seal orb · BUILD311

Asset-ready, not a claim of runtime integration. Root integration lane owns map/light/camera/save verification.

## Final contract

- Runtime: `assets/props/castle-seal-orb.png`, 128×128 RGBA, one static frame, center pivot `(64,64)`, scale1.
- Visible alpha bbox: `[7,5,120,122]` (right/bottom exclusive); 113×117 aura silhouette. Approx85px circular body rather than96px target; full aura containment was prioritized over clipping. Body remains clearly round and separate from surrounding energy.
- 7,538 opaque pixels, binary alpha0/255, no visible pure-magenta pixels, no touched edge, no clamp, no empty frame.
- SHA256: `dfac57a821e58c19778d2eaf03baad684feac2cba30ad32f19e7c01a18522acb`.
- Runtime should add broad breathing light and particles behind this static prop; do not bake floor or character shadows into the PNG. No pedestal, text, floor or cast shadow exists in this image.

## Provenance

Built-in `image_gen`, one generation. Backend model, quality, seed, usage and cost were not exposed and remain unknown. Exact prompt: [prompt-used.txt](prompt-used.txt). Actual image references: `assets/props/castle307_sealed_gate.png` (obsidian seal/material and castle purple) and `assets/tiles/castle307_floor.png` (dark palette/pixel density), both viewed before generation. Base commit `295ef87725cd91dfc7a097300ae82828c7795a04`.

Original tool output: `/Users/khope@sionic.ai/.codex/generated_images/01a0ced5-4752-77e3-a40c-8b3ecb866304/exec-d3fce459-90a1-42c2-ac50-34bcf2bde1bb.png`; copied untouched to [raw.png](raw.png). Although the prompt requested solid magenta, the tool returned native transparent1254×1254 RGBA. No replacement art was drawn procedurally. No hue-based removal was applied, so violet accents remain intact.

## Mechanical processing

From repository root, using installed `uv`, Pillow and NumPy:

```sh
uv run --with pillow --with numpy python -c 'from PIL import Image; import numpy as np; im=Image.open("assets/source/orb311/visual/raw.png").convert("RGBA"); a=np.asarray(im); im.putalpha(Image.fromarray(np.where(a[:,:,3]>=128,255,0).astype("uint8"))); im.save("assets/source/orb311/visual/alpha-clean.png")'
uv run --with pillow --with numpy python /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py process --input assets/source/orb311/visual/alpha-clean.png --target asset --mode single --rows 1 --cols 1 --cell-size 128 --fit-scale 0.92 --align center --component-mode all --threshold 0 --edge-threshold 0 --trim-border 0 --edge-clean-depth 0 --strict-qc --output-dir assets/source/orb311/visual/processed
uv run --with pillow --with numpy python -c 'from PIL import Image; im=Image.open("assets/source/orb311/visual/alpha-clean.png").convert("RGBA"); crop=im.crop(im.getbbox()).resize((113,117),Image.Resampling.NEAREST); out=Image.new("RGBA",(128,128)); out.alpha_composite(crop,(7,5)); out.save("assets/props/castle-seal-orb.png"); out.resize((512,512),Image.Resampling.NEAREST).save("assets/source/orb311/visual/preview-4x.png")'
```

The first raw strict-QC attempt rejected faint nearly transparent speckles at canvas boundaries. Alpha threshold128 removed those unintentional ghosts and produced source bbox `[114,93,1139,1152]`; no opaque source contour was clipped. The skill processor then passed strict containment with zero empty, source-edge, output-edge and clamp frames. Its default smooth export is kept only as intermediate evidence. The delivered PNG reuses the exact measured crop/placement through NEAREST to maintain crisp pixel art and binary alpha. Do not replace the runtime PNG with `processed/sheet-transparent.png`.

## Visual inspection

Viewed final runtime PNG through [preview-4x.png](preview-4x.png): circular glossy near-black body, lavender edge highlights, violet swirling core, contained jagged aura, no platform or unwanted scene. The source/processor metrics and final export metrics are distinct. Subjective acceptance and actual room-scale lighting remain for independent/root visual QA.
