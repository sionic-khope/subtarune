#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""물걸음 사운드 생성기 — 영상(델타룬 walking 효과음, youtube 1jZCrBnRm88)의 소리를 **그대로 이어 트는 루프** + 멈출 때 울림 꼬리.

사용자 요구(2026-09-12): "영상 소리랑 그대로 나오고 싶다", "각각의 발소리가 에코가 있는데 끊긴다", "그냥 이거처럼 새로 만들면 안 되나".
걸음마다 파일을 따로 트는 방식(잘라 붙이기 3종·렌더링)은 전부 "끊긴다" — 영상은 걸음이 초당 6번 겹치며 울림이 계속 깔리는 소리라서,
게임처럼 0.4~0.8초에 한 번씩 틀면 아무리 꼬리를 늘려도 '한 번, 쉬고, 한 번' 이 된다. 그래서:
  · water_walk_loop.wav : 영상의 걸음 2~31 구간(4.8초)을 이음매만 크로스페이드한 **끊김 없는 루프**. 물 위를 걷는 동안 이걸 튼다(WebAudio, 표본 단위 루프).
  · water_walk_tail.wav : 멈출 때 쓰는 울림 꼬리 — 영상 잔향과 같은 스펙트럼·레벨(걸음 직전 바닥 레벨)·감쇠(-43dB/s, RT60 1.4초)의 색 입힌 잡음.
  · src/data/footsteps.js : 루프 안 걸음 시작 시각표. 멈추면 **다음 걸음 8ms 앞에서** 루프를 끊고 꼬리를 이어 붙인다 → 마지막 걸음의 울림이 자연스럽게 꺼진다.
  파일은 wav(무손실) — mp3 는 디코더 지연으로 루프 지점·시각표가 20ms 이상 어긋난다.
  세기: 루프 피크 -1.5dBFS 한 배율(꼬리도 같은 배율). 재생 볼륨은 데이터의 volume.

사용:
  /usr/bin/python3 tools/audio/water_steps.py --src <원본.wav> [--out assets/audio/sfx] [--data src/data/footsteps.js] [--check]
  원본 wav: yt-dlp -x --audio-format wav https://www.youtube.com/watch?v=1jZCrBnRm88
  --check: 파일을 쓰지 않고 측정만. --data 는 임시 파일에 쓴 뒤 node --check 를 통과해야 옮긴다.
