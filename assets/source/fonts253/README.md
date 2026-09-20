# Existing pixel fonts, self-hosted (BUILD253)

These are the exact previously referenced font releases, downloaded unmodified. No glyph, weight, size, or game font preset changed. Local CSS uses `font-display: swap` so initial paint does not wait for an external font stylesheet. NeoDunggeunmo is the current default; Galmuri11/14/9 preserve the existing alternate presets and fallback. WOFF/TTF duplicates and unused Galmuri mono/bold families were not needed by the game.

- NeoDunggeunmo1.601: https://cdn.jsdelivr.net/gh/neodgm/neodgm-webfont@1.601/neodgm/neodgm.woff2
- NeoDunggeunmo license: https://cdn.jsdelivr.net/gh/neodgm/neodgm-webfont@1.601/LICENSE.txt (`NeoDunggeunmo-LICENSE.txt`).
- Galmuri2.40.3: https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11.woff2 and the same directory's Galmuri14/Galmuri9 files.
- Galmuri license: https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/LICENSE.txt (`Galmuri-LICENSE.txt`).

Both distributions use SIL Open Font License1.1. See copied notices for copyright and reserved names. Runtime files are under `assets/fonts/`; `tools/deploy/package-site.sh` already includes WOFF2 files.
