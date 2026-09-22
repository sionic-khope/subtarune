#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["Pillow>=11"]
# ///
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/source/night-cliff289"


def main() -> None:
    sky = Image.open(SOURCE / "sky-raw.png").convert("RGB")
    sky.crop((85, 0, 1450, 1024)).resize(
        (480, 360), Image.Resampling.NEAREST
    ).save(ROOT / "assets/backdrops/jjajang_night_sea.png")
    cliff = Image.open(SOURCE / "cliff-raw.png").convert("RGBA")
    cliff.putalpha(cliff.getchannel("A").point([0] * 128 + [255] * 128))
    cliff = cliff.crop((61, 251, 1478, 792)).resize((704, 269), Image.Resampling.NEAREST)
    cliff.crop((0, 0, 704, 224)).save(ROOT / "assets/props/jjajang_night_cliff.png")
    print("Exported sky 480x360 and cliff 704x224; binary alpha, nearest sampling.")


if __name__ == "__main__":
    main()
