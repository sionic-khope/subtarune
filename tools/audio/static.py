#!/usr/bin/env python3
# /usr/bin/python3 tools/audio/static.py  → assets/audio/sfx/static_loop.mp3 (2.0s 루프), static_burst.mp3 (0.22s)
"""방송 잡음(BUILD183 사용자 “리듬을 잘 맞춰야 노래가 나오고 못 맞추면 노래가 지직거리면서 덜 나온다”):
- static_loop: 대역 노이즈(800~6000Hz) + 불규칙 크래클 임펄스, 끝을 크로스페이드해 이어 틀 수 있는 2초 루프. 씬이 신호 품질(1−signal)에 비례해 볼륨을 올린다.
- static_burst: MISS 순간 ‘지직’ 0.22초(급한 어택, 크래클 진하게)."""
import subprocess, tempfile, wave
from pathlib import Path
import numpy as np

SR = 44100
OUT = Path('assets/audio/sfx')


def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); z = 0.0
    for i, v in enumerate(x): z = (1 - a) * v + a * z; y[i] = z
    return y


def band_noise(n, rng, lo=800, hi=6000):
    x = rng.uniform(-1, 1, n)
    x = onepole_lp(x, hi) - onepole_lp(x, lo)
    return x / (np.max(np.abs(x)) + 1e-9)


def crackle(n, rng, density, strength):
    y = np.zeros(n)
    for i in rng.choice(n, size=int(n * density), replace=False):
        L = min(n - i, int(rng.uniform(20, 160)))
        y[i:i + L] += rng.uniform(-1, 1) * strength * np.exp(-np.linspace(0, 6, L))
    return y


def write(name, y, fade=0.01):
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.85
    n = int(SR * fade); y[:n] *= np.linspace(0, 1, n); y[-n:] *= np.linspace(1, 0, n)
    with tempfile.TemporaryDirectory() as tmp:
        w = Path(tmp) / 'a.wav'
        with wave.open(str(w), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((y * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(w), '-ar', '44100', '-ac', '1', '-q:a', '3', str(OUT / f'{name}.mp3')], check=True)
    print('wrote', OUT / f'{name}.mp3', f'{len(y) / SR:.2f}s')


rng = np.random.default_rng(3)
n = int(SR * 2.0)
loop = 0.55 * band_noise(n, rng) * (0.7 + 0.3 * np.abs(np.sin(np.linspace(0, 37, n)))) + crackle(n, rng, 0.0009, 1.0)
xf = int(SR * 0.05)
loop[:xf] = loop[:xf] * np.linspace(0, 1, xf) + loop[-xf:] * np.linspace(1, 0, xf)
loop = loop[:-xf]
write('static_loop', loop, fade=0.002)
m = int(SR * 0.22)
burst = band_noise(m, rng, 600, 7000) * np.exp(-np.linspace(0, 3.5, m)) + 1.4 * crackle(m, rng, 0.004, 1.0)
write('static_burst', burst, fade=0.004)
