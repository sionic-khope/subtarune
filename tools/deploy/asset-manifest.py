#!/usr/bin/env python3
"""배포 패키지의 에셋 목록(BUILD432): 서비스 워커가 내용 지문으로 바뀐 파일만 다시 받고, 게임이 백그라운드로 채울 순서.
사용: python3 tools/deploy/asset-manifest.py <패키지 루트>  → <루트>/asset-manifest.json
순서 = 플레이에 먼저 필요한 것부터(맵 → 캐릭터·초상화 → 타일·소품·배경 → 전투·적 → 효과음·목소리 → 곡 → 영상·크레딧)."""
import hashlib, json, os, sys

root = sys.argv[1]
ORDER = ['assets/maps', 'assets/sprites', 'assets/portraits', 'assets/fonts', 'assets/tiles', 'assets/props', 'assets/backdrops',
         'assets/enemies', 'assets/battle', 'assets/projectiles', 'assets/fx', 'assets/illustrations', 'assets/rhythm', 'assets/shop',
         'assets/audio/sfx', 'assets/audio/voices', 'assets/audio/bgm', 'assets/video', 'assets/credits']
files = []
for dp, _, fs in os.walk(os.path.join(root, 'assets')):
    for f in fs:
        full = os.path.join(dp, f)
        rel = os.path.relpath(full, root).replace(os.sep, '/')
        if rel.startswith('assets/lib/') or rel.startswith('assets/source/'):
            continue
        with open(full, 'rb') as fh:
            h = hashlib.sha1(fh.read()).hexdigest()[:12]
        files.append({'p': rel, 'h': h, 's': os.path.getsize(full)})
rank = lambda p: next((i for i, d in enumerate(ORDER) if p.startswith(d + '/')), len(ORDER))
files.sort(key=lambda f: (rank(f['p']), f['p']))
# 코드 껍데기(첫 방문에도 오프라인 새로고침이 되게 서비스 워커가 설치 때 받아 둔다)
code = ['index.html']
for top in ('src', 'css'):
    for dp, _, fs in os.walk(os.path.join(root, top)):
        code += [os.path.relpath(os.path.join(dp, f), root).replace(os.sep, '/') for f in fs]
code += ['assets/lib/three.module.js'] if os.path.exists(os.path.join(root, 'assets/lib/three.module.js')) else []
with open(os.path.join(root, 'asset-manifest.json'), 'w') as out:
    json.dump({'files': files, 'code': sorted(code)}, out, separators=(',', ':'))
print(f"asset-manifest: {len(files)} files, {sum(f['s'] for f in files) / 1e6:.1f} MB")
