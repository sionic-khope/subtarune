# Independent asset review

Scope: final PNG cells/sheet, decoded GIF frames/timing, and runtime-contract.json. Read-only review; no generation, artwork edits, or gameplay integration. This is a candidate asset review, not user approval or game QA.

## Verified

- Final sheet decodes as RGBA 256×256, with 4×4 cells of 64×64. Row order visually matches down/front, up/back, left, right.
- Bottom two rows match the previous `og-walk-test-20260914/pixel-final/sheet-transparent.png` RGBA bytes exactly. Source RGBA SHA256: `9a0418736f071f436895f20cd6351ff96b43c2ea0ea210a4591881826b52fdc8`.
- All 16 final cells contain pixels, remain inside cell boundaries, and have binary alpha {0,255}. Bounding-box bottoms are all y=60; visible widths are 29–39 px and heights 54–56 px. No final-cell edge clipping is visible. This does not independently prove that nothing was cropped from an unseen original pose.
- Each delivered directional GIF decodes into 4 frames at 150 ms each, 600 ms total, with infinite loop flag 0. These values agree with the contract. Decoded individual frames were examined via the final contact sheet; no real-time game playback was performed.
- Up frames show the back of the head/body, not a front face. Front/back retain the short dark hair, large belly, camouflage top, and dark footwear. No combat motion or game registration was added.

## Visible limitations

- Four distinct RGBA images do not mean four distinct key poses. Front/back use a rest-like return plus two stepping phases; existing side rows retain the previously disclosed two-main-pose-style loop. The side bytes were deliberately preserved rather than repaired or regenerated.
- The new front fourth frame changes the smile/teeth and head silhouette slightly relative to the other front frames. Its torso/arm silhouette is narrower. This reads as the same broad character, but is not exact frame-to-frame face/volume lock.
- Small magenta/purple edge specks remain visible around some new head/leg outlines on a dark background. Binary alpha proves transparency format, not perfect chroma cleanup.
- Pixel texture is relatively fine/dithered at enlargement; this should not be claimed as proven identical to all approved in-game character pixel density.

Verdict: geometry, direction mapping, side preservation, and GIF timing PASS. Visual result is a usable inspection candidate with the above disclosed polish limitations, not a clean visual-fidelity approval. No paid retry is authorized by this review.
