# -*- coding: utf-8 -*-
"""영상 → 게임용 이펙트 애니 프레임 띠 (2026-09-12 사용자 "이 영상의 누끼를 따서 애니로").
   폭발 같은 이펙트 영상에서 구간을 잘라 프레임을 뽑고, 배경을 지우고(누끼), 도트 밀도로 줄여 가로 띠 PNG 한 장으로 만든다.
   컷신에서 { boom: { sheet:'assets/fx/<이름>.png', cols, count, fps, scale } } 로 재생한다.

사용:
  /usr/bin/python3 tools/art/video_to_strip.py <영상> --out assets/fx/explosion.png [옵션]
옵션:
  --start 0.4 --dur 1.2      쓸 구간(초). 없으면 전체
  --fps 14                   뽑을 프레임 수/초 (컷신 fps 와 같게)
  --height 96                프레임 세로 크기(도트 밀도). 가로는 비율 유지
  --cols 0                   띠 가로 칸 수(0 = 한 줄에 전부)
  --key black|green|white|none   배경 지우기 방식(기본 black — 검은 배경 이펙트 영상)
  --thresh 24                배경으로 볼 밝기/색 거리 임계값
  --soft 40                  이 밝기까지 반투명으로 부드럽게(연기 가장자리)
  --crop-to-content          모든 프레임의 내용 경계로 잘라 여백 제거(기본 켜짐)
  --keep-frames              중간 프레임 PNG 를 남긴다(확인용)
결과: 띠 PNG + 표준출력에 컷신에 붙여 넣을 { boom: … } 한 줄.
"""
import argparse, io, os, shutil, subprocess, sys, tempfile
from PIL import Image
import numpy as np

def extract(video, outdir, start, dur, fps):
    cmd = ['ffmpeg', '-v', 'error', '-y']
    if start is not None: cmd += ['-ss', str(start)]
    if dur is not None: cmd += ['-t', str(dur)]
    cmd += ['-i', video, '-vf', f'fps={fps}', os.path.join(outdir, 'f%04d.png')]
    subprocess.run(cmd, check=True)
    return sorted(os.path.join(outdir, f) for f in os.listdir(outdir) if f.endswith('.png'))

def key_alpha(a, mode, thresh, soft):
    """RGBA 배열에 알파를 씌운다. black: 밝기가 낮을수록 투명(연기 가장자리는 반투명)."""
    rgb = a[:, :, :3].astype(np.float32)
    if mode == 'none':
        return a
    if mode in ('black', 'white'):
        lum = rgb.max(axis=2) if mode == 'black' else 255 - rgb.min(axis=2)
        al = np.clip((lum - thresh) / max(1.0, soft - thresh), 0, 1)
    else:                                                            # green: 초록과의 거리
        dist = np.sqrt(((rgb - np.array([0, 255, 0], np.float32)) ** 2).sum(axis=2))
        al = np.clip((dist - thresh) / max(1.0, soft), 0, 1)
    a[:, :, 3] = (al * 255).astype(np.uint8)
    return a

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('--out', required=True)
    ap.add_argument('--start', type=float, default=None); ap.add_argument('--dur', type=float, default=None)
    ap.add_argument('--fps', type=int, default=14); ap.add_argument('--height', type=int, default=96)
    ap.add_argument('--cols', type=int, default=0)
    ap.add_argument('--key', choices=['black', 'green', 'white', 'none'], default='black')
    ap.add_argument('--thresh', type=float, default=24); ap.add_argument('--soft', type=float, default=40)
    ap.add_argument('--no-crop', action='store_true'); ap.add_argument('--keep-frames', action='store_true')
    args = ap.parse_args()

    tmp = tempfile.mkdtemp(prefix='v2strip-')
    try:
        files = extract(args.video, tmp, args.start, args.dur, args.fps)
        if not files: sys.exit('프레임을 못 뽑았다 — 구간(--start/--dur)을 확인')
        frames = []
        for f in files:
            im = Image.open(f).convert('RGBA')
            frames.append(key_alpha(np.array(im), args.key, args.thresh, args.soft))
        if not args.no_crop:                                          # 모든 프레임의 내용 경계 합집합으로 자른다
            box = None
            for a in frames:
                ys, xs = np.nonzero(a[:, :, 3] > 8)
                if not len(xs): continue
                b = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
                box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
            if box: frames = [a[box[1]:box[3], box[0]:box[2]] for a in frames]
        h0, w0 = frames[0].shape[:2]
        fh = args.height; fw = max(1, round(w0 * fh / h0))
        small = [Image.fromarray(a, 'RGBA').resize((fw, fh), Image.LANCZOS) for a in frames]
        n = len(small); cols = args.cols if args.cols > 0 else n; rows = (n + cols - 1) // cols
        strip = Image.new('RGBA', (cols * fw, rows * fh))
        for i, im in enumerate(small): strip.paste(im, ((i % cols) * fw, (i // cols) * fh))
        os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
        strip.save(args.out)
        print(f'wrote {args.out}  {strip.width}x{strip.height}  프레임 {n}개 ({fw}x{fh}), {cols}열 {rows}행')
        print(f"컷신: {{ boom: {{ sheet: '{args.out}', cols: {cols}, rows: {rows}, count: {n}, fps: {args.fps}, scale: 1, at: '<대상id>' }} }}")
        print(f"맵 JSON 의 preload 에 '{args.out}' 추가(첫 재생이 늦지 않게)")
    finally:
        if args.keep_frames: print('프레임:', tmp)
        else: shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__': main()
