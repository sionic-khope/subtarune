#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy"]
# ///
# ─── How to run ───
# /usr/bin/python3 tools/rhythm/chart.py assets/video/noamtori.mp4 --title "방가방가 노앰토리" --artist "무언가가큰징징이" --out assets/rhythm/noamtori.json
# ──────────────────
"""리듬 게임 차트 생성기(BUILD178): 곡(영상) 오디오에서 onset(스펙트럼 플럭스)을 뽑아 박자 격자에 맞춰 가운데 두 칸(L/R) 노트를 만든다.
- 탭 노트: onset 을 1/2 박으로 양자화, 0.2초 안 겹침은 버림(밀도 ≤ 초당 2.5), 칸은 스펙트럼 무게중심(높은 소리 R, 낮은 소리 L)으로 — 멜로디 흐름을 따라 좌우가 갈린다.
- 홀드 노트: 다음 onset 까지 1.25박 이상 비고 그 사이 에너지가 유지되면 hold(길이 = 간격 − 0.5박, 0.4초 이상).
- 사이드(자동 연출): drums = 저역(<150Hz) onset, vocal = 중역(200~2000Hz) onset 을 0.35초 간격으로 솎음.
numpy 만 쓴다(librosa 없음). 오디오는 ffmpeg 로 22.05kHz 모노 wav 로 뽑아 읽는다."""
from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 22050
N_FFT = 1024
HOP = 256


def load_mono(path: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'a.wav'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'wav', str(wav)], check=True)
        with wave.open(str(wav), 'rb') as w:
            frames = w.readframes(w.getnframes())
            data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    return data


