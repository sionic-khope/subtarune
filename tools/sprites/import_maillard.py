#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Package generated Maillard art; never repaint source pixels or quantize colors.

Run from repository root: uv run tools/sprites/import_maillard.py
The generate2dsprite processor supplies keyed raw-sheet-clean.png files first.
"""
from pathlib import Path

from PIL import Image

SOURCE = Path('assets/source/maillard-v1')


class EmptySpriteError(ValueError):
    pass


def sprite(folder: str, output: str, width: int) -> None:
    with Image.open(SOURCE / folder / 'raw-sheet-clean.png') as source:
        rgba = source.convert('RGBA')
        bounds = rgba.getchannel('A').getbbox()
        if bounds is None:
            raise EmptySpriteError(f'Empty generated sprite: {folder}')
        cropped = rgba.crop(bounds)
        size = (width, round(cropped.height * width / cropped.width))
        result = cropped.resize(size, Image.Resampling.NEAREST)
        destination = Path(output)
        destination.parent.mkdir(parents=True, exist_ok=True)
        result.save(destination)
        print(destination, size, 'source bbox', bounds)


def main() -> None:
    sprite('ship-mast', 'assets/props/maillard-ship.png', 768)
    sprite('island-logos', 'assets/props/platform-island.png', 384)
    with Image.open(SOURCE / 'deck-raw.png') as source:
        tile = source.crop((0, 0, source.width, source.height // 4))
        tile.resize((32, 32), Image.Resampling.NEAREST).save('assets/tiles/maillard_deck.png')
    with Image.open(SOURCE / 'sea-raw.png') as source:
        destination = Path('assets/backdrops/maillard_sea.png')
        destination.parent.mkdir(parents=True, exist_ok=True)
        source.resize((768, 512), Image.Resampling.NEAREST).save(destination)


if __name__ == '__main__':
    main()
