import json
from pathlib import Path
from typing import Final

import numpy as np
from PIL import Image

GAME: Final = Path(__file__).resolve().parents[2]
SOURCE: Final = GAME / "assets/source/lounge148/mario"

with Image.open(SOURCE / "reference.png") as reference:
    bounds = reference.getbbox()
    assert bounds == (50, 0, 350, 400)
    sprite = reference.crop(bounds).resize((42, 56), Image.Resampling.NEAREST)
    result = Image.new("RGBA", (64, 64))
    result.paste(sprite, (11, 4))
    source_colors = {tuple(color) for color in np.unique(np.asarray(reference).reshape(-1, 4), axis=0)}
    output_colors = {tuple(color) for color in np.unique(np.asarray(result).reshape(-1, 4), axis=0)}
    assert output_colors == source_colors
    assert result.getbbox() == (11, 4, 53, 60)
    result.save(GAME / "assets/sprites/mini_mario.png")
    preview = Image.new("RGBA", (512, 512), (30, 33, 43, 255))
    preview.alpha_composite(result.resize((512, 512), Image.Resampling.NEAREST))
    preview.save(SOURCE / "preview.png")
    contract = {"source": "assets/source/lounge148/mario/reference.png", "asset": "assets/sprites/mini_mario.png", "source_dimensions": reference.size, "source_bbox": bounds, "dimensions": result.size, "bbox": result.getbbox(), "pivot": [32, 60], "stillScale": 0.5, "world_height_at_character_scale_1_43": 40.04, "colors_preserved": True, "source_alpha_preserved": True, "animation": "single supplied side pose"}
    (SOURCE / "runtime-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    print(json.dumps(contract))
