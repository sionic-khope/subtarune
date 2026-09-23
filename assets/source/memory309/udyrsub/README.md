# Udyrsub — memory309 dark-power combat palette

This source bundle is a dark-power palette continuation of `memory308-udyrsub`.
The final v2 source uses memory308's distinct neutral, raised-guard,
spread-claw-release, and recovery action order while retaining the dark
slate/charcoal whole-body palette. The rejected v1 source is preserved because
independent review found its action cells too close to neutral.

## Final deliverables

- `assets/enemies/udyrsub-battle.png` — 256×256 RGBA, 2×2 grid of 128px cells.
- `assets/enemies/udyrsub-front.png` — exact 128×128 copy of battle cell 0.

Cell order is neutral, raised guard anticipation, spread claw/spirit release,
and recovery. All cells share pivot `(64, 120)`. Their actual opaque bounds are
98, 98, 94, and 95 pixels tall, so the full-body requirement remains inside the
94–98px range with no boundary contact.

## Lineage and processing

`raw-v1-rejected-near-neutral-poses.png` and its prompt preserve the superseded
v1 attempt. `raw-v2-pose-repaired.png` is the accepted built-in image edit; it
uses the current dark-palette sheet as identity reference and the original 308
sheet as the exact four-pose reference. The exact v2 request and call lineage
are `prompt-v2-pose-repair.txt` and `imagegen-v2-pose-repair-call.json`.
`processed-v2/` is the strict shared-scale processor result. Its selected crop
boxes feed the final mechanical export: one common `99 / 479` scale, binary
alpha threshold at 128, NEAREST sampling, and alpha-bottom feet baseline at
y=120. The processor reports cell-local crop boxes, and the export applies each
cell's 627px source origin before cropping. No frame-specific resize, drawing,
or pose correction was performed.

`runtime-qc-v2-pose-repair.json` records the resulting grid geometry.
`animation-v2-pose-repair.gif`, `contact-preview-v2-pose-repair-2x.png`, and
`pose-comparison-memory308-to-v2.png` are source-only visual review artifacts.
