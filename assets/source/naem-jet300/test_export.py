# /// script
# requires-python = ">=3.13"
# dependencies = ["pillow", "pytest"]
# ///
# Run: uv run --with pillow --with pytest pytest --import-mode=importlib assets/source/naem-jet300/test_export.py
from __future__ import annotations

from PIL import Image

from .export import trim_resize


def test_visible_alpha_trim_preserves_pixels_and_requested_margin() -> None:
    source = Image.new("RGBA", (20, 20))
    source.paste((20, 40, 60, 255), (5, 6, 15, 16))
    source.putpixel((1, 1), (100, 0, 100, 1))
    output, box = trim_resize(source, None, 2)
    assert box == (3, 4, 17, 18)
    assert output.size == (14, 14)
    assert output.getpixel((2, 2)) == (20, 40, 60, 255)
    assert output.getpixel((0, 0)) == (0, 0, 0, 0)


def test_height_resize_preserves_aspect_and_uses_only_source_colors() -> None:
    source = Image.new("RGBA", (20, 20))
    source.paste((20, 40, 60, 255), (5, 2, 13, 18))
    source.putpixel((8, 8), (200, 100, 50, 255))
    output, box = trim_resize(source, 32)
    assert box == (5, 2, 13, 18)
    assert output.size == (16, 32)
    assert set(output.get_flattened_data()) <= set(source.get_flattened_data())
