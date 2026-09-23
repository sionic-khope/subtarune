#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
uv run --with pillow --with numpy python - <<'PY'
import json
import struct
import zlib
from pathlib import Path
import numpy as np
from PIL import Image

root = Path('assets/source/choimis-kart299')
report = {}
preview = Image.new('RGBA', (240, 160), (45, 45, 45, 255))
for index, name in enumerate(('dao', 'bazzi')):
    source = root / name / 'processed' / 'projectile-1.png'
    image = Image.open(source).convert('RGBA').crop((0, 4, 48, 44))
    pixels = np.asarray(image).copy()
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    pixels[pixels[:, :, 3] == 0] = 0
    image = Image.fromarray(pixels)
    target = Path(f'assets/props/choimis-{name}-kart.png')
    image.save(target)
    data = target.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    offset = 8
    chunks = 0
    while offset < len(data):
        length = struct.unpack('>I', data[offset:offset + 4])[0]
        chunk = data[offset + 4:offset + 8 + length]
        checksum = struct.unpack('>I', data[offset + 8 + length:offset + 12 + length])[0]
        assert zlib.crc32(chunk) & 0xffffffff == checksum
        offset += length + 12
        chunks += 1
    Image.open(target).verify()
    bbox = image.getbbox()
    assert bbox and 0 < bbox[0] < bbox[2] < 48 and 0 < bbox[1] < bbox[3] < 40
    alpha = pixels[:, :, 3]
    opaque = alpha >= 128
    lum = (pixels[:, :, 0] * .299 + pixels[:, :, 1] * .587 + pixels[:, :, 2] * .114) / 255
    edges = opaque & ~(np.roll(opaque, 1, 0) & np.roll(opaque, -1, 0) & np.roll(opaque, 1, 1) & np.roll(opaque, -1, 1))
    white = opaque & ((lum >= .5) | edges)
    mono = np.zeros_like(pixels)
    mono[:, :, :3] = np.where(white[:, :, None], 255, 0)
    mono[:, :, 3] = alpha
    monochrome = Image.fromarray(mono)
    monochrome.save(root / name / 'whiteSprite-preview.png')
    preview.alpha_composite(image.resize((96, 80), Image.Resampling.NEAREST), (index * 120, 0))
    preview.alpha_composite(monochrome.resize((96, 80), Image.Resampling.NEAREST), (index * 120, 80))
    Image.new('RGBA', image.size, (0, 0, 0, 255)).save(root / name / 'preview-background.png')
    raw = Image.open(root / name / 'raw.png').convert('RGBA')
    report[name] = {'file': str(target), 'canvas': [48, 40], 'content_bbox': bbox, 'pivot': [24, 20], 'frame_count': 1, 'unique_poses': 1, 'duration_ms': None, 'loop': False, 'direction': 'lower-left three-quarter', 'raw_dimensions': list(raw.size), 'raw_has_transparency': raw.getextrema()[3][0] == 0, 'alpha_values': np.unique(alpha).tolist(), 'opaque_pixel_count': int(opaque.sum()), 'png_crc_chunks_verified': chunks, 'png_decode_verified': True, 'full_containment': True, 'magenta_pixel_count': int(np.sum(opaque & (pixels[:, :, 0] > 200) & (pixels[:, :, 1] < 80) & (pixels[:, :, 2] > 200))), 'monochrome_white_pixels': int(white.sum())}
preview.save(root / 'preview-color-monochrome-2x.png')
(root / 'qc.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
PY
