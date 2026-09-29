#!/usr/bin/env python3
"""트레일러 녹화 클립 점검용 밀착 인화(BUILD408): clips/<name>.webm → 길이 고친 fix_<name>.webm + <name>_sheet.png(초 표시 24칸)."""
import subprocess, sys, tempfile, glob, os
from PIL import Image, ImageDraw

D = 'assets/source/trailer408/clips'
for name in sys.argv[1:]:
    src, fix = f'{D}/{name}.webm', f'{D}/fix_{name}.webm'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c', 'copy', fix], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fix], capture_output=True, text=True).stdout.strip() or 0)
    step = max(1, round(dur / 24))
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', fix, '-vf', f'fps=1/{step},scale=320:-1', f'{tmp}/%03d.png'], check=True)
        fs = sorted(glob.glob(f'{tmp}/*.png'))
        ims = [Image.open(f).copy() for f in fs]
    if not ims: print(name, 'no frames'); continue
    W, H = ims[0].size; c = 6
    s = Image.new('RGB', (W * c, (H + 12) * ((len(ims) + c - 1) // c))); d = ImageDraw.Draw(s)
    for i, m in enumerate(ims):
        s.paste(m, ((i % c) * W, (i // c) * (H + 12) + 12)); d.text(((i % c) * W + 2, (i // c) * (H + 12)), f'{i * step}s', fill='#ff0')
    s.save(f'{D}/{name}_sheet.png'); print(name, f'dur={dur:.1f} step={step}')
