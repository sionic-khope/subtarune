# Castle seal orb 311 asset request

- Base: 295ef87725cd91dfc7a097300ae82828c7795a04; branch codex/castle-orb311.
- Deliverable: assets/props/castle-seal-orb.png, 128 × 128 RGBA, single static frame, pivot (64,64), scale 1.
- Scene: single-screen black castle chamber. Large obsidian sphere emits violet light and aura. Runtime owns light, directional shadows, pulse and particles.
- Reference roles: castle307_sealed_gate.png for obsidian sealed-sphere identity and purple castle palette; castle307_floor.png for pixel density and low-value material.
- Body target: circular sphere about 96px diameter; contained aura inside 128px frame. No pedestal, ground, cast shadow, text or cropped glow.
- Method: built-in image_gen, backend/model/usage unknown. Flat magenta generation followed by deterministic keyed extraction and nearest-neighbor export. No procedural source art.
- Ownership: asset lane writes only this visual source folder and the delivered prop; root owns integration and runtime validation.
