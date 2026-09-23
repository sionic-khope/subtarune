# BUILD310 background Gajaeman champion variants

Final runtime: warwick.png, ezreal.png, yasuo.png, akali.png. Each192×192RGBA,2×2 of96×96 cells, centerpivot48,48. Row-major0idle/1windup/2strike/3HURT recoil. Every frame's final alpha-bottom is exactly y83, so ledge foot offset35. Suggested runtime0.48 gives roughly33px body. Preview durations350/220/180/250ms; actual state transitions belong to runtime.

Use ROOT PNGs only. Character-folder sheet-transparent.png is intermediate LANCZOS output. frame-0.png through frame-3.png and final-animation.gif match the final root assets.

Identity: assets/source/captain125/gajaeman_shadow/raw-sheet.png and runtime assets/sprites/gajaeman_shadow.png. Style: assets/source/memory309/udyrsub/processed/combat-1.png. Broad gray-blue cheeks, large round nose, black glasses and exactly two red eyes are retained with new champion silhouettes. No old sprite was pasted as a variant.

Primary Riot sources consulted2026-09-24KST: [Warwick](https://www.leagueoflegends.com/en-us/champions/warwick/), [Ezreal](https://www.leagueoflegends.com/en-us/champions/ezreal/), [Yasuo](https://www.leagueoflegends.com/en-us/champions/yasuo/), [Akali](https://www.leagueoflegends.com/en-us/champions/akali/). Beast/alchemical pump, explorer/magic gauntlet, swordsman and ninja identity were grounded in these pages; specific costume colors/ponytails/weapons follow user's requirements.

Exactly four built-in image_gen calls. Original1254×1254RGBA outputs, exact prompts and lineage retained. Backend/quality/cost unknown because tool does not expose them. Prompts request magenta; native output alpha retained and remaining magenta keyed.

Processor uses targetcreature/modecombat/2rows2cols/cell96/fit0.99/preserve/shared/center/largest/trim0/edge-clean0/strict. Ezreal,Yasuo,Akali pass directly. Initial Warwick strictQC caught a strike hand extending across nominal x627 into the empty gap; hand is intact in full image, next subject begins x752. Mechanical regrid uses original rectangles(0,0,660,627),(660,0,1254,627),(0,627,660,1254),(660,627,1254,1254), each centered horizontally in700pxcells at localy36. No art resizing/drawing. Original in warwick/raw-original.png, regrid in raw-regrid.png, passing processor in warwick/regridded.

export.py applies source-origin offsets, alpha threshold128, NEAREST, one constant per-character scale70/neutralrawheight across four poses, and feet83 alignment. No per-frame scale correction. final-qc.json includes cell-local crops, global rects, and original raw rects for Warwick regrid. Reproduce with uv run export.py.

Verified16 distinct actual poses through contact-preview-2x.png and runtime-half-scale-preview-4x.png: claw/gather/sword/kama windups, strikes and recoil. All16 finalframes nonempty, binaryalpha, zero opaque magenta, zero output-edge contact, zero clamp, everyfeet83. Four decoded frames perGIF;16distinct pixelhashes. Export script programming audit passes.

Current CUA browser list is empty, so actual browser animation playback for THIS bundle is not claimed; parent in-game QA must check sequencing and defeat. preview.html is provided. Earlier boss bundle playback is separate evidence. No runtime edits or commits made.

