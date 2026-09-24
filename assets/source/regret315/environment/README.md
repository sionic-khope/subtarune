# Regret315 indoor lower-level backdrop

The new left branch runs on elevated purple-stone bridges inside the dark castle. This asset supplies only the lower enclosed architecture underneath them: charcoal walls, recessed Gothic arches, buttresses descending through several tiers, sparse purple moss and violet mist. The playable bridge remains separately owned by the map lane. No foreground bridge, exterior castle, sky, character or interactive doorway is painted into the backdrop.

## Runtime contract

- Final: `assets/backdrops/castle-regret-depth.png`, 960×720 RGB, fully opaque. Map backdrop key: `castle-regret-depth`.
- Intended display: the existing 480×360 static castle-background viewport. This image is deliberately a background under the world tiles, with no collision or interaction.
- Source: `raw-backdrop.png`, 1448×1086 RGB. Built-in `image_gen`, one generation, actual model and charged cost unknown.
- Exact tool prompt: `prompt-used.txt`. The two attached style references were `assets/backdrops/castle307_right.png` and `assets/backdrops/castle306_distant.png`; both were viewed before the tool call. They supplied material, palette and pixel style, not the new composition.
- Original retained at `/Users/khope@sionic.ai/.codex/generated_images/01a0d14e-9115-7770-a73e-2de1bdab890c/exec-c4f5291c-9655-4de9-89df-520b0d4fe1fb.png`. The preserved source is byte-identical.

## Mechanical export

Run `sh assets/source/regret315/environment/export.sh` from the repository. The exporter keeps the complete 4:3 composition, reduces it with NEAREST to 480×360 logical pixels, then enlarges it with NEAREST to 960×720. `logical-preview.png` records the gameplay pixel density. There is no crop, repaint, palette quantization, blur, color alteration, alpha threshold or chroma-key removal. The opaque image workflow intentionally does not run the transparent sprite processor.

`export.json` records exact dimensions, modes, generation ID and SHA-256 digests. The script verifies PNG CRCs and complete pixel decoding for source and both outputs. `sh -n` passed. The source/original byte comparison passed. Final source file scans found no TODO, skipped test or placeholder markers.

## Visual inspection and limits

The asset author inspected the full final 960×720 PNG and the two adjacent castle backgrounds. It maintains the blackstone/violet family; progressively smaller lower arches and fading contrast establish indoor depth, while the empty shaft and mist remain darker than the stone walls. All sides are full bleed; no frame, sky, outdoor horizon, bridge or character is present. Small bright purple architectural accents remain near the perimeter, matching neighboring rooms.

This is a continuous single composition suitable for a fixed viewport and modest camera framing, not a mathematically seamless tiling texture. The intended static backdrop renderer avoids wrap seams. Map integration, foreground contrast under actual bridge placement and independent final visual approval belong to the map/root QA lanes. No map, renderer, registry or shared documentation was edited by this asset lane.

The automatic LSP hook reported its existing outside-request-cwd restriction on text/shell edits. Shell syntax and actual successful export provide the relevant checks for these files; no Python source file or runtime code was introduced.
