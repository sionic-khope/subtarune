#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy"]
# ///
# ─── How to run ───
# /usr/bin/python3 tools/rhythm/chart.py assets/video/noamtori.mp4 --title "방가방가 노앰토리" --artist "무언가가큰징징이" --start 18.2 --out assets/rhythm/noamtori.json
# /usr/bin/python3 tools/rhythm/chart.py assets/video/bojipam.mp4 --title "보X팜" --artist "MC노라니" --out assets/rhythm/bojipam.json
# --- BUILD217 tvform battle bgm (melody notes) ---
# /usr/bin/python3 tools/rhythm/chart.py assets/audio/bgm/youngcle_tvform_battle.mp3 --title "It's Tv Time!" --artist "Deltarune" --player melody --no-video --out assets/rhythm/tvtime.json
# ──────────────────
"""리듬 게임 차트 생성기(BUILD178): 곡(영상) 오디오에서 onset(스펙트럼 플럭스)을 뽑아 박자 격자에 맞춰 가운데 두 칸(L/R) 노트를 만든다.
- (BUILD186 사용자 확정) 플레이어 노트 = 드럼 onset(저역 <150Hz, 0.2초 간격, 무게중심 L/R) 그대로 + 같은 홀드 규칙. 아래 멜로디 노트는 경섭 자동 패드가 된다.
- 탭 노트(멜로디, 이제 경섭 패드): onset 을 1/2 박으로 양자화, 0.2초 안 겹침은 버림(밀도 ≤ 초당 2.5), 칸은 스펙트럼 무게중심(높은 소리 R, 낮은 소리 L)으로 — 멜로디 흐름을 따라 좌우가 갈린다.
- 홀드 노트: 다음 onset 까지 1.25박 이상 비고 그 사이 에너지가 유지되면 hold(길이 = 간격 − 0.5박, 0.4초 이상).
- 사이드(자동 연주, 두 칸씩): drums = 저역(<150Hz) onset, vocal = 중역(200~2000Hz) onset 을 0.35초 간격으로 솎음, 칸은 무게중심으로 L/R. `--start` 로 노트 시작 시각(영상은 안 자름).
- 하이라이트(코러스, BUILD181 사용자 요청 ‘마지막 코러스 같은 데서 파티클·무대 이펙트·관객 환호’): 박자별 (총 RMS + 보컬 대역) 을 2마디로 평활해 최대의 78% 이상이 6초 이상 이어지는 구간(2초 이내 틈은 합침). `highlights: [[start, end], …]`
- `--player melody`(BUILD217 사용자 “멜로디에 맞게 떨어지는 거야”): 플레이어 노트를 드럼 대신 멜로디 대역(--mel-lo~--mel-hi, 기본 300~4000Hz) 스펙트럼 플럭스 onset 으로 만든다.
  박자 격자에 양자화하지 않고 onset 시각 그대로 쓴다(멜로디가 기준). 최소 간격 --min-gap(0.16초), 밀도 --max-per-sec(3.5/초, 2초 창) 상한, 칸은 무게중심. 사이드(드럼·보컬)은 그대로.
- `--no-video`: 음원만 있는 곡(전투 브금) — video 필드를 빼고 쓴다.
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


def assign_lanes(items: list[dict]) -> None:
    """두 칸(L/R) 배분: 무게중심을 전체 중앙값으로 나눠 절반씩(높은 소리 R), 같은 칸 3연속을 넘으면 반대 칸 — 가운데(형섭)와 양옆(경섭·빠맨) 공통."""
    if not items: return
    med = float(np.median([n['c'] for n in items]))
    run = 0; last_lane = None
    for n in items:
        lane = 'R' if n['c'] > med else 'L'
        if lane == last_lane:
            run += 1
            if run >= 3: lane = 'L' if lane == 'R' else 'R'; run = 0
        else: run = 0
        n['lane'] = lane; last_lane = lane
        n.pop('c', None)


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
    ap.add_argument('--player', choices=['drums', 'melody'], default='drums', help='player note source: drums = low-band onsets (default, BUILD186), melody = lead-band onsets (BUILD217)')
    ap.add_argument('--no-video', action='store_true', help='write without the video field (mp3-only song)')
    ap.add_argument('--mel-lo', type=float, default=300.0); ap.add_argument('--mel-hi', type=float, default=4000.0)
    ap.add_argument('--mel-delta', type=float, default=0.8); ap.add_argument('--min-gap', type=float, default=0.16)
    ap.add_argument('--start', type=float, default=0.0, help='노트가 떨어지기 시작하는 곡 시각(초). 영상은 처음부터 틀고 이 앞엔 노트가 없다(노앰토리 18.2 = ‘만원 주면~’)')
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
    assign_lanes(notes)
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
    # 양옆 자동 패드(경섭 드럼·빠맨 보컬)도 두 칸씩(사용자 확정: “경섭 빠맨도 두 칸씩 쓰고 걔네들이 알아서 플레이”) — {t, lane}
    lo = max(1.0, a.start + 0.8)
    drums = [{'t': round(i / fps, 3), 'c': centroid(mag, i)} for i in pick_peaks(flux(mag, 0, 150), 0.2, 0.8) if lo < i / fps < duration - 0.5]
    vocal = [{'t': round(i / fps, 3), 'c': centroid(mag, i)} for i in pick_peaks(flux(mag, 200, 2000), 0.35, 0.9) if lo < i / fps < duration - 0.5]
    assign_lanes(drums); assign_lanes(vocal)
    # 사용자 확정(BUILD186): “경섭 드럼 패드 떨어지는 걸 형섭이 그대로 쓰는 게 더 재밌다” — 드럼 onset 이 플레이어(형섭) 노트, 원래 멜로디 노트는 경섭 자동 패드로
    if a.player == 'melody':
        mel_env = flux(mag, a.mel_lo, a.mel_hi)
        picked: list[dict] = []
        window, cap = 2.0, int(a.max_per_sec * 2.0)
        for i in pick_peaks(mel_env, a.min_gap, a.mel_delta):
            t = i / fps
            if t < max(1.0, a.start + 0.8) or t > duration - 0.8: continue
            if picked and t - picked[-1]['t'] < a.min_gap: continue
            if sum(1 for q in picked if q['t'] > t - window) >= cap: continue
            picked.append({'t': round(t, 3), 'c': centroid(mag, i)})
        assign_lanes(picked)
        drums = [{'t': d['t'], 'lane': d['lane']} for d in drums]
        notes = [{'t': n['t'], 'lane': n['lane']} for n in picked]
    else:
        melody = [{'t': n['t'], 'lane': n['lane']} for n in notes]
        notes = [{'t': d['t'], 'lane': d['lane']} for d in drums]
        for k, n in enumerate(notes):
            nxt = notes[k + 1]['t'] if k + 1 < len(notes) else duration
            gap = nxt - n['t']
            if gap >= 1.25 * beat:
                s0, s1 = int(n['t'] * fps), int(min(len(rms) - 1, (n['t'] + gap - 0.5 * beat) * fps))
                if s1 > s0 and rms[s0:s1].mean() > 0.35 * rms[max(0, s0 - 2):s0 + 3].max():
                    n['dur'] = round(max(0.4, gap - 0.5 * beat), 3)
        drums = melody
    chart = {'id': Path(a.out).stem, 'title': a.title, 'artist': a.artist, 'video': a.video or f'assets/video/{Path(a.media).name}',
             'duration': round(duration, 2), 'notesFrom': round(a.start, 2), 'bpm': bpm, 'offset': round(phase, 3), 'notes': notes, 'side': {'drums': drums, 'vocal': vocal}, 'highlights': highlights}
    if a.no_video: chart.pop('video')
    Path(a.out).write_text(json.dumps(chart, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    holds = sum(1 for n in notes if 'dur' in n)
    print(f"{a.out}: {duration:.1f}s bpm {bpm} notes {len(notes)} (holds {holds}, {len(notes) / duration:.2f}/s) drums {len(drums)} vocal {len(vocal)} player {a.player}")
    per10: dict[int, int] = {}
    for n in notes: per10[int(n['t'] // 10) * 10] = per10.get(int(n['t'] // 10) * 10, 0) + 1
    print('  notes/10s ' + ' '.join(f"{k}:{per10.get(k, 0)}" for k in range(0, int(duration) + 1, 10)))
    print('  highlights', ' '.join(f'{s0:.1f}-{s1:.1f}' for s0, s1 in highlights))
    print(f"  notesFrom {a.start}")


if __name__ == '__main__':
    main()