"""
import argparse, os, shutil, subprocess, tempfile, wave
import numpy as np

ONSET_RISE_DB, ONSET_LVL_DB, ONSET_REFRACT_MS = 5.5, -33.0, 60   # 3ms RMS 포락선이 8ms 에 5.5dB 오르고 -33dB 넘는 순간 — 원본에서 33개
LOOP_FIRST, LOOP_LAST = 2, 32       # 루프 = [걸음2 앞 ~ 걸음32 앞) — 걸음1 은 영상 시작(작음), 33 은 페이드아웃에 걸림
LEAD_MS = 6                         # 걸음 앞 여유(어택은 검출점 ~3ms 앞에서 시작)
SEAM_MS = 30                        # 루프 끝을 '루프 시작 직전 소리' 와 크로스페이드 → 끝→처음이 이어진다
PAD_MS = 50                         # 파일 앞뒤 여유(루프 구간 밖)
CUT_BEFORE_MS = 8                   # 멈출 때 다음 걸음 몇 ms 앞에서 끊나(런타임 데이터)
TABLE_MIN_RISE_DB = 8               # 시각표에 넣는 걸음: 검출점 -8ms 대비 +2ms 가 이만큼 커야(약한 겹걸음은 앞 걸음 소리의 일부로 둔다)
BED_FROM_MS, BED_TO_MS = 30, 8      # 바닥(걸음 직전 울림) 레벨 측정 창: 걸음 앞 30~8ms
REV_FROM_MS, REV_MIN_GAP_MS = 60, 160   # 꼬리 음색 재료: 간격 긴 걸음의 +60ms 이후 잔향
RT_SLOPE_DB_S = -43.0               # 원본 268ms 간격 안에서 잰 잔향 감쇠
TAIL_END_DBFS, TAIL_FADE_IN_MS, TAIL_FADE_MS = -72.0, 8, 40
PEAK_DBFS, VOLUME = -1.5, 0.75
SEED, NFFT = 7, 2048


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


def ms(sr, v):
    return int(sr * v / 1000)


def detect_onsets(db, sr):
    hop = int(sr / 1000); e = db[::hop]; ons = []; last = -10 ** 9
    for i in range(8, len(e)):
        if e[i] - e[i - 8] >= ONSET_RISE_DB and e[i] > ONSET_LVL_DB and i - last >= ONSET_REFRACT_MS:
            ons.append(i * hop); last = i
    return ons


def build_loop(a, sr, ons):
    """끊김 없는 루프 + 앞뒤 여유. 반환: 파일 신호, loopStart(초), loopEnd(초), 루프 안 걸음 시각(초)"""
    s0 = ons[LOOP_FIRST - 1] - ms(sr, LEAD_MS); s1 = ons[LOOP_LAST - 1] - ms(sr, LEAD_MS)
    L = a[s0:s1].copy(); X = ms(sr, SEAM_MS)
    fo = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, X)); L[-X:] = L[-X:] * fo + a[s0 - X:s0] * (1 - fo)
    P = ms(sr, PAD_MS); f = np.concatenate([L[-P:], L, L[:P]])
    e = env_db(a, sr); strong = [o for o in ons[LOOP_FIRST - 1:LOOP_LAST - 1] if e[o + ms(sr, 2)] - e[o - ms(sr, CUT_BEFORE_MS)] >= TABLE_MIN_RISE_DB]
    onsets = [(P + (o - s0)) / sr for o in strong]
    return f, P / sr, (P + len(L)) / sr, onsets, (s0, s1)


def avg_spectrum(segs, sr):
    acc = np.zeros(NFFT // 2 + 1); cnt = 0; win = np.hanning(NFFT)
    for s in segs:
        if len(s) < NFFT: s = np.concatenate([s, np.zeros(NFFT - len(s))])
        for k in range(0, len(s) - NFFT + 1, NFFT // 2):
            acc += np.abs(np.fft.rfft(s[k:k + NFFT] * win)) ** 2; cnt += 1
    return acc / max(cnt, 1)


def band_smooth_db(p, sr):
    f = np.fft.rfftfreq(NFFT, 1 / sr); out = np.zeros_like(p); edges = 100 * 2 ** (np.arange(0, 7.4, 1 / 3))
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (f >= lo) & (f < hi)
        if m.any(): out[m] = p[m].mean()
    out[f < 100] = p[(f >= 60) & (f < 100)].mean(); out[f >= edges[-1]] = out[(f < edges[-1])][-1]
    return 10 * np.log10(out + 1e-18)


def build_tail(a, sr, ons, bed_db, gain, rng):
    """울림 꼬리: 원본 잔향 스펙트럼의 색 입힌 잡음, 바닥 레벨에서 -43dB/s 로 -72dBFS 까지"""
    rev = [a[ons[i] + ms(sr, REV_FROM_MS): ons[i + 1] - ms(sr, LEAD_MS)] for i in range(len(ons) - 1) if ons[i + 1] - ons[i] >= ms(sr, REV_MIN_GAP_MS)]
    h_db = band_smooth_db(avg_spectrum(rev, sr), sr); h_db -= h_db.max()
    start_dbfs = bed_db + 20 * np.log10(gain)
    n = int(sr * (TAIL_END_DBFS - start_dbfs) / RT_SLOPE_DB_S) + ms(sr, TAIL_FADE_MS)
    noise = rng.standard_normal(n); spec = np.fft.rfft(noise); f = np.fft.rfftfreq(n, 1 / sr)
    spec *= 10 ** (np.interp(f, np.fft.rfftfreq(NFFT, 1 / sr), h_db) / 20); col = np.fft.irfft(spec, n)
    col /= np.sqrt((col * col).mean())
    t = np.arange(n) / sr; col *= 10 ** ((start_dbfs + RT_SLOPE_DB_S * t) / 20)
    fi = ms(sr, TAIL_FADE_IN_MS); col[:fi] *= np.sin(np.linspace(0, np.pi / 2, fi))
    fo = ms(sr, TAIL_FADE_MS); col[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    return col, h_db


DATA_TMPL = """// ───────────────────────────────────────────────────────────────
// 생성 파일 — tools/audio/water_steps.py 가 만든다. 손으로 고치지 말 것.
// 물걸음 사운드(사용자 지정 델타룬 walking 효과음 youtube 1jZCrBnRm88): 물 위를 걷는 동안 영상 소리를 **그대로 이어 튼다**
//   (2026-09-12 "영상 소리랑 그대로 나오고 싶다", "각각의 발소리가 에코가 있는데 끊긴다").
//   걸음마다 파일을 따로 트는 방식은 전부 "끊긴다" — 영상은 걸음이 초당 6번 겹치며 울림이 계속 깔리는 소리다.
//   재생: src/core/audio.js Sound.walk(def) — Player 가 매 프레임 부른다(걷는 중이고 발밑 타일이 step 이면 def, 아니면 null).
//   멈추면 onsets 의 다음 걸음 cutBefore 앞에서 루프를 끊고 tail(울림 꼬리)을 이어 붙인다 → 마지막 걸음의 에코가 자연스럽게 꺼진다.
// ───────────────────────────────────────────────────────────────

