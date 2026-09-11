# -*- coding: utf-8 -*-
"""옵젝영역0 (사용자 브리핑 2026-09-11): 청록숲9 사원 문을 지나면 나오는 새 지역. 일직선 길 하나 — 바닥은 얕은 물(밟으면 에코 물 발소리 + 물결 고리, tiles.js step),
  주변은 더 울창한 초록숲(보라 나무를 넷에 하나꼴로 섞음), 배경 backdrop obj_forest(초록 덤불 + 보라 먼 층), 브금은 허공처럼 '휘잉' 바람(wind).
  몹 없음. 이벤트: 마나샘(회복 쉼터, 30열 위쪽 — 억빠맨이 발밑 물을 먼저 마시는 개그). 타일·소품: tools/art/obj_set.py, 공용 조각: tools/maps/objlib.py. 오른쪽 출구 → obj1(obj1.py).
실행: /usr/bin/python3 tools/maps/obj0.py  (--check)
"""
import io, json, sys
sys.path.insert(0, 'tools/maps')
from objlib import T, build
W, H, R0, R1 = 60, 14, 6, 8
BLUE_C = 30                            # 마나샘 열(위쪽 숲 띠 가장자리, 길 윗줄에 닿게) — 사용자 2026-09-11 "오브제숲0에 마나샘(회복) 추가"
ents0 = [
    {'type': 'door', 'x': 32, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'teal9', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': R0 * T, 'w': 8, 'h': 96, 'to': 'obj1', 'spawn': 'from_left', 'sfx': False},
    # 마나샘(재사용, id blue): 위쪽 숲 띠 가장자리, 밑동 히트박스(32×12)가 길 윗줄(R0) 바로 위에 닿아 아래에서 C 로 누른다(프로브 19px). 억빠맨이 발밑 물을 먼저 마시는 새 대사(obj0_events.js)
    {'type': 'prop', 'id': 'blue', 'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4}, 'x': BLUE_C * T + 4, 'y': R0 * T - 12, 'w': 32, 'h': 12, 'ix': BLUE_C * T, 'iy': R0 * T - 44, 'solid': True, 'script': 'obj0_blue'},
]
rows0 = build(W, H, R0, R1, ents0, trees=True, clear=[(BLUE_C - 1, BLUE_C + 1, 'top')])   # 마나샘 자리(위쪽 띠)는 나무를 비운다
m0 = {'id': 'obj0', 'name': '옵젝영역', 'bgm': 'wind', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'obj_forest', 'rows': rows0,
      'spawns': {'from_left': {'x': 60, 'y': 7 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 7 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 7 * T + 8, 'facing': 'left'}},
      'meta': {'connected': True, 'road': [R0, R1], 'events': ['blue'], 'trees': len([e for e in ents0 if e.get('id', '').startswith('ot')])},
      'entities': ents0}
path = 'assets/maps/obj0.json'
if '--check' in sys.argv:
    cur = json.loads(io.open(path, encoding='utf-8').read()); print('obj0', 'same' if cur == m0 else 'DIFFERENT'); sys.exit(0 if cur == m0 else 1)
io.open(path, 'w', encoding='utf-8').write(json.dumps(m0, ensure_ascii=False, indent=1)); print('wrote obj0', W, 'x', H, 'trees', m0['meta']['trees'])
