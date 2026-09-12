#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""물걸음 사운드 33개 생성기 — 영상 소리를 본떠 **새로 렌더링**한다 (2026-09-12 사용자 "그냥 너가 이거처럼 새로 만들면 안 되나").

원본(델타룬 walking 효과음 영상 1jZCrBnRm88 의 오디오)은 걸음이 0.07~0.27초 간격으로 이어져 **어느 걸음도 울림이 온전하지 않다**
(다음 걸음에 가려짐). 그래서 잘라 붙이지 않고, 걸음마다 온전한 한 소리를 다시 만든다:
  건조음(dry) = 그 걸음의 첫 찰싹(어택 6ms 앞 ~ +100ms, 끝 40ms 페이드 — 다음 걸음이 더 가까우면 그 8ms 앞까지) — 영상 소리 그대로
  울림(wet)   = 건조음 ⊛ 방 임펄스 응답(IR). IR 은 영상에서 잰 것으로 설계:
                 · 감쇠 -43dB/s(RT60 1.4초 — 원본 268ms 간격 안의 잔향 기울기)
                 · 음색 = 원본 잔향 스펙트럼 ÷ 건조음 스펙트럼(1/3옥타브 평활) → 색 입힌 잡음
                 · 울림은 50ms 에 걸쳐 차오른다(원본 잔향이 +60ms 에서 가장 큼)
                 · 세기 = 걸음마다 +80~110ms 울림이 **원본의 그 구간 레벨(간격 긴 걸음들의 중앙값)** 이 되게 — 원본은 걸음 크기와 상관없이 울림 크기가 거의 같다(큰 걸음 -16dB 도 작은 걸음 -22dB 도 +100ms 에 -40dB)
  출력 = dry + wet, -72dBFS 까지 이어지고 40ms 페이드. 세기는 세트 전체 한 배율(가장 큰 걸음 피크 -1.5dBFS).
폐기: 합성 2종("쫀득") · 걸음 사이를 자른 것("끊김") · 잘라 붙인 꼬리 -109dB/s 0.4초("아직 끊김") · 알갱이 꼬리 -43dB/s 1.2초(→ 이 방식으로 교체).

사용:
  /usr/bin/python3 tools/audio/water_steps.py --src <원본.wav> [--out assets/audio/sfx] [--preview <폴더>] [--check]
  원본 wav: yt-dlp -x --audio-format wav https://www.youtube.com/watch?v=1jZCrBnRm88
  --preview: 걷기(0.67s)·달리기(0.37s) 간격 시연 wav + 다음 걸음 직전 레벨. --check: 파일을 쓰지 않고 측정만.
