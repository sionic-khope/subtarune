#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy"]
# ///
# ─── How to run ───
# /usr/bin/python3 tools/audio/guitar.py   (루트에서) → assets/audio/sfx/guitar_*.mp3
# ──────────────────
"""리듬 게임 일렉 기타 소리(BUILD180, 사용자: “게인 세고 리얼한 일렉 사운드”): 오실레이터가 아니라 Karplus-Strong 현(노이즈 픽 + 지연선 피드백)을
고게인 tanh 디스토션 → 캐비닛 로우패스(약 3.4kHz, 2단) → 짧은 룸(40ms·0.22)에 통과시킨 샘플. 파워코드는 근음+5도+옥타브를 살짝 디튠해 합친다.
- guitar_c4/g4/a4: 작은별 사운드 체크 음(단음 0.7초)
- guitar_pc_e/guitar_pc_a: GREAT 스트로크(E·A 파워코드 0.42초, 번갈아)
- guitar_mute: 팜뮤트 척(MISS), guitar_scratch: 노트 없는 데 긁는 툭툭, guitar_feedback: 곡 시작 전 앰프 피드백 지이이잉(2.2초)
- guitar_sustain: 홀드 노트를 누르는 동안 쭈우욱 유지되는 파워코드(3.2초, 느린 감쇠·피드백 배음이 서서히 올라옴) — 떼면 씬이 줄여 끊는다"""
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
OUT = Path('assets/audio/sfx')


def string(freq: float, dur: float, decay: float = 0.996, brightness: float = 0.5, pick: float = 1.0, rng=None) -> np.ndarray:
    rng = rng or np.random.default_rng(int(freq * 100) % 9973)
    n = int(SR * dur)
    period = SR / freq
    L = int(period)
    frac = period - L
    buf = (rng.uniform(-1, 1, L + 1) * pick)
    # 픽 위치 느낌: 버퍼를 살짝 로우패스
    buf = np.convolve(buf, [0.5, 0.5], mode='same')
    out = np.zeros(n)
    y1 = 0.0
    for i in range(n):
        j = i % (L + 1)
        k = (i + 1) % (L + 1)
        s = buf[j]
        out[i] = s
        # 지연선 갱신: 이웃 평균(로우패스) × 감쇠, 분수 지연은 선형 보간
        nxt = (1 - frac) * buf[k] + frac * buf[(k + 1) % (L + 1)]
        buf[j] = decay * ((1 - brightness) * s + brightness * 0.5 * (s + nxt))
    return out


def onepole_lp(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x); z = 0.0
    for i, v in enumerate(x):
        z = (1 - a) * v + a * z; y[i] = z
    return y


def amp(x: np.ndarray, gain: float = 28.0, cab: float = 3400.0) -> np.ndarray:
    # 프리 하이패스(진흙 제거) → 고게인 tanh → 캐비닛 로우패스 2단 → 룸
    hp = x - onepole_lp(x, 120)
    d = np.tanh(hp * gain) * 0.9 + np.tanh(hp * gain * 0.35) * 0.1
    y = onepole_lp(onepole_lp(d, cab), cab * 1.4)
    room = np.zeros_like(y); dly = int(SR * 0.04); room[dly:] = y[:-dly] * 0.22
    return y + room


def finish(y: np.ndarray, fade: float = 0.03) -> np.ndarray:
    n = int(SR * fade)
    y = y.copy()
    y[-n:] *= np.linspace(1, 0, n)
    y[:64] *= np.linspace(0, 1, 64)
    return y / (np.max(np.abs(y)) + 1e-9) * 0.89


def power_chord(root: float, dur: float) -> np.ndarray:
    parts = [string(root * m * d, dur, decay=0.9965, brightness=0.55, pick=0.9) for m, d in ((1, 1.0), (1.5, 1.002), (2, 0.998))]
    x = sum(parts) / 3
    return amp(x, gain=32)


def note(freq: float, dur: float) -> np.ndarray:
    x = string(freq, dur, decay=0.9975, brightness=0.5)
    x = x + 0.35 * string(freq * 2.003, dur, decay=0.995, brightness=0.6)
    return amp(x, gain=26)


def mute(freq: float, dur: float) -> np.ndarray:
    x = string(freq, dur, decay=0.94, brightness=0.9, pick=1.0)
    return amp(x, gain=30, cab=2200)


def scratch(dur: float) -> np.ndarray:
    rng = np.random.default_rng(7)
    x = rng.uniform(-1, 1, int(SR * dur)) * np.exp(-np.linspace(0, 9, int(SR * dur)))
    x = x + 0.5 * string(82.4, dur, decay=0.8, brightness=0.95)
    return amp(x, gain=18, cab=2600)


def feedback(dur: float) -> np.ndarray:
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    f0 = 82.4
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t)
    swell = np.minimum(1, t / 0.9) ** 2
    x = 0.5 * np.sin(2 * np.pi * f0 * vib * t) * (1 - swell * 0.6) + swell * (0.6 * np.sin(2 * np.pi * f0 * 8 * vib * t) + 0.25 * np.sin(2 * np.pi * f0 * 12 * vib * t))
    y = amp(x, gain=20, cab=3000)
    return y * np.minimum(1, t / 0.15)


def write(name: str, y: np.ndarray, fade: float = 0.03) -> None:
    y = finish(y, fade)
    with tempfile.TemporaryDirectory() as tmp:
        w = Path(tmp) / 'a.wav'
        with wave.open(str(w), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
            f.writeframes((y * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(w), '-ar', '44100', '-ac', '1', '-q:a', '2', str(OUT / f'{name}.mp3')], check=True)
    print('wrote', OUT / f'{name}.mp3', f'{len(y) / SR:.2f}s')


write('guitar_c4', note(261.63, 0.7))
write('guitar_g4', note(392.0, 0.7))
write('guitar_a4', note(440.0, 0.7))
write('guitar_pc_e', power_chord(164.81, 0.42))
write('guitar_pc_a', power_chord(220.0, 0.42))
write('guitar_mute', mute(82.41, 0.12), fade=0.02)
write('guitar_scratch', scratch(0.07), fade=0.01)
write('guitar_feedback', feedback(2.2), fade=0.25)


def sustain(root: float, dur: float) -> np.ndarray:
    parts = [string(root * m * d, dur, decay=0.9992, brightness=0.45, pick=0.9) for m, d in ((1, 1.0), (1.5, 1.002), (2, 0.998))]
    x = sum(parts) / 3
    t = np.linspace(0, dur, len(x), endpoint=False)
    bloom = np.minimum(1, np.maximum(0, (t - 0.6) / 1.4)) * 0.35 * np.sin(2 * np.pi * root * 4 * (1 + 0.003 * np.sin(2 * np.pi * 5 * t)) * t)
    return amp(x + bloom, gain=30)


write('guitar_sustain', sustain(164.81, 3.2), fade=0.3)
