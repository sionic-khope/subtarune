#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run export.py
# ──────────────────
"""Export generated decor at native map resolution without aspect distortion."""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Final

from PIL import Image

GAME: Final = Path('/tmp/subtarune-cats149')
PROPS: Final = (
    ('speaker', 1, 64, 128), ('truss', 2, 224, 112),
    ('curtain', 3, 96, 176), ('control', 4, 96, 64),
)


def main() -> None:
    """Fit once with NEAREST then trim padding, retaining original art ratios."""
    root = Path(__file__).resolve().parent
    sizes: dict[str, list[int]] = {}
    for name, index, max_width, max_height in PROPS:
        with Image.open(root / 'processed' / f'single-{index}.png') as frame:
            bounds = frame.getbbox()
            assert bounds is not None
            art = frame.crop(bounds)
            scale = min(max_width / art.width, max_height / art.height)
            dimensions = (round(art.width * scale), round(art.height * scale))
            native = art.resize(dimensions, Image.Resampling.NEAREST)
            native.putalpha(native.getchannel('A').point(lambda alpha: 255 if alpha >= 64 else 0))
            output = root / f'editor-union-{name}.png'
            native.save(output)
            shutil.copy2(output, GAME / 'assets/props' / output.name)
            sizes[name] = [*dimensions]
    shutil.copy2(GAME / 'assets/props/youngcle6_walls.png', root / 'native-wall-source.png')
    with Image.open(root / 'native-wall-source.png') as wall:
        panel = wall.crop((32, 24, 160, 100))
        panel.save(root / 'editor-union-wall-panel.png')
    shutil.copy2(root / 'editor-union-wall-panel.png', GAME / 'assets/props/editor-union-wall-panel.png')
    (root / 'runtime-contract.json').write_text(json.dumps({
        'generator': 'builtin imagegen',
        'raw': 'processed/raw-sheet.png',
        'raw_identifier': 'exec-c7c1667a-5075-445f-ba09-5fb914949286.png',
        'dimensions': sizes, 'transparent_padding': [0, 0],
        'resize': 'uniform contain with NEAREST', 'final_alpha_threshold': 64,
        'wall_source': 'native-wall-source.png', 'wall_crop': [32, 24, 128, 76],
        'wall_pixels_unchanged': True,
    }, indent=2) + '\n')


if __name__ == '__main__':
    main()
