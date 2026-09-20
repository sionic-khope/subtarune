# Battle runtime atlases

`*-runtime.png` and `*-run-runtime.png` are derived from the approved `hyungsub`, `gyeongsub`, and `ppaman` PNG atlases in this folder. The originals and all frame pivots, durations, and display scales remain unchanged.

`tools/battle/export-runtime-atlases.mjs` uses the game's `makeTransparentFrame` color-key and exclusion logic to render each original frame at its original size. Attack frames are packed without overlap in a 1600×1024 atlas; idle and run frames retain their original cells. The exporter reloads both paths in Chromium and byte-compares every RGBA pixel of all 12 frames per character. It exits nonzero on any mismatch.

Rebuild with a local static server serving this repository, then run:

```sh
node tools/battle/export-runtime-atlases.mjs http://127.0.0.1:8897/ /path/to/Chromium
```
