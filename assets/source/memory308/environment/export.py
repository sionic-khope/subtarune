#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow==12.3.0"]
# ///
# Install uv: https://docs.astral.sh/uv/getting-started/installation/
# Run from repository root: uv run assets/source/memory308/environment/export.py
"""Mechanically export the generated memory308 environment, preserving source colors."""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Final

from PIL import Image

ROOT: Final = Path(__file__).resolve().parent
ASSETS: Final = ROOT.parents[2]
NAMES: Final = ("floor", "moss", "lava", "lava_dark")


@dataclass(frozen=True, slots=True)
class ImageRecord:
    """Decoded PNG geometry and digest for the asset handoff."""

    path: str
    size: tuple[int, int]
    mode: str
    sha256: str
    alpha_range: tuple[int, int] | None


def _load(path: Path) -> Image.Image:
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        _ = image.load()
        return image.copy()


def _record(path: Path) -> ImageRecord:
    image = _load(path)
    histogram = image.getchannel("A").histogram() if image.mode == "RGBA" else []
    alpha_values = [value for value, count in enumerate(histogram) if count]
    alpha = (min(alpha_values), max(alpha_values)) if alpha_values else None
    return ImageRecord(str(path.relative_to(ASSETS.parent)), image.size, image.mode,
                       hashlib.sha256(path.read_bytes()).hexdigest(), alpha)


def main() -> None:
    """Export seven runtime PNGs, unaltered-source metadata and repeat previews."""
    source_door = _load(ROOT / "raw-door.png")
    assert source_door.mode == "RGBA"
    bounds = source_door.getchannel("A").getbbox()
    assert bounds is not None
    content = source_door.crop(bounds)
    content.thumbnail((94, 126), Image.Resampling.NEAREST)
    sampled_bounds = content.getchannel("A").getbbox()
    assert sampled_bounds is not None
    content = content.crop(sampled_bounds)
    door = Image.new("RGBA", (96, 128))
    placement = ((96 - content.width) // 2, 127 - content.height)
    door.paste(content, placement)
    door_path = ASSETS / "props/castle-memory-door.png"
    door.save(door_path)
    door.resize((192, 256), Image.Resampling.NEAREST).save(ROOT / "door-preview-2x.png")
    for name, color in (("dark", "#17141d"), ("light", "#eee4ef")):
        preview = Image.new("RGBA", door.size, color)
        preview.alpha_composite(door)
        preview.convert("RGB").save(ROOT / f"door-alpha-{name}.png")

    source_backdrop = _load(ROOT / "raw-backdrop.png")
    assert source_backdrop.mode in ("RGB", "RGBA")
    backdrop = source_backdrop.resize((480, 360), Image.Resampling.NEAREST)
    backdrop_path = ASSETS / "backdrops/castle307_right.png"
    backdrop.save(backdrop_path)

    atlas = _load(ROOT / "raw-tiles.png")
    assert atlas.mode in ("RGB", "RGBA")
    assert atlas.width == atlas.height and atlas.width % 2 == 0
    half = atlas.width // 2
    tiles: list[Image.Image] = []
    paths: list[Path] = []
    crops: list[tuple[int, int, int, int]] = []
    repeats = Image.new(atlas.mode, (192, 192))
    for index, name in enumerate(NAMES):
        x, y = index % 2 * half, index // 2 * half
        crop = (x, y, x + half, y + half)
        tile = atlas.crop(crop).resize((32, 32), Image.Resampling.NEAREST)
        path = ASSETS / "tiles" / f"castle307_{name}.png"
        tile.save(path)
        paths.append(path)
        crops.append(crop)
        tiles.append(tile)
        for row in range(3):
            for column in range(3):
                repeats.paste(tile, (index % 2 * 96 + column * 32, index // 2 * 96 + row * 32))
    mixed = Image.new(atlas.mode, (192, 192))
    for row in range(6):
        for column in range(6):
            index = (row + column) % 2 + (2 if column in (0, 5) else 0)
            mixed.paste(tiles[index], (column * 32, row * 32))
    for name, preview in (("repeat", repeats), ("mixed", mixed)):
        preview.save(ROOT / f"tiles-{name}-1x.png")
        preview.resize((768, 768), Image.Resampling.NEAREST).save(ROOT / f"tiles-{name}-4x.png")

    source_wall = _load(ROOT / "raw-wall.png")
    assert source_wall.mode in ("RGB", "RGBA") and source_wall.width == source_wall.height
    wall = source_wall.resize((32, 32), Image.Resampling.NEAREST)
    wall_path = ASSETS / "tiles/castle308_wall.png"
    wall.save(wall_path)
    wall_repeat = Image.new(wall.mode, (96, 96))
    for row in range(3):
        for column in range(3):
            wall_repeat.paste(wall, (column * 32, row * 32))
    wall_repeat.save(ROOT / "wall-repeat-1x.png")
    wall_repeat.resize((384, 384), Image.Resampling.NEAREST).save(ROOT / "wall-repeat-4x.png")

    runtime_paths = [door_path, backdrop_path, *paths, wall_path]
    records = [_record(path) for path in runtime_paths]
    assert records[0].size == (96, 128) and records[0].alpha_range == (0, 255)
    alpha_bounds = door.getchannel("A").getbbox()
    assert alpha_bounds is not None
    assert alpha_bounds[0] >= 1 and alpha_bounds[1] >= 1
    assert alpha_bounds[2] <= 95 and alpha_bounds[3] <= 127
    manifest = {
        "generator": "built-in image_gen", "model": "unknown", "cost": "unknown",
        "resample": "NEAREST", "alphaCleanup": False, "colorChanges": False,
        "quantization": False, "sharpening": False,
        "runtime": [asdict(record) for record in records],
        "sources": [asdict(_record(ROOT / name)) for name in
                    ("raw-door.png", "raw-backdrop.png", "raw-tiles.png", "raw-wall.png")],
        "door": {"sourceCrop": bounds, "sampledCrop": sampled_bounds, "contentSize": content.size,
                 "placement": placement, "pivot": [48, 128], "alphaBounds": alpha_bounds},
        "tiles": {"order": NAMES, "sourceCrops": crops},
        "wall": {"reference": "assets/tiles/gajaeman_castle_wall.png",
                 "generationId": "exec-0e814fc0-78a2-4556-beb6-c124c7fabd11",
                 "scope": "right1 and memory maps only; original wall PNG unchanged"},
        "verification": "All sources and runtime PNGs passed PNG CRC verify and full decode.",
        "supersedes": "castle307 backdrop and four tiles; historical castle307 sources unchanged",
        "repeatCaveat": "Visual repeats, not mathematically guaranteed seamless edges.",
    }
    _ = (ROOT / "export.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
