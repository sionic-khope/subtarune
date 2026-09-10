---
paths:
  - "src/**"
---

# Web (Canvas/JS) Code Rules

- ES modules only; no bundler, no transpile. Code must run as-is in evergreen browsers.
- Rendering is pixel-perfect: internal 480x360 (2x render), `imageSmoothingEnabled=false`, round all draw coords.
- Never loop over tiles per frame — maps are baked once (`TileMap.bake`).
- All user-facing system text comes from `src/data/locale/*.js`. Dialogue content lives in `src/data/scripts.js`.
- New entity kinds register via `registerEntity()`; new tiles via `registerTile()`; never special-case types in the game loop.
- Audio: mp3 assets under `assets/audio/` (BGM/SFX/voices, sources in `design/audio/references.md`) + WebAudio blips. Never replace a sound the user chose. Preload a BGM (`sound.preloadBgm`) before a transition that must start it without a gap.
- Every interactive UI must work with keyboard (C/X/arrows) AND gamepad (`Input` abstraction — never read `KeyboardEvent` directly outside `src/core/input.js`).
- Art placeholders live in `src/data/art.js`; real art drops into `assets/**` and overrides automatically — code must never hard-depend on a PNG existing.
- Edit JS only through `tools/dev/patch.py` (temp copy → `node --check` → move): the dev server serves the working tree live. No trailing `//` comment on a one-line statement.
- Cutscene positions are relative (`rel:` + `at`/`by`); `tests/unit/cutscenes.test.mjs` rejects moves onto interior void tiles.
