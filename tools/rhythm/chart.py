#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy"]
# ///
# ─── How to run ───
# /usr/bin/python3 tools/rhythm/chart.py assets/video/noamtori.mp4 --title "방가방가 노앰토리" --artist "무언가가큰징징이" --out assets/rhythm/noamtori.json   (영상은 18.2초 ‘만원 주면~’부터 잘라둠: ffmpeg -ss 18.2 … libx264 crf24 aac128k)
# /usr/bin/python3 tools/rhythm/chart.py assets/video/bojipam.mp4 --title "보X팜" --artist "MC노라니" --out assets/rhythm/bojipam.json
# ──────────────────
"""리듬 게임 차트 생성기(BUILD178): 곡(영상) 오디오에서 onset(스펙트럼 플럭스)을 뽑아 박자 격자에 맞춰 가운데 두 칸(L/R) 노트를 만든다.
- 탭 노트: onset 을 1/2 박으로 양자화, 0.2초 안 겹침은 버림(밀도 ≤ 초당 2.5), 칸은 스펙트럼 무게중심(높은 소리 R, 낮은 소리 L)으로 — 멜로디 흐름을 따라 좌우가 갈린다.
- 홀드 노트: 다음 onset 까지 1.25박 이상 비고 그 사이 에너지가 유지되면 hold(길이 = 간격 − 0.5박, 0.4초 이상).
- 멜로디(BUILD182 사용자 ‘음이 노래 음이랑 똑같이 같이 가게’): 노트마다 보컬 음높이(HPS)를 추적해 키 음계로 스냅한 `pitch`(Hz). 씬이 리드 기타 샘플을 이 음으로 이조.
- 사이드(자동 연출): drums = 저역(<150Hz) onset, vocal = 중역(200~2000Hz) onset 을 0.35초 간격으로 솎음.
- 하이라이트(코러스, BUILD181 사용자 요청 ‘마지막 코러스 같은 데서 파티클·무대 이펙트·관객 환호’): 박자별 (총 RMS + 보컬 대역) 을 2마디로 평활해 최대의 78% 이상이 6초 이상 이어지는 구간(2초 이내 틈은 합침). `highlights: [[start, end], …]`
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


KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.43, 3.17]


def detect_key(mag: np.ndarray, fps: float, t0: float, t1: float) -> dict:
    """곡 키(근음 pitch class + 장/단조): 60~2500Hz 빈을 12 pitch class 로 접은 크로마를 Krumhansl 프로파일과 상관(BUILD182 — 씬이 기타 척을 이 키로 이조).
    씬은 root(0=C … 11=B) 만 쓰고 mode 는 참고용."""
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    band = (freqs >= 60) & (freqs < 2500)
    pcs = (np.round(12 * np.log2(freqs[band] / 261.63)).astype(int)) % 12
    seg = np.log1p(mag[int(t0 * fps):int(t1 * fps), band] * 10).sum(axis=0)
    chroma = np.zeros(12)
    for pc, v in zip(pcs, seg): chroma[pc] += v
    chroma = chroma / (chroma.sum() + 1e-9)
    best = (-2.0, 0, 'major')
    for mode, prof in (('major', MAJOR), ('minor', MINOR)):
        for r in range(12):
            rolled = np.roll(prof, r)
            c = float(np.corrcoef(chroma, rolled)[0, 1])
            if c > best[0]: best = (c, r, mode)
    return {'root': best[1], 'mode': best[2], 'name': KEY_NAMES[best[1]] + ('m' if best[2] == 'minor' else ''), 'confidence': round(best[0], 3)}


SCALES = {'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10]}


def track_pitch(x: np.ndarray, t: float) -> float | None:
    """노트 시각 직후 186ms 의 지배 음높이(Hz): 16384 점 FFT 의 하모닉 곱 스펙트럼(HPS, 로그 합) 80~1000Hz — 보컬 대역(130~700Hz) 가중.
    믹스 속 보컬이라 틀릴 수 있어 뒤에서 옥타브 접기·이웃 점프 제한·키 음계 스냅으로 다듬는다."""
    i0 = int((t + 0.03) * SR)
    seg = x[i0:i0 + 4096]
    if len(seg) < 2048: return None
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n=16384))
    freqs = np.fft.rfftfreq(16384, 1 / SR)
    hps = np.log1p(spec * 4)
    for h in (2, 3, 4):
        d = np.log1p(spec[::h] * 4); hps[:len(d)] += d
    w = ((freqs >= 80) & (freqs <= 1000)).astype(float)
    w[freqs < 130] *= 0.6; w[freqs > 700] *= 0.7
    i = int(np.argmax(hps * w))
    if i <= 0 or i >= len(freqs) - 1: return None
    a, b, c = hps[i - 1], hps[i], hps[i + 1]
    off = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
    return float(freqs[i] + off * (freqs[1] - freqs[0]))


def melody_pitches(x: np.ndarray, notes: list[dict], key: dict, lo: int = 50, hi: int = 74) -> None:
    """각 노트에 pitch(Hz) 를 단다: 추적 → 옥타브를 [lo, hi](D3~D5) 안으로 접음 → 앞 노트와 8반음 넘게 뛰면 옥타브로 당김 → 곡 키 음계의 가장 가까운 음으로 스냅."""
    scale = SCALES[key['mode']]; root = key['root']
    prev = None
    for n in notes:
        f = track_pitch(x, n['t'])
        if not f or f <= 0:
            midi = prev if prev is not None else root + 60
        else:
            midi = 69 + 12 * np.log2(f / 440.0)
            while midi < lo: midi += 12
            while midi > hi: midi -= 12
            if prev is not None:
                while midi - prev > 8 and midi - 12 >= lo: midi -= 12
                while prev - midi > 8 and midi + 12 <= hi: midi += 12
        # 키 음계 스냅(같은 거리면 아래 음)
        best = min(((abs(((round(midi) - root - iv) % 12 + 6) % 12 - 6), round(midi) - (((round(midi) - root - iv) % 12 + 6) % 12 - 6)) for iv in scale), key=lambda z: (z[0], z[1]))
        midi = int(best[1])
        midi = max(lo, min(hi, midi))
        n['pitch'] = round(440.0 * 2 ** ((midi - 69) / 12), 2)
        prev = midi


def find_highlights(rms: np.ndarray, mag: np.ndarray, fps: float, beat: float, phase: float, duration: float, level: float, min_len: float) -> list[list[float]]:
    """코러스 후보: 박자별 (총 RMS 정규화 + 중역 300~3000Hz 보컬 대역 정규화)/2 를 2마디(8박)로 평활, 최대의 `level` 이상이 `min_len` 초 이상 이어지는 구간.
    2초 이내 틈은 합친다. 곡이 강하게 압축돼 있어 총 에너지만으로는 차이가 작고, 보컬 대역이 코러스에서 뚜렷이 오른다."""
    n_beats = int((duration - phase) / beat)
    if n_beats < 16: return []
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    voc = mag[:, (freqs >= 300) & (freqs < 3000)].mean(axis=1)
    def per_beat(arr: np.ndarray) -> np.ndarray:
        out = []
        for b in range(n_beats):
            s0 = int((phase + b * beat) * fps); s1 = max(s0 + 1, int((phase + (b + 1) * beat) * fps))
            out.append(arr[s0:min(s1, len(arr))].mean() if s0 < len(arr) else 0.0)
        return np.array(out)
    pe, pv = per_beat(rms), per_beat(voc)
    mix = 0.5 * pe / (pe.max() + 1e-9) + 0.5 * pv / (pv.max() + 1e-9)
    smooth = np.convolve(mix, np.ones(8) / 8, mode='same')
    norm = smooth / (smooth.max() + 1e-9)
    segs: list[list[float]] = []
    start = None
    for b in range(n_beats):
        hot = norm[b] >= level
        if hot and start is None: start = b
        if (not hot or b == n_beats - 1) and start is not None:
            end = b if not hot else b + 1
            segs.append([phase + start * beat, phase + end * beat]); start = None
    merged: list[list[float]] = []
    for s0, s1 in segs:
        if merged and s0 - merged[-1][1] <= 2.0: merged[-1][1] = s1
        else: merged.append([s0, s1])
    return [[round(max(2.0, s0), 2), round(min(s1, duration - 0.3), 2)] for s0, s1 in merged if s1 - s0 >= min_len]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('media'); ap.add_argument('--title', required=True); ap.add_argument('--artist', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--video'); ap.add_argument('--max-per-sec', type=float, default=2.5)
    ap.add_argument('--delta', type=float, default=0.9)
    ap.add_argument('--hi-level', type=float, default=0.78); ap.add_argument('--hi-min', type=float, default=6.0)
    ap.add_argument('--start', type=float, default=0.0, help='플레이·영상 시작 시각(초). 앞부분(인사·타이틀)은 건너뛴다')
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
        if q < max(1.0, a.start + 0.8) or q > duration - 0.8: continue
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
    highlights = find_highlights(rms, mag, fps, beat, phase, duration, a.hi_level, a.hi_min)
    # 시작점 뒤 4초 안에 드는 하이라이트는 잘라내고(시작하자마자 터지지 않게) 6초 미만이면 버린다
    highlights = [[max(s0, round(a.start + 4, 2)), s1] for s0, s1 in highlights if s1 - max(s0, a.start + 4) >= a.hi_min]
    key = detect_key(mag, fps, a.start, duration)
    melody_pitches(x, notes, key)
    lo = max(1.0, a.start + 0.8)
    drums = [round(i / fps, 3) for i in pick_peaks(flux(mag, 0, 150), 0.2, 0.8) if lo < i / fps < duration - 0.5]
    vocal = [round(i / fps, 3) for i in pick_peaks(flux(mag, 200, 2000), 0.35, 0.9) if lo < i / fps < duration - 0.5]
    chart = {'id': Path(a.out).stem, 'title': a.title, 'artist': a.artist, 'video': a.video or f'assets/video/{Path(a.media).name}',
             'duration': round(duration, 2), 'start': round(a.start, 2), 'bpm': bpm, 'offset': round(phase, 3), 'key': key, 'notes': notes, 'side': {'drums': drums, 'vocal': vocal}, 'highlights': highlights}
    Path(a.out).write_text(json.dumps(chart, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    holds = sum(1 for n in notes if 'dur' in n)
    print(f"{a.out}: {duration:.1f}s bpm {bpm} notes {len(notes)} (holds {holds}, {len(notes) / duration:.2f}/s) drums {len(drums)} vocal {len(vocal)}")
    print('  highlights', ' '.join(f'{s0:.1f}-{s1:.1f}' for s0, s1 in highlights))
    print(f"  start {a.start} key {key['name']} (corr {key['confidence']})")
    ps = [n['pitch'] for n in notes]
    print(f"  melody pitch {min(ps):.0f}~{max(ps):.0f}Hz, distinct {len(set(ps))}")


if __name__ == '__main__':
    main()
