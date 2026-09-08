---
paths:
  - "src/**"
---

# Web (Canvas/JS) Code Rules

- ES modules only; no bundler, no transpile. Code must run as-is in evergreen browsers.
- Rendering is pixel-perfect: internal 320x240, integer scale, `imageSmoothingEnabled=false`, round all draw coords.
- Never loop over tiles per frame — maps are baked once (`TileMap.bake`).
- All user-facing system text comes from `src/data/locale/*.js`. Dialogue content lives in `src/data/scripts.js`.
- New entity kinds register via `registerEntity()`; new tiles via `registerTile()`; never special-case types in the game loop.
- Audio is synthesized (`src/core/audio.js`). No audio assets for blips/SFX.
- Every interactive UI must work with keyboard (C/X/arrows) AND gamepad (`Input` abstraction — never read `KeyboardEvent` directly outside `src/core/input.js`).
- Art placeholders live in `src/data/art.js`; real art drops into `assets/**` and overrides automatically — code must never hard-depend on a PNG existing.
