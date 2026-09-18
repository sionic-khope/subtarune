# Ship castle sequence visual exports

Raw artwork originates from the parent task's built-in `image_gen` calls. Exact underlying model, quality, token usage and cost are unknown because the tool did not expose them. No procedural art, RGB black key, or palette repaint is used.

Reproduce from repository root: `uv run tools/sprites/prepare_ship_castle.py`. Pillow 12.3.0 is pinned. `export.json` records source/runtime dimensions, full SHA-256, crop bounds, aspect-preserving content size and canvas placement.

Current exports:

| Source | Runtime | Contract |
|---|---|---|
| `purple-cord-raw.png` | `assets/props/purple_cord.png` | 48×32 canvas, complete purple cable loop and two-prong plug |
| `lounge-window-raw.png` | `assets/props/ship_lounge_window.png` | 96×144 canvas, complete two-pane metal window, original portrait aspect |
| `gajaeman-castle-corrected-raw.png` | `assets/props/gajaeman_castle.png` | 768×768 canvas; recognizable glasses, grin, parted hair and seated upper-body silhouette retained from the user's photo |
| `gajaeman-memory-{1..5}-corrected-raw.png` | `assets/illustrations/gajaeman-memory-{1..5}.png` | Five distinct opaque 384×216 panels; full composition, nearest-neighbor aspect fit, no content crop |

For transparent props, only generated alpha values below 8 are cleared to prevent diffuse outside haze from controlling the crop. Remaining alpha is preserved. The complete silhouette is resized with NEAREST into a canvas with 2px safety margins, bottom-centered. The window contains transparent left/right margins rather than horizontally stretching the narrow source. `*-preview.png` shows final runtime pixels, enlarged up to 4× with maximum side 768px.

The first generic face-castle draft was explicitly rejected by the user and is not exported. The corrected castle is based on `gajaeman-castle-reference.png` (original attachment `codex-clipboard-bd42e175-1181-4361-8013-a9bcdd6b1622.png`). No source-pixel painting or silhouette alteration was performed during export. The five initial sepia memory panels were also rejected and are not exported. The final five panels use the user-corrected cartoon identity in `memory-character-reference.png` (attachment `10a9ea21-ab2b-4c18-b034-d54f5a6fa9a3`) and yellow/brown memory style in `memory-yellow-style-reference.png` (attachment `40da0764-1508-476f-9558-ca2368ea8b97`). The reference images are copied unchanged and their hashes are recorded.

Memory sources are all 1672×941 RGB and remain fully opaque. Whole-image aspect fitting rounds to 384×216, so no letterbox padding is necessary for these sources. No isolated figure cropping, background removal, recoloring, or text repaint is performed. `memory-contact-runtime.png` assembles the five final files at 1× logical pixel scale in narrative order (three above, two below).

1. Happy livestream at a desk.
2. Hurt and surprised by hostile comments.
3. Hidden behind a doorway watching others socialize without him.
4. Crying on Twitch island while others depart by boat; the sign `트위치 섬` and Twitch symbols remain readable at final size.
5. Walking through a street while people mock him on their phones.

Cord source generation id: `exec-47e8dcc2-baed-42d0-b7a3-39311188dbf2`.
Window source generation id: `exec-e4975e5a-abdc-480d-ace1-e0dd12ec8789`.
Corrected castle source generation id: `exec-2b00355d-5b94-4afa-b264-cd748388d887`.
Corrected memories: `exec-a343a1c1-bc49-4106-abf4-ed685bc19c42` (1), `exec-01f3e16d-549a-4701-9cc4-e4eadd437736` (2), `exec-21615e0d-3650-4343-9fe5-0513b3b8b009` (3), `exec-6960f654-966d-48da-b311-41978cc3e6e5` (4), `exec-73d0f895-18b5-40ad-adf1-7bfd0b0ee2eb` (5).

Verification: cord/window/castle final pixels visually inspected; castle output 768×768 RGBA, alpha range 0–255, visible bounds (5,2,763,766), with safety margin on every canvas edge. Source photo was inspected alongside the final castle. All five final memory images have distinct hashes, decode as 384×216 RGB and are fully opaque; final-size contact sheet inspected for full composition, identity, emotional sequence and readable Twitch island marker. Standalone basedpyright 0 errors/0 warnings and programming no-excuse checker PASS. Game placement, timing, collision, castle-to-warship size and cinematic flow belong to integration QA, not this mechanical export.