def stft_mag(x: np.ndarray) -> np.ndarray:
    win = np.hanning(N_FFT).astype(np.float32)
    n = 1 + max(0, (len(x) - N_FFT) // HOP)
    frames = np.lib.stride_tricks.as_strided(x, shape=(n, N_FFT), strides=(x.strides[0] * HOP, x.strides[0]))
    return np.abs(np.fft.rfft(frames * win, axis=1))


def flux(mag: np.ndarray, lo_hz: float = 0, hi_hz: float = SR / 2) -> np.ndarray:
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    band = (freqs >= lo_hz) & (freqs < hi_hz)
    logm = np.log1p(mag[:, band] * 20)
    d = np.diff(logm, axis=0, prepend=logm[:1])
    env = np.maximum(d, 0).sum(axis=1)
    k = np.array([0.25, 0.5, 0.25])
    return np.convolve(env, k, mode='same')


def pick_peaks(env: np.ndarray, min_gap_s: float, delta: float) -> list[int]:
    fps = SR / HOP
    win = int(fps * 1.0)
    peaks = []
    last = -10 ** 9
    for i in range(3, len(env) - 3):
        if env[i] < env[i - 3:i + 4].max():
            continue
        local = env[max(0, i - win):i + win]
        thr = local.mean() + delta * local.std()
        if env[i] <= thr:
            continue
        if i - last < min_gap_s * fps:
            continue
        peaks.append(i); last = i
    return peaks


def estimate_bpm(env: np.ndarray) -> float:
    fps = SR / HOP
    e = env - env.mean()
    ac = np.correlate(e, e, mode='full')[len(e) - 1:]
    lo, hi = int(fps * 60 / 200), int(fps * 60 / 60)
    lag = lo + int(np.argmax(ac[lo:hi]))
    bpm = 60 * fps / lag
    while bpm < 80: bpm *= 2
    while bpm > 170: bpm /= 2
    return round(bpm, 2)


def beat_phase(env: np.ndarray, bpm: float) -> float:
    fps = SR / HOP
    period = 60 / bpm
    best, best_phase = -1, 0.0
    for phase in np.arange(0, period, 0.01):
        idx = ((np.arange(phase, len(env) / fps, period)) * fps).astype(int)
        idx = idx[idx < len(env)]
        s = env[idx].sum()
        if s > best: best, best_phase = s, float(phase)
    return best_phase


def centroid(mag: np.ndarray, i: int) -> float:
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    m = mag[max(0, i - 1):i + 2].mean(axis=0)
    return float((freqs * m).sum() / (m.sum() + 1e-9))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('media'); ap.add_argument('--title', required=True); ap.add_argument('--artist', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--video'); ap.add_argument('--max-per-sec', type=float, default=2.5)
    ap.add_argument('--delta', type=float, default=0.9)
    a = ap.parse_args()
    x = load_mono(Path(a.media))
    duration = len(x) / SR
    mag = stft_mag(x)
    fps = SR / HOP
    full = flux(mag)
    bpm = estimate_bpm(full)
    beat = 60 / bpm
    phase = beat_phase(full, bpm)
    onsets = pick_peaks(full, 0.2, a.delta)
    # 1/2 박 양자화 + 밀도 제한
    notes = []
    last_t = -9
    for i in onsets:
        t = i / fps
        q = phase + round((t - phase) / (beat / 2)) * (beat / 2)
        if abs(q - t) > 0.09: q = t
        if q - last_t < 1 / a.max_per_sec: continue
        if q < 1.0 or q > duration - 0.8: continue
        notes.append({'t': round(q, 3), 'c': centroid(mag, i), 'i': i})
        last_t = q
    # 좌우 배분: 무게중심을 곡 전체 중앙값으로 나눠 절반씩(높은 소리 R), 같은 칸 3연속을 넘으면 강제로 반대 칸 — 한쪽 칸에만 쏟아지지 않게(사용자 지적)
    med = float(np.median([n['c'] for n in notes])) if notes else 0.0
    run = 0; last_lane = None
    for n in notes:
        lane = 'R' if n['c'] > med else 'L'
        if lane == last_lane:
            run += 1
            if run >= 3: lane = 'L' if lane == 'R' else 'R'; run = 0
        else: run = 0
        n['lane'] = lane; last_lane = lane
        n.pop('c', None)
    # 홀드: 다음 노트까지 1.25박 이상 비고 그 사이 에너지 유지
    rms = np.sqrt(np.convolve(x * x, np.ones(HOP) / HOP, mode='same'))[::HOP]
    for k, n in enumerate(notes):
        nxt = notes[k + 1]['t'] if k + 1 < len(notes) else duration
        gap = nxt - n['t']
        if gap >= 1.25 * beat:
            s0, s1 = int(n['t'] * fps), int(min(len(rms) - 1, (n['t'] + gap - 0.5 * beat) * fps))
            if s1 > s0 and rms[s0:s1].mean() > 0.35 * rms[max(0, s0 - 2):s0 + 3].max():
                n['dur'] = round(max(0.4, gap - 0.5 * beat), 3)
    for n in notes: n.pop('i', None)
    drums = [round(i / fps, 3) for i in pick_peaks(flux(mag, 0, 150), 0.2, 0.8) if 1.0 < i / fps < duration - 0.5]
    vocal = [round(i / fps, 3) for i in pick_peaks(flux(mag, 200, 2000), 0.35, 0.9) if 1.0 < i / fps < duration - 0.5]
    chart = {'id': Path(a.out).stem, 'title': a.title, 'artist': a.artist, 'video': a.video or f'assets/video/{Path(a.media).name}',
             'duration': round(duration, 2), 'bpm': bpm, 'offset': round(phase, 3), 'notes': notes, 'side': {'drums': drums, 'vocal': vocal}}
    Path(a.out).write_text(json.dumps(chart, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    holds = sum(1 for n in notes if 'dur' in n)
    print(f"{a.out}: {duration:.1f}s bpm {bpm} notes {len(notes)} (holds {holds}, {len(notes) / duration:.2f}/s) drums {len(drums)} vocal {len(vocal)}")


if __name__ == '__main__':
    main()
