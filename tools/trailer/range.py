#!/usr/bin/env python3
"""트레일러 클립 구간 확인(BUILD408): python3 tools/trailer/range.py <clip> <from> <to> [fps] → clips/<clip>_<from>.png(시각 표시 격자)."""
import subprocess, sys, tempfile, glob
from PIL import Image, ImageDraw
name, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]); fps = float(sys.argv[4]) if len(sys.argv) > 4 else 4
D = 'assets/source/trailer408/clips'
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', f'{D}/fix_{name}.webm', '-vf', f'fps={fps},scale=320:-1', f'{tmp}/%03d.png'], check=True)
    ims = [Image.open(f).copy() for f in sorted(glob.glob(f'{tmp}/*.png'))]
W, H = ims[0].size; c = 6
s = Image.new('RGB', (W * c, (H + 12) * ((len(ims) + c - 1) // c))); d = ImageDraw.Draw(s)
for i, m in enumerate(ims):
    s.paste(m, ((i % c) * W, (i // c) * (H + 12) + 12)); d.text(((i % c) * W + 2, (i // c) * (H + 12)), f'{a + i / fps:.2f}s', fill='#ff0')
s.save(f'{D}/{name}_{a:g}.png'); print(f'{D}/{name}_{a:g}.png')
