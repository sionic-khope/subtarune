# Exact generation prompts

These prompts were supplied verbatim by the parent task that performed the built-in `image_gen` calls. Reference paths identify the attached images' roles; they are not substitute attachments.

## Floors

Reference: `assets/tiles/youngcle_iron_blue.png`, material language and pixel density only.

Create a NEW production pixel-art floor TILESET for a luxurious lounge inside this industrial fantasy spaceship. Reference image is only the existing ship's pixel size/material language, do not simply recolor it. Single square 1024x1024 image, exactly four edge-to-edge equal square tiles in invisible 2x2 grid, each quadrant represents a 32x32 logical pixel tile enlarged with crisp nearest-neighbor square pixel clusters. TOP LEFT: repeatable calm midnight blue steel floor panels, subtle polished inset, thin muted antique-brass seams, restrained texture. TOP RIGHT: matching floor variation same value, seam placement and palette, a few different small highlights. BOTTOM LEFT: seamless rich dark royal purple/plum woven carpet interior for a broad lounge runner, very subtle small repeating diamond pattern, no surrounding border. BOTTOM RIGHT: same dark purple carpet with a narrow antique-gold straight vertical trim on both left and right edges, repeatable vertically. Top-down orthographic flat floor planes, no perspective, no objects, no text, no labels, no shadows, no padding or background, every pixel full opaque floor. This is an engine tileset not a room illustration. Quiet surfaces for readable small game characters. FOUR independent full-bleed tiles touching cleanly at x512,y512; no separator lines. No noisy photorealistic texture, no smooth gradients, no dithering.

## Grand door

Reference: `assets/props/ship_gate.png`, material language and front-facing prop camera only.

Generate ONE standalone majestic PURPLE DOUBLE DOOR sprite for the north wall of a luxurious lounge inside an extravagant industrial fantasy spaceship. Use reference only for crisp low-resolution pixel-art material language and front-facing game prop camera. NEW design: tall rich royal violet sealed double doors, elegant dark brass frame with art-deco stepped arch, tiny restrained cyan lamp details linking it to the ship, prominent small central geometric lock emblem, tasteful gold inlay. A grand important exit, not horror/medieval dungeon. Front-facing symmetrical upright sprite, slight visible top face only, no isometric rotation, bottom horizontal threshold. Intended runtime bounding box roughly160px wide192px tall, low-resolution chunky pixel clusters and dark clear outlines, restrained 12-20colorpalette. Fill central70percent of a portrait canvas with the complete door and frame, generous margins all sides. Exactly one door, CLOSED state, no room or background, no characters, no words or Korean labels, no signage, no detached glowing effects, no ground shadow. Background entirely solid flat #FF00FF for clean transparency extraction. Keep all door/frame pixels away from canvas edges.

## Return ladder

Reference: `assets/props/ship_gate.png`, spaceship metalwork and pixel density only.

Create ONE small upright wall-mounted metal ladder sprite leading into a round overhead access hatch for a top-down pixel RPG industrial luxury spaceship lounge. Reference image is only the existing spaceship metalwork and low-resolution pixel-art style. Front-facing, compact64px wide96px tall intended runtime sprite; brushed dark blue gunmetal rails, six or seven bright steel rungs, small antique-brass brackets, tiny teal indicator on top. At top, a short rim of the dark round access shaft framed in metal, visibly a ladder to climb UP, not a door, not a freestanding staircase. Complete rails and bottom feet inside margins. Simple readable chunky low-resolution pixel clusters, crisp dark contour, no smooth gradients, no real photo texture. Exactly one coherent ladder+hatch object centered, ample flat solid #FF00FF background margins, no floor, no characters, no text, no decorative sparks, no ground shadow.
