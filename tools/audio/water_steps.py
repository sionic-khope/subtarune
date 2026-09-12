#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""물걸음 사운드 33개 파일 생성기 (2026-09-12 사용자: "이 영상 소리(1jZCrBnRm88)로 걸음 전부", "영상 소리 그대로", "각각의 발소리가 에코가 있는데 끊긴다").

원본(델타룬 walking 효과음 영상의 오디오)은 걸음이 0.07~0.27초 간격으로 이어져 **모든 걸음의 잔향이 다음 걸음에 가려져 있다**.
그냥 걸음 사이를 자르면 잔향이 -40dB 근처에서 뚝 끊긴다. 그래서 걸음마다:
  [어택 14ms 앞에서 시작(6ms 페이드인) ~ 다음 걸음 6ms 앞까지의 **진짜 소리**]
  + [같은 녹음의 잔향 조각(간격 160ms 이상인 걸음들의 +50ms 이후 구간)을 알갱이(80ms)로 이어 붙인 꼬리]
꼬리 감쇠는 원본의 268ms 간격 안에서 잰 **-43dB/s(RT60 1.4초)** — 이전 -109dB/s(0.4초 파일)는 "아직 끊긴다"(2026-09-12).
꼬리는 -86dB(원본 기준, 게임 출력 약 -72dBFS)까지 이어지고 40ms 페이드로 끝난다. 이음매는 16ms 등전력 크로스페이드.
세기는 **세트 전체 한 배율**(가장 큰 걸음 피크 -1.5dBFS) — 걸음마다의 크기 차이는 원본 그대로.

사용:
  /usr/bin/python3 tools/audio/water_steps.py --src <원본.wav> [--out assets/audio/sfx] [--preview <폴더>]
  원본 wav: yt-dlp -x --audio-format wav https://www.youtube.com/watch?v=1jZCrBnRm88
  --preview 를 주면 걷기(0.67s)·달리기(0.37s) 간격으로 이어 붙인 시연 wav 와 측정값을 출력한다.
