# Captain125 field export contract

`junhee_point` is one original pink pig pointing pose, 64×64, facing front. It preserves blue eyes, pink body, drooping ears and the frowning mouth. Source is built-in image generation on magenta. The standard sprite processor performs chromakey and shared fit0.85 / feet alignment into a64px cell, with strict QC, trim0 and edge-clean0. `export.py` samples the original cleaned source through NEAREST using the processor's measured crop and paste metadata.

Adjacent `gajaeman_shadow` and `junhee_mankatsuki` are 256×256 atlases, 64px cells, four columns and four rows in down/up/left/right order. Columns are neutral, stepA, neutral, stepB, 160ms each.

Shadow source has a baked checkerboard. Its `prepare.py` changes only alpha for bright neutral background pixels, then repacks measured whole poses onto352px cells. All retained RGB values are unchanged. It preserves red eyes and the mouthless face.

Hair-revised Junhee source also has a baked checkerboard. Its `prepare.py` flood-fills only connected exterior neutral background, retaining enclosed white cloud outlines, black parted hair/ponytail, red eyes, pink face/ears/tail and the black cloud cloak. No global white removal is used.

Junhee's removed background is stored as `(0,0,0,0)`, including RGB. Retaining original checkerboard RGB under alpha0 caused the image preview to display checker squares. Re-exporting with zeroed RGBA removes those preview artifacts without changing a single composited visible pixel. `../junhee_mankatsuki/dark-background-review.png` verifies the final sheet over dark navy; transparent pixels with nonzero RGB:0. All 5055 opaque bright pixels, including cloud outlines, remain intact.

Both directional sheets use the existing `assets/source/lounge-npcs-v1/export.py` with row-order0,1,2,3. All runtime PNGs use NEAREST with no palette quantization, erosion, pose repainting or per-frame scale normalization. Every final frame is nonempty and clear of cell edges; all standard strict QC runs passed. Source and processing metadata are retained in each directory.

The processor's LANCZOS previews are disposable working intermediates, not runtime delivery. Numbered/directional frame PNGs, final sheet PNGs, and GIFs in the source directory are the NEAREST exports.
