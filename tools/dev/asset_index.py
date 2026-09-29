#!/usr/bin/env python3
"""실제로 있는 초상화·배경 그림 목록을 src/data/asset-index.js 로 만든다(BUILD433).
없는 파일을 요청하면 404 + 재시도 두 번(0.4s·0.8s)으로 맵 첫 진입이 약 1.2초 늦었다 — 목록에 있는 것만 받는다.
사용: python3 tools/dev/asset_index.py [--check]  (tests/unit/asset-index.test.mjs 가 폴더와 어긋나면 잡는다)"""
import os, sys

def names(d):
    return sorted(os.path.splitext(f)[0] for f in os.listdir(d) if f.endswith('.png'))

def audio():
    out = []
    for sub in ('sfx', 'voices'):
        d = os.path.join('assets/audio', sub)
        out += [f'{sub}/{f}' for f in os.listdir(d) if f.endswith(('.mp3', '.ogg'))]
    return sorted(out)

body = ('// 자동 생성 — python3 tools/dev/asset_index.py (손으로 고치지 않는다)\n'
        '// 실제로 있는 초상화·배경 그림: 없는 파일은 요청하지 않는다(404 재시도로 맵 첫 진입이 늦던 문제, BUILD433)\n'
        f"export const PORTRAIT_FILES = new Set({names('assets/portraits')!r});\n"
        f"export const BACKDROP_FILES = new Set({names('assets/backdrops')!r});\n"
        f"export const SPRITE_FILES = new Set({names('assets/sprites')!r});\n"
        f"export const TILE_FILES = new Set({names('assets/tiles')!r});\n"
        # 소리는 확장자까지(mp3 먼저, 없으면 ogg) — 합성음 이름(chime·open 등)은 파일을 찾지 않는다
        f"export const AUDIO_FILES = new Set({audio()!r});\n").replace("'", "'")
out = 'src/data/asset-index.js'
if '--check' in sys.argv:
    same = os.path.exists(out) and open(out, encoding='utf-8').read() == body
    print('asset-index', 'same' if same else 'DIFFERENT'); sys.exit(0 if same else 1)
tmp = out + '.tmp'
open(tmp, 'w', encoding='utf-8').write(body); os.replace(tmp, out)
print('wrote', out)
