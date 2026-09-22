# Moonlit cliff scenery

Generated with the built-in image generator on 2026-09-22. The original PNGs are preserved here; these are scenery sprites, not a screenshot standing in for the playable map.

Sky direction: quiet midnight navy, sparse sharp pixel stars, one round ivory moon high at the right, dark ocean across the lower portion with broken moonlight reflection. No land, characters, UI, text, pink clouds or boats.

Cliff direction: one wide grey-blue rocky shelf, broad flat top, sheer cracked vertical rock face, blunt irregular right tip, transparent background; no characters, sky, vegetation, text or UI.

Re-export: `uv run tools/assets/export_night289.py`. Only deterministic cropping, alpha thresholding and nearest-neighbor scaling are used. Sky uses a 4:3 crop to retain the round moon. Cliff keeps uniform scale and crops the unseen bottom of the rock face. Outputs: `assets/backdrops/jjajang_night_sea.png` (480×360), `assets/props/jjajang_night_cliff.png` (704×224).

The collision and actor feet must follow the visible top plane, not the rectangular image bounds. Camera frames and source dialogue remain in the map/cutscene source files.