/** 물 위 걷기 소리 — 타일 `step` 이 이 객체면 Player 가 Sound.walk 로 튼다 (src/world/tiles.js a/A/j) */
export const WATER_WALK = {
  loop: '%(loop)s',
  tail: '%(tail)s',
  loopStart: %(ls).4f,
  loopEnd: %(le).4f,
  cutBefore: %(cut).3f,
  volume: %(vol).2f,
  /** 루프 파일 안 걸음 시작 시각(초) — 걸음 %(first)d~%(lastn)d 중 또렷한 %(n)d개(약한 겹걸음은 앞 걸음의 일부) */
  onsets: [%(onsets)s],
};
"""


def write_data(path, fields):
    js = DATA_TMPL % fields
    tmp = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8'); tmp.write(js); tmp.close()
    r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    shutil.move(tmp.name, path)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', required=True); ap.add_argument('--out', default='assets/audio/sfx')
    ap.add_argument('--data', default='src/data/footsteps.js'); ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    a, sr = load_wav(args.src); db = env_db(a, sr); ons = detect_onsets(db, sr); rng = np.random.default_rng(SEED)
    print('onsets %d, gaps ms: min %.0f med %.0f max %.0f' % (len(ons), np.diff(ons).min() / sr * 1000, np.median(np.diff(ons)) / sr * 1000, np.diff(ons).max() / sr * 1000))
    f, ls, le, onsets, (s0, s1) = build_loop(a, sr, ons)
    gain = 10 ** (PEAK_DBFS / 20) / np.abs(f).max()
    bed = float(np.median([rms_db(a[o - ms(sr, BED_FROM_MS): o - ms(sr, BED_TO_MS)]) for o in ons[LOOP_FIRST - 1:LOOP_LAST]]))
    tail, h_db = build_tail(a, sr, ons, bed, gain, rng)
    seam_jump = abs(f[int(le * sr) - 1] - f[int(ls * sr)]) * gain
    print('loop %.3fs (file %.3fs, loopStart %.3f loopEnd %.3f), %d steps, gain %+.1f dB, bed before steps %.1f dB raw → %.1f dBFS, seam jump %.4f' % (le - ls, len(f) / sr, ls, le, len(onsets), 20 * np.log10(gain), bed, bed + 20 * np.log10(gain), seam_jump))
    fh = np.fft.rfftfreq(NFFT, 1 / sr)
    print('tail %.3fs, colour @ ' % (len(tail) / sr) + ' '.join('%dHz:%.0f' % (x, np.interp(x, fh, h_db)) for x in (150, 300, 600, 1200, 2400, 4800, 9600)))
    # 검증: 루프 이음매 양쪽 20ms 레벨, 시각표의 각 걸음이 정말 어택인지(8ms 앞 대비 +10dB 이상)
    e = env_db(f * gain, sr)
    print('seam level (20ms each side of the loop point): end %.1f / start(before first attack) %.1f dBFS' % (rms_db(f[int(le * sr) - ms(sr, 20): int(le * sr)] * gain), rms_db(f[int(ls * sr) - ms(sr, 20): int(ls * sr)] * gain)))
    rises = [e[int(o * sr) + ms(sr, 2)] - e[int(o * sr) - ms(sr, CUT_BEFORE_MS)] for o in onsets]
    print('table %d steps (weak double-hits folded into the previous step: %d); onset rise (+2ms vs -%dms): min %+.0f med %+.0f dB' % (len(onsets), LOOP_LAST - LOOP_FIRST - len(onsets), CUT_BEFORE_MS, min(rises), np.median(rises)))
    assert min(rises) >= TABLE_MIN_RISE_DB and all(b - a > 0.05 for a, b in zip(onsets, onsets[1:]))
    if args.check: return
    os.makedirs(args.out, exist_ok=True)
    save_wav(os.path.join(args.out, 'water_walk_loop.wav'), f * gain, sr)
    save_wav(os.path.join(args.out, 'water_walk_tail.wav'), tail, sr)
    write_data(args.data, dict(loop='assets/audio/sfx/water_walk_loop.wav', tail='assets/audio/sfx/water_walk_tail.wav', ls=ls, le=le, cut=CUT_BEFORE_MS / 1000, vol=VOLUME,
                               first=LOOP_FIRST, lastn=LOOP_LAST - 1, n=len(onsets), onsets=', '.join('%.4f' % o for o in onsets)))
    print('wrote', args.out, 'and', args.data)


if __name__ == '__main__':
    main()
