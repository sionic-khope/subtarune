#!/usr/bin/env python3
"""영클 TV 표정 ‘glare’(째려봄) — gpt-image-2 raw(마젠타 배경) → youngcle151 과 같은 규격으로 TV 삽화 + 대화 초상.
   BUILD200 의 손 편집판(tools/art/youngcle_glare_set.py, smirk 픽셀 수정 + 흰 바탕 흑백 초상)은 사용자 “초상화 깨짐”으로 폐기.
   사용: uv run --with pillow --with numpy python assets/source/youngcle-glare-v2/export.py (151 스크립트가 dataclass slots 를 써서 3.10+)"""
import importlib.util, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
HERE = ROOT / 'assets/source/youngcle-glare-v2'
spec = importlib.util.spec_from_file_location('yc151', ROOT / 'assets/source/youngcle151/export.py')
yc = importlib.util.module_from_spec(spec); sys.modules['yc151'] = yc; spec.loader.exec_module(yc)      # clean_magenta / fit_bbox / portrait_from / 규격 상수 재사용

raw = yc.clean_magenta(HERE / 'glare-raw.png')
bbox = raw.getbbox()
logical = yc.fit_bbox(raw, yc.LOGICAL_SIZE, yc.LOGICAL_SIZE[1] / (bbox[3] - bbox[1]))
lb = logical.getbbox()
assert lb and lb[0] > 0 and lb[2] < yc.LOGICAL_SIZE[0], f'logical crop {lb}'
plate = Image.open(yc.PLATE).convert('RGBA')
actor = Image.new('RGBA', yc.NATIVE_SIZE)
big = logical.resize(yc.CONTENT_SIZE, Image.Resampling.NEAREST)
actor.paste(big, (10, 0), big)
final = Image.alpha_composite(plate, actor).convert('RGB')
portrait = yc.portrait_from(logical)
logical.save(HERE / 'logical-glare.png'); raw.save(HERE / 'foreground-raw-glare.png')
final.save(ROOT / 'assets/illustrations/youngcle-tv-glare.png')
portrait.save(ROOT / 'assets/portraits/youngcle_tv_glare.png')
pv = Image.new('RGBA', (yc.NATIVE_SIZE[0] * 2 + 20 + 96 * 2, yc.NATIVE_SIZE[1] * 2), (60, 60, 60, 255))
pv.paste(final.resize((yc.NATIVE_SIZE[0] * 2, yc.NATIVE_SIZE[1] * 2), Image.Resampling.NEAREST), (0, 0))
pv.paste(portrait.resize((192, 192), Image.Resampling.NEAREST).crop((0, 0, 192, yc.NATIVE_SIZE[1] * 2)), (yc.NATIVE_SIZE[0] * 2 + 20, 0))
pv.save(HERE / 'preview.png')
print('glare', 'raw bbox', bbox, 'logical bbox', lb, 'portrait', portrait.size)