재생: src/data/footsteps.js WATER_STEP_SFX 목록 → 타일 `step` 배열 → Player.footstep 이 걸음마다 하나를 그대로(volume 0.75) 재생.
"""
import argparse, os, subprocess, sys, wave
import numpy as np

# 온셋: 3ms RMS 포락선이 8ms 동안 5.5dB 이상 오르고 -33dB 를 넘는 순간(불응기 60ms) — 원본에서 33개
ONSET_RISE_DB, ONSET_LVL_DB, ONSET_REFRACT_MS = 5.5, -33.0, 60
PRE_MS, FADE_IN_MS = 14, 6                 # 어택 앞 여유, 페이드인
END_BEFORE_NEXT_MS, XFADE_MS = 6, 16       # 다음 걸음 앞에서 끊는 위치(어택은 3ms 안에 20dB 뛴다), 이음매
LAST_BODY_MS = 120                         # 마지막 걸음(영상이 페이드아웃) 몸통 길이
TAIL_SLOPE_DB_S = -43.0                    # 잔향 감쇠(원본 268ms 간격에서 측정)
TAIL_FLOOR_DB = -86.0                      # 여기까지 이어 붙이고
TAIL_FADE_MS = 40                          # 페이드아웃
POOL_MIN_GAP_MS, POOL_FROM_MS = 160, 50    # 잔향 재료: 간격 ≥160ms 걸음의 +50ms 이후
GRAIN_MS, HOP_MS = 80, 40                  # 알갱이 합성
PEAK_DBFS = -1.5
SEED = 7


def load_wav(path):
    w = wave.open(path); n, sr, ch, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
    d = w.readframes(n); w.close()
    a = np.frombuffer(d, dtype={2: np.int16, 4: np.int32}[sw]).astype(np.float64)
    if ch > 1: a = a.reshape(-1, ch).mean(1)
    return a / (2 ** (8 * sw - 1)), sr


def save_wav(path, a, sr):
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()


def env_db(a, sr, ms=3):
    win = max(1, int(sr * ms / 1000))
    return 20 * np.log10(np.sqrt(np.convolve(a * a, np.ones(win) / win, 'same')) + 1e-9)


def detect_onsets(db, sr):
    hop = int(sr / 1000); e = db[::hop]; ons = []; last = -10 ** 9
    for i in range(8, len(e)):
        if e[i] - e[i - 8] >= ONSET_RISE_DB and e[i] > ONSET_LVL_DB and i - last >= ONSET_REFRACT_MS:
            ons.append(i * hop); last = i
    return ons


def rms_db(x):
    return 20 * np.log10(np.sqrt((x * x).mean()) + 1e-9)


def build_pool(a, sr, ons):
    """잔향 재료: 간격이 긴 걸음들의 잔향 구간을 40ms 포락선으로 평탄화한 조각들"""
    pool = []
    for i, o in enumerate(ons[:-1]):
        gap = ons[i + 1] - o
        if gap < sr * POOL_MIN_GAP_MS / 1000: continue
        seg = a[o + int(sr * POOL_FROM_MS / 1000): ons[i + 1] - int(sr * END_BEFORE_NEXT_MS / 1000)].copy()
        win = int(sr * 0.04); env = np.sqrt(np.convolve(seg * seg, np.ones(win) / win, 'same')) + 1e-6
        pool.append(seg / env)
    assert pool, 'no reverb material'
    return pool


def synth_tail(n, pool, sr, rng):
    """단위 RMS 의 잔향 질감 n 샘플 — 재료 조각에서 무작위 알갱이(80ms 한창)를 40ms 간격으로 겹쳐 붙인다"""
    g, h = int(sr * GRAIN_MS / 1000), int(sr * HOP_MS / 1000); win = np.hanning(g)
    out = np.zeros(n + g)
    for start in range(0, n, h):
        p = pool[rng.integers(len(pool))]
        if len(p) <= g: continue
        k = rng.integers(0, len(p) - g)
        out[start:start + g] += p[k:k + g] * win
    out = out[:n]
    w = int(sr * 0.04); env = np.sqrt(np.convolve(out * out, np.ones(w) / w, 'same')) + 1e-6
    return out / env


def cut_step(a, sr, ons, i, pool, rng):
    o = ons[i]
    s0 = o - int(sr * PRE_MS / 1000)
    if i + 1 < len(ons): s1 = ons[i + 1] - int(sr * END_BEFORE_NEXT_MS / 1000)
    else: s1 = min(len(a), o + int(sr * LAST_BODY_MS / 1000))
    body = a[s0:s1].copy()
    fi = int(sr * FADE_IN_MS / 1000); body[:fi] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))
    x = int(sr * XFADE_MS / 1000)
    join_db = rms_db(body[-x - int(sr * 0.024):-x])
    # 이음매 구간에 다음 걸음의 어택(+15~25dB)이 섞여 있으면 안 된다(잔향 자체는 ±4dB 흔들린다)
    assert env_db(body[-x:], sr).max() < join_db + 12, 'attack inside crossfade at step %d' % (i + 1)
    n_decay = int(sr * (TAIL_FLOOR_DB - join_db) / TAIL_SLOPE_DB_S)
    n_fade = int(sr * TAIL_FADE_MS / 1000)
    tail = synth_tail(n_decay + n_fade, pool, sr, rng)
    t = np.arange(len(tail)) / sr
    tail *= 10 ** ((join_db + TAIL_SLOPE_DB_S * t) / 20)
    tail[-n_fade:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_fade))
    th = np.linspace(0, np.pi / 2, x)
    out = np.concatenate([body[:-x], body[-x:] * np.cos(th) + tail[:x] * np.sin(th), tail[x:]])
    return out, (s1 - s0) / sr


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', required=True); ap.add_argument('--out', default='assets/audio/sfx')
    ap.add_argument('--preview', default=''); ap.add_argument('--check', action='store_true', help='파일을 쓰지 않고 측정만')
    args = ap.parse_args()
    a, sr = load_wav(args.src); db = env_db(a, sr); ons = detect_onsets(db, sr)
    print('onsets %d, gaps ms: min %.0f med %.0f max %.0f' % (len(ons), np.diff(ons).min() / sr * 1000, np.median(np.diff(ons)) / sr * 1000, np.diff(ons).max() / sr * 1000))
    pool = build_pool(a, sr, ons); rng = np.random.default_rng(SEED)
    steps = []
    for i in range(len(ons)):
        out, body_s = cut_step(a, sr, ons, i, pool, rng); steps.append((out, body_s))
    gain = 10 ** (PEAK_DBFS / 20) / max(np.abs(s[0]).max() for s in steps)
    print('global gain %+.1f dB' % (20 * np.log10(gain)))
    tmp = args.preview or args.out
    os.makedirs(tmp, exist_ok=True)
    for i, (out, body_s) in enumerate(steps):
        y = out * gain
        name = 'water_step%02d' % (i + 1)
        head = env_db(y[:int(sr * 0.002)], sr).max(); tail_end = env_db(y[-int(sr * 0.005):], sr).max()
        print('  %s  %.3fs (body %.0fms + tail %.0fms)  peak %.1f dBFS  start %.0f dB  end %.0f dB' % (name, len(y) / sr, body_s * 1000, (len(y) / sr - body_s) * 1000, 20 * np.log10(np.abs(y).max()), head, tail_end))
        if args.check: continue
        wav = os.path.join(tmp, name + '.wav'); save_wav(wav, y, sr)
        mp3 = os.path.join(args.out, name + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '2', mp3], check=True)
    if args.preview and not args.check:
        vol = 0.75
        for label, interval, count in (('walk', 0.67, 8), ('run', 0.37, 12)):
            total = int(sr * (interval * count + 2.0)); mix = np.zeros(total); pick = rng.integers(len(steps), size=count)
            for k, j in enumerate(pick):
                y = steps[j][0] * gain * vol; s = int(sr * (0.3 + k * interval)); mix[s:s + len(y)] += y
            p = os.path.join(args.preview, 'steps_%s_preview.wav' % label); save_wav(p, mix, sr)
            e = env_db(mix, sr, 20); lows = []
            for k in range(1, count):
                s = int(sr * (0.3 + k * interval)); lows.append(e[s - int(sr * 0.03):s - int(sr * 0.015)].min())
            print('%s preview %s: level just before each next step min %.1f / med %.1f dBFS (wind bgm 1~3kHz ≈ -55)' % (label, p, min(lows), np.median(lows)))


if __name__ == '__main__':
    main()
