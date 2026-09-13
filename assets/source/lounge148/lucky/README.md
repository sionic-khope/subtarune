# 럭키 · deterministic export

The parent generated `raw.png` with built-in image_gen. Its exact generation prompt is owned by the parent lane. This lane viewed the raw and exported it without new generation or drawn art.

Runtime: `assets/sprites/lucky.png`,256×256,64×64 cells,rows down/up/left/right,4 frames per direction,common pivot32,60. Frame art height53–56px. `runtime-contract.json` records all bboxes.

`process.py` preserves the raw, uses measured empty row separators0,310,620,925,1254 to prevent clipping the last row at the nominal grid boundary, and pads cells to330×330 without resizing. It invokes the sibling Park Guardian NEAREST processor with shared scale0.89, feet alignment, strictQC,body-CV max0.08,anchor-Y-std max0.05. Final export removes magenta remnants by hue, reorders rows0,3,1,2, and translates the bottom to60 without scaling individual frames. No runtime PNG color quantization.

Run from root: `uv run --with pillow --with numpy python assets/source/lounge148/lucky/process.py`.

All16frames pass strictQC with no empty frames, source/output edge contacts or clamps. Final export checks binary alpha and interior bboxes. `preview.png` was visually inspected: bald yellow head, black7face, red cheeks, green clover shirt, navy shorts, black shoes; complete4direction walking poses. In-engine playback belongs to parent integration QA.