재생: src/data/footsteps.js WATER_STEP_SFX → 타일 `step` 배열 → Player.footstep 이 걸음마다 하나를 그대로(volume 0.75) 재생.
"""
import argparse, os, subprocess, wave
import numpy as np

ONSET_RISE_DB, ONSET_LVL_DB, ONSET_REFRACT_MS = 5.5, -33.0, 60   # 3ms RMS 포락선이 8ms 에 5.5dB 오르고 -33dB 넘는 순간 — 원본에서 33개
DRY_PRE_MS, DRY_MS, DRY_FADE_MS, DRY_FADE_IN_MS = 6, 100, 40, 3   # 건조음 창(온셋 검출점은 어택 시작 ~3ms 뒤 → 6ms 앞에서 시작; +60ms 의 두 번째 물방울까지 살리고 40ms 페이드)
RT_SLOPE_DB_S = -43.0                                            # 방 감쇠
IR_PREDELAY_MS, IR_RISE_MS, IR_LEN_S = 5, 50, 1.9                # 첫 반사까지, 울림이 차오르는 시간(원본은 +60ms 에서 가장 큼), IR 길이(-80dB 까지)
CAL_MIN_GAP_MS, CAL_FROM_MS, CAL_TO_MS = 160, 80, 110            # 세기 보정: 간격 긴 걸음의 실제 잔향 구간
REV_FROM_MS = 60                                                 # 음색 측정용 실제 잔향 구간 시작
END_DBFS, END_FADE_MS = -72.0, 40                                # 파일 끝
PEAK_DBFS = -1.5
SEED = 7
NFFT = 2048


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


def rms_db(x):
    return 20 * np.log10(np.sqrt((x * x).mean()) + 1e-9)


def detect_onsets(db, sr):
    hop = int(sr / 1000); e = db[::hop]; ons = []; last = -10 ** 9
    for i in range(8, len(e)):
        if e[i] - e[i - 8] >= ONSET_RISE_DB and e[i] > ONSET_LVL_DB and i - last >= ONSET_REFRACT_MS:
            ons.append(i * hop); last = i
    return ons


def ms(sr, v):
    return int(sr * v / 1000)


def dry_window(a, sr, ons, i):
    """걸음 i 의 건조음: 어택 3ms 앞부터 70ms(다음 걸음이 더 가까우면 그 8ms 앞까지), 시작 3ms·끝 30ms 라이즈드코사인"""
    o = ons[i]; s0 = o - ms(sr, DRY_PRE_MS)
    n = ms(sr, DRY_MS)
    if i + 1 < len(ons): n = min(n, ons[i + 1] - ms(sr, 8) - s0)
    d = a[s0:s0 + n].copy()
    fi = ms(sr, DRY_FADE_IN_MS); d[:fi] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))
    fo = min(ms(sr, DRY_FADE_MS), n // 2); d[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    return d


def avg_spectrum(segs, sr):
    """조각들의 평균 파워 스펙트럼(NFFT, 한창, hop 절반)"""
    acc = np.zeros(NFFT // 2 + 1); cnt = 0; win = np.hanning(NFFT)
    for s in segs:
        if len(s) < NFFT:
            s = np.concatenate([s, np.zeros(NFFT - len(s))])
        for k in range(0, len(s) - NFFT + 1, NFFT // 2):
            acc += np.abs(np.fft.rfft(s[k:k + NFFT] * win)) ** 2; cnt += 1
    return acc / max(cnt, 1)


def band_smooth(p, sr):
    """1/3옥타브 밴드 평균으로 평활한 파워 스펙트럼(dB) — 100Hz 아래·16kHz 위는 가장자리 값 유지"""
    f = np.fft.rfftfreq(NFFT, 1 / sr); out = np.zeros_like(p); edges = 100 * 2 ** (np.arange(0, 7.4, 1 / 3))
    lo_val = p[(f >= 60) & (f < 100)].mean() if (f < 100).any() else p[1]
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (f >= lo) & (f < hi)
        if m.any(): out[m] = p[m].mean()
    out[f < 100] = lo_val; out[f >= edges[-1]] = out[(f < edges[-1])][-1]
    return 10 * np.log10(out + 1e-18)


def design_ir(a, sr, ons, drys, rng):
    """방 임펄스 응답: 색 입힌 잡음 × 지수 감쇠. 음색 = 실제 잔향 스펙트럼 ÷ 건조음 스펙트럼."""
    rev = [a[ons[i] + ms(sr, REV_FROM_MS): ons[i + 1] - ms(sr, 6)] for i in range(len(ons) - 1) if ons[i + 1] - ons[i] >= ms(sr, CAL_MIN_GAP_MS)]
    loud = sorted(range(len(drys)), key=lambda i: -np.abs(drys[i]).max())[:12]
    h_db = band_smooth(avg_spectrum(rev, sr), sr) - band_smooth(avg_spectrum([drys[i] for i in loud], sr), sr)
    h_db -= h_db.max(); h_db = np.clip(h_db, -50, 0)
    n = int(sr * IR_LEN_S); noise = rng.standard_normal(n)
    # 주파수 영역에서 색 입히기(위상은 잡음 그대로) → 시간 포락선
    spec = np.fft.rfft(noise); f = np.fft.rfftfreq(n, 1 / sr); fh = np.fft.rfftfreq(NFFT, 1 / sr)
    spec *= 10 ** (np.interp(f, fh, h_db) / 20); col = np.fft.irfft(spec, n)
    t = np.arange(n) / sr; col *= 10 ** (RT_SLOPE_DB_S * t / 20)
    r = ms(sr, IR_RISE_MS); col[:r] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, r))
    ir = np.concatenate([np.zeros(ms(sr, IR_PREDELAY_MS)), col])
    return ir / np.sqrt((ir * ir).sum()), h_db


def render(dry, ir, gain):
    n = len(dry) + len(ir) - 1; nf = 1 << (n - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(dry, nf) * np.fft.rfft(ir, nf), nf)[:n] * gain
    out = wet.copy(); out[:len(dry)] += dry
    return out, wet


def calibrate(a, sr, ons, drys, ir):
    """울림 세기: 원본의 간격 긴 걸음들에서 +80~110ms 잔향 RMS 의 중앙값을 목표로, 걸음마다 (목표 / unit IR wet 의 같은 구간 RMS) — 원본처럼 울림 크기는 걸음마다 거의 같다"""
    reals = [rms_db(a[ons[i] + ms(sr, CAL_FROM_MS): ons[i] + ms(sr, CAL_TO_MS)]) for i in range(len(ons) - 1) if ons[i + 1] - ons[i] >= ms(sr, CAL_MIN_GAP_MS)]
    assert reals, 'no long-gap steps for calibration'
    target = float(np.median(reals)); gains = []
    for d in drys:
        _, wet = render(d, ir, 1.0); w = wet[ms(sr, DRY_PRE_MS + CAL_FROM_MS): ms(sr, DRY_PRE_MS + CAL_TO_MS)]
        gains.append(10 ** ((target - rms_db(w)) / 20))
    return gains, target, len(reals)


def trim(y, sr):
    """20ms RMS 가 END_DBFS 아래로 내려간 곳 + 40ms 페이드"""
    e = env_db(y, sr, 20); idx = np.where(e[ms(sr, 100):] < END_DBFS)[0]
    end = (idx[0] + ms(sr, 100)) if len(idx) else len(y)
    fo = ms(sr, END_FADE_MS); end = min(len(y), end + fo); y = y[:end].copy()
    y[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)); return y


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', required=True); ap.add_argument('--out', default='assets/audio/sfx')
    ap.add_argument('--preview', default=''); ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    a, sr = load_wav(args.src); db = env_db(a, sr); ons = detect_onsets(db, sr); rng = np.random.default_rng(SEED)
    print('onsets %d, gaps ms: min %.0f med %.0f max %.0f' % (len(ons), np.diff(ons).min() / sr * 1000, np.median(np.diff(ons)) / sr * 1000, np.diff(ons).max() / sr * 1000))
    drys = [dry_window(a, sr, ons, i) for i in range(len(ons))]
    ir, h_db = design_ir(a, sr, ons, drys, rng)
    fh = np.fft.rfftfreq(NFFT, 1 / sr)
    print('IR colour (dB rel max) @', ' '.join('%dHz:%.0f' % (f, np.interp(f, fh, h_db)) for f in (150, 300, 600, 1200, 2400, 4800, 9600)))
    gains, target, ncal = calibrate(a, sr, ons, drys, ir); print('wet target %.1f dB (raw, +80~110ms) from %d long-gap steps; per-step wet gain %+.1f..%+.1f dB' % (target, ncal, 20 * np.log10(min(gains)), 20 * np.log10(max(gains))))
    outs = [render(d, ir, gi)[0] for d, gi in zip(drys, gains)]
    g = 10 ** (PEAK_DBFS / 20) / max(np.abs(o).max() for o in outs); print('global gain %+.1f dB' % (20 * np.log10(g)))
    ys = [trim(o * g, sr) for o in outs]
    # 렌더 vs 실제: 간격 긴 걸음의 포락선(3ms RMS, 원본 배율로) — +20/60/100/150/200ms 오차
    er = env_db(a, sr); errs = []
    for i in range(len(ons) - 1):
        if ons[i + 1] - ons[i] < ms(sr, CAL_MIN_GAP_MS): continue
        ey = env_db(ys[i] / g, sr); o = ons[i]
        d = [ey[ms(sr, DRY_PRE_MS + t)] - er[o + ms(sr, t)] for t in (20, 60, 100, 150, 200) if o + ms(sr, t) < ons[i + 1] - ms(sr, 6)]
        errs.append(d); print('  step%02d new-real dB @20/60/100/150/200ms: ' % (i + 1) + ' '.join('%+.0f' % v for v in d))
    print('mean |new-real| %.1f dB over %d long-gap steps' % (np.mean([abs(v) for d in errs for v in d]), len(errs)))
    tmp = args.preview or args.out
    if not args.check: os.makedirs(tmp, exist_ok=True)
    for i, y in enumerate(ys):
        name = 'water_step%02d' % (i + 1)
        print('  %s  %.3fs  peak %.1f dBFS  start %.0f  end %.0f dB' % (name, len(y) / sr, 20 * np.log10(np.abs(y).max()), env_db(y[:ms(sr, 2)], sr).max(), env_db(y[-ms(sr, 5):], sr).max()))
        if args.check: continue
        wav = os.path.join(tmp, name + '.wav'); save_wav(wav, y, sr)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '2', os.path.join(args.out, name + '.mp3')], check=True)
    if args.preview and not args.check:
        vol = 0.75
        for label, interval, count in (('walk', 0.67, 8), ('run', 0.37, 12)):
            mix = np.zeros(int(sr * (interval * count + 2.5))); pick = rng.integers(len(ys), size=count)
            for k, j in enumerate(pick):
                y = ys[j] * vol; s = int(sr * (0.3 + k * interval)); mix[s:s + len(y)] += y
            p = os.path.join(args.preview, 'steps_%s_preview.wav' % label); save_wav(p, mix, sr)
            e = env_db(mix, sr, 20); lows = [e[int(sr * (0.3 + k * interval)) - ms(sr, 30): int(sr * (0.3 + k * interval)) - ms(sr, 15)].min() for k in range(1, count)]
            print('%s preview: level just before each next step min %.1f / med %.1f dBFS (wind bgm 1~3kHz ≈ -55) → %s' % (label, min(lows), np.median(lows), p))


if __name__ == '__main__':
    main()
