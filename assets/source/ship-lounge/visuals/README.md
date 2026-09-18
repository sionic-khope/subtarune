# Ship lounge generated visuals

Backend: built-in `image_gen`, three generation calls performed by the parent task. Exact underlying model, quality setting, token usage and cost are not exposed by the tool and are **unknown**, not zero. No OpenGateway/API fallback was used. Prompts are retained in `prompts.md`.

The latest user requested a grand purple door at the north end of a tall spaceship lounge, a freshly generated lounge floor, and travel through the control-room hatch. The ladder serves the return interaction. Existing character art is reused, not regenerated.

## Reproduce

From repository root, run `uv run tools/sprites/prepare_ship_lounge.py`. Pillow 12.3.0 is pinned by PEP 723. Raw files are copied without modification from the built-in generator. `export.json` contains raw/runtime SHA-256, actual image dimensions, alpha ranges, and pivots.

| Raw | Runtime | Mechanical operation |
|---|---|---|
| `floors-raw.png` (1254×1254) | `assets/tiles/ship_lounge_floor.png`, `ship_lounge_floor_alt.png`, `ship_lounge_runner.png`, `ship_lounge_runner_trim.png` | Four 627×627 full-bleed quadrants, nearest-neighbor to 32×32. Retain RGB and force opaque alpha, since the generated floor incorrectly contained alpha 5–252. No background removal or bbox fitting. |
| `grand-door-raw.png` (1145×1374) | `assets/props/ship_lounge_grand_door.png` (160×192) | Exact 5:6 aspect fits the whole canvas. Nearest-neighbor only, preserve generated alpha and every part of the frame. Bottom-center canvas pivot (80,192). |
| `ladder-raw.png` (1024×1536) | `assets/props/ship_lounge_ladder.png` (64×96) | Remove only alpha below 8, crop remaining alpha bounds, aspect-preserving nearest resize into 60×92 envelope. Center horizontally, bottom at y94; canvas pivot (32,96). No RGB color key. |

All runtime assets are single still frames, no animation or sequence. Tiles are walking surfaces; door and ladder are props whose collision/interaction is owned by the map code. This export script does not implement gameplay or alter existing sprites. No palette quantization, RGB black key, painting, or creative shape generation is performed.

## Visual checks and limits

- `tiles-repeat-3x3.png`: each final 32px tile repeated 3×3, enlarged 4× nearest. Main floor has continuous architectural panel repeats. The alternate tile has a different brass seam arrangement, so use as a deliberate accent rather than assuming all edges form an autotile set.
- The purple interior retains subtle vertical tonal repetition from the generated source; it is not claimed to be mathematically seamless. The trim variant is a narrow vertically repeating strip, not the outer edge of an arbitrary-width rug.
- `door-character-scale.png`: final door and a down-facing accepted `assets/sprites/junhee.png` frame at 0.5×, composed at the same logical pixel scale and enlarged 3×. Door has a clear complete frame and reads as a monumental exit beside the 45px character cell.
- `ladder-4x.png`: complete top hatch rim, six metal rungs and both feet are visible. Low-alpha external haze is removed without keying dark metal.
- Four opaque 32×32 outputs, 160×192 alpha door, and 64×96 alpha ladder decoded and passed dimension/alpha checks. Export script passes the programming no-excuse checker. In-engine layout and interaction QA remain the integration lane's responsibility.
- `maillard_hold_stairs.png` was inspected but rejected for this use: it is a small brown timber staircase, not a spaceship metal ladder.

Source generation ids: floors `exec-71b5bac1-2d67-4620-8e9a-85e7787ac345`; door `exec-e432d406-8887-47c7-9a18-ba5f56878d2d`; ladder `exec-5d601850-4bfc-4297-8ac8-34cb18c5f50c`.
