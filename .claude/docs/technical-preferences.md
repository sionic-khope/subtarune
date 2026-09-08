# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Engine**: Custom HTML5 Canvas 2D (no external engine)
- **Language**: JavaScript ES2022 modules (no bundler, no TypeScript)
- **Rendering**: Canvas 2D, internal 320x240, integer upscale, `imageSmoothingEnabled=false`
- **Physics**: AABB vs tile grid + entity boxes (`src/world/world.js` Character.moveBy)

## Input & Platform

<!-- Written by /setup-engine. Read by /ux-design, /ux-review, /test-setup, /team-ui, and /dev-story -->
<!-- to scope interaction specs, test helpers, and implementation to the correct input methods. -->

- **Target Platforms**: Web (desktop browser first), later itch.io / Electron wrap
- **Input Methods**: Keyboard, Gamepad (standard mapping). Touch: not yet
- **Primary Input**: Keyboard — Arrows/WASD move, C confirm, X cancel+run, V menu
- **Gamepad Support**: Full (A=confirm, B=cancel/run, X/Y/Start=menu, D-pad/left stick move)
- **Touch Support**: None (planned: on-screen D-pad)
- **Platform Notes**: Audio requires a user gesture to unlock (boot overlay handles this)

## Naming Conventions

- **Classes**: PascalCase (`TextBox`, `ScriptRunner`)
- **Variables**: camelCase; constants UPPER_SNAKE
- **Signals/Events**: callbacks (`onEnd`, `onEnter`) — no event bus yet
- **Files**: lowercase, one module per concern (`src/<layer>/<name>.js`)
- **Scenes/Prefabs**: Maps = `src/data/maps.js` entries; entity types via `registerEntity()`
- **Constants**: UPPER_SNAKE, exported from the owning module

## Performance Budgets

- **Target Framerate**: 60 fps (rAF, dt clamped to 50ms)
- **Frame Budget**: < 4 ms JS per frame
- **Draw Calls**: map pre-baked to one offscreen canvas; entities ≤ 1 drawImage each
- **Memory Ceiling**: < 100 MB

## Testing

- **Framework**: node:test for pure logic (`tests/unit`), Playwright headless autoplay for smoke (`tests/playtest`)
- **Minimum Coverage**: dialogue parser/layout + collision must have unit tests
- **Required Tests**: Balance formulas, gameplay systems, networking (if applicable)

## Forbidden Patterns

<!-- Add patterns that should never appear in this project's codebase -->
- UI code mutating game state directly (go through `game.*` methods / script nodes)
- Hardcoded UI strings in `src/ui` (use `src/data/locale/*.js`)
- Per-frame tile loops (bake to offscreen canvas)
- Audio files for dialogue blips (synth only, keep it zero-asset)

## Allowed Libraries / Addons

<!-- Add approved third-party dependencies here -->
- Galmuri11 (Korean pixel font, via jsDelivr CSS, falls back to system font offline)
- No runtime JS dependencies

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]

## Engine Specialists

<!-- Written by /setup-engine when engine is configured. -->
<!-- Read by /code-review, /architecture-decision, /architecture-review, and team skills -->
<!-- to know which specialist to spawn for engine-specific validation. -->

- **Primary**: lead-programmer
- **Language/Code Specialist**: gameplay-programmer (JS)
- **Shader Specialist**: technical-artist (Canvas only, no shaders)
- **UI Specialist**: ui-programmer + ux-designer
- **Additional Specialists**: sound-designer (WebAudio synth), writer (Korean dialogue), world-builder (maps)
- **Routing Notes**: never spawn godot-*/unity-*/ue-* specialists for this project

### File Extension Routing

<!-- Skills use this table to select the right specialist per file type. -->
<!-- If a row says [TO BE CONFIGURED], fall back to Primary for that file type. -->

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| `src/**/*.js` | gameplay-programmer |
| (none) | — |
| `src/ui/**` | ui-programmer |
| `src/data/maps.js`, `src/data/scripts.js` | world-builder / writer |
| (none) | — |
| General architecture review | Primary |
