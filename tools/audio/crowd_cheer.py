#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy"]
# ///
# ─── How to run ───
# /usr/bin/python3 tools/audio/crowd_cheer.py   (루트에서) → assets/audio/sfx/crowd_cheer.mp3, crowd_roar.mp3
# ──────────────────
"""리듬 게임 관객 환호(BUILD180, 사용자: “박수소리 좀더 락 같은, 리믹스 노이즈도”): 대역통과 노이즈 함성(느린 랜덤 진폭) + 박수 임펄스 무리 + 휘파람 두 개를 섞은 2.6초 환호.
crowd_roar 는 같은 재료의 긴 함성(4초, 콤보 50 이상·곡 끝)."""
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
OUT = Path('assets/audio/sfx')
rng = np.random.default_rng(42)


def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); z = 0.0
    for i, v in enumerate(x): z = (1 - a) * v + a * z; y[i] = z
    return y


def bandnoise(n, lo, hi):
    x = rng.uniform(-1, 1, n)
    return onepole_lp(x, hi) - onepole_lp(x, lo)


def cheer(dur: float, big: bool) -> np.ndarray:
    n = int(SR * dur); t = np.linspace(0, dur, n, endpoint=False)
    # 함성: 200~2500Hz 노이즈, 0.25초 스웰 → 유지 → 마지막 0.8초 감쇠, 느린 랜덤 진폭
    roar = bandnoise(n, 200, 2500)
    env = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.8)
    am = 1 + 0.35 * np.sin(2 * np.pi * 1.7 * t + rng.uniform(0, 6)) * np.sin(2 * np.pi * 0.6 * t)
    roar = roar * env * am * (0.9 if big else 0.7)
    # 박수: 5ms 노이즈 버스트 무리, 박자 없이 흩뿌림(초당 45~70)
    claps = np.zeros(n)
    for _ in range(int(dur * (70 if big else 48))):
        s = int(rng.uniform(0.05, dur - 0.05) * SR); L = int(SR * rng.uniform(0.004, 0.008))
        burst = rng.uniform(-1, 1, L) * np.exp(-np.linspace(0, 6, L)) * rng.uniform(0.35, 1.0)
        claps[s:s + L] += burst[:max(0, min(L, n - s))]
    claps = onepole_lp(claps, 1800) - onepole_lp(claps, 400)
    # 휘파람 둘
    whistle = np.zeros(n)
    for start, f in ((0.5, 2100), (1.4, 1900)):
        s = int(start * SR); L = int(0.35 * SR)
        tt = np.linspace(0, 0.35, L, endpoint=False)
        whistle[s:s + L] += 0.18 * np.sin(2 * np.pi * (f + 400 * np.sin(2 * np.pi * 2.5 * tt)) * tt) * np.sin(np.pi * tt / 0.35)
    y = roar + claps * 0.9 + whistle
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.88
    y[:200] *= np.linspace(0, 1, 200); y[-int(SR * 0.2):] *= np.linspace(1, 0, int(SR * 0.2))
    return y


def write(name, y):
    with tempfile.TemporaryDirectory() as tmp:
        w = Path(tmp) / 'a.wav'
        with wave.open(str(w), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((y * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(w), '-ar', '44100', '-ac', '1', '-q:a', '2', str(OUT / f'{name}.mp3')], check=True)
    print('wrote', OUT / f'{name}.mp3', f'{len(y) / SR:.2f}s')


write('crowd_cheer', cheer(2.6, False))
write('crowd_roar', cheer(4.0, True))
