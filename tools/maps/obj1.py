# -*- coding: utf-8 -*-
"""옵젝영역1 (사용자 브리핑 2026-09-11): 옵젝영역0 과 같은 얕은 물 길인데 세로로만 넓다(길 6줄). 넘어오면 연출 시작(src/data/cutscenes/obj1_cannon.js):
  가운데쯤에서 쥰희·용준이 나무 대포(PR #15 wooden_cannon.png 128×128, 바닥 앵커 64,119)를 한 칸씩 힘들게 민다(허이얍/흐이야아압, 드륵) → 카메라 주인공으로 → 주인공이 그 앞까지 가면(트리거) 만남 연출
  → 용준의 대포 자랑(두구두구 → 줌 → 빰빠밤) → 쥰희 "다 닥쳐!!!"(브금 off) → 쥰희가 오른쪽으로 달려 맵 밖으로(Y 막힌 물이 가장자리까지) → 용준 "미는 것 좀 도와주실 수 있나요?" → 다시 말 걸면 obj1_push(한 줄로 서기 → 준비(브금 off) → 밀어!!(쿵) → C 연타 100(브금 rude_buster) → 용준 등에 불 → 로켓 발사(브금 off, 카메라 추적) → 3초 뒤 쿠구구궁 → 셋 . . . → 6줄 → 브금 wind).
  브금: 맵은 옵젝영역0 과 같은 wind, 연출 중엔 Vs. Lancer(vs_lancer). 오른쪽 출구 → obj2(옵젝영역2 광장, obj2.py).
실행: /usr/bin/python3 tools/maps/obj1.py  (--check)
"""
import io, json, sys
sys.path.insert(0, 'tools/maps')
from objlib import T, build
W, H, R0, R1 = 60, 16, 6, 11
CANNON_C, FOOT_Y, PUSH = 24, 300, 5            # 대포 시작 열, 바닥 앵커 y(길 9행 안), 미는 횟수(한 칸씩)
SCALE = 2                                      # 큰 무기 — 사용자 2026-09-11 "거의 두 배" (그림 256×256, 보이는 몸통 216×158: 원본 bbox x10~118·y40~119 의 2배)
ix, iy = CANNON_C * T, FOOT_Y - 119 * SCALE    # 그림 좌상단 (앵커 64,119 → 128,238)
def cannon(id_, x, extra):                     # 히트박스는 포신 밑동 136×14 (보이는 몸통 x20~236 의 가운데). 밑변은 그림 밑변(iy+256, 아래 여백 18px 포함)에 맞춘다 — props.test '보이는 밑동은 막힘'
    return {'type': 'prop', 'id': id_, 'image': 'assets/props/wooden_cannon.png', 'scale': SCALE, 'x': x + 60, 'y': iy + 128 * SCALE - 14, 'w': 136, 'h': 14, 'ix': x, 'iy': iy, 'solid': True, **extra}
PX = ix + 10 * SCALE - 36                      # 미는 둘: 용준은 보이는 몸통 왼쪽 가장자리(ix+20)에서 8px 띄워(아래 — 대포가 앞에 그려져도 안 겹치게), 쥰희는 그 뒤 60px(위) — 같은 x 에 위아래로 두면 그림이 겹친다(레이아웃 규칙 ③)
JX, JY, YY = PX - 60, 248, 264   # 용준은 길 한가운데 줄(왼쪽 문 스폰·파티가 걷는 y 264)에 세운다 — 아랫줄에 두면 오른쪽으로 걸어갈 때 프로브가 안 닿아 말을 못 건다(2026-09-11 버그)
ents1 = [
    {'type': 'door', 'x': 32, 'y': R0 * T, 'w': 8, 'h': (R1 - R0 + 1) * T, 'to': 'obj0', 'spawn': 'landing', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * T - 8, 'y': R0 * T, 'w': 8, 'h': (R1 - R0 + 1) * T, 'to': 'obj2', 'spawn': 'from_left', 'sfx': False},
    # 연출 전: 대포 + 쥰희·용준(미는 중). 연출이 끝나면(obj1_meet_seen) 5칸 오른쪽의 '연출 후' 것으로 바뀐다(쥰희는 달려 나가고 없음)
    cannon('cannon', ix, {'unless': 'obj1_meet_seen'}),
    {'type': 'npc', 'id': 'junhee', 'sprite': 'junhee', 'x': JX, 'y': JY, 'facing': 'right', 'wander': 0, 'unless': 'obj1_meet_seen'},
    {'type': 'npc', 'id': 'yongjun', 'sprite': 'yongjun', 'x': PX, 'y': YY, 'facing': 'right', 'wander': 0, 'unless': 'obj1_meet_seen'},
    # 연출 후(용준에게 말 걸면 obj1_push: 한 줄로 서서 C 연타 → 불 → 로켓 발사 → 둘 다 사라짐 obj1_launched)
    cannon('cannon_after', ix + PUSH * T, {'requires': 'obj1_meet_seen', 'unless': 'obj1_launched', 'script': 'obj1_cannon_look'}),
    {'type': 'npc', 'id': 'yongjun_after', 'sprite': 'yongjun', 'x': PX + PUSH * T, 'y': YY, 'facing': 'left', 'wander': 0, 'requires': 'obj1_meet_seen', 'unless': 'obj1_launched', 'script': 'obj1_push'},
    # 만남 트리거: 다 민 뒤 쥰희(뒤쪽) 자리에서 2칸 앞(용준에서 4칸), 길 세로 전체. 1회 — 주인공 그림이 쥰희 그림과 안 겹치는 거리
    {'type': 'trigger', 'id': 'meet_trig', 'x': PX + PUSH * T - 128, 'y': R0 * T, 'w': 16, 'h': (R1 - R0 + 1) * T, 'once': True, 'flag': 'obj1_meet_seen', 'script': 'obj1_meet', 'unless': 'obj1_meet_seen'},
]
rows1 = build(W, H, R0, R1, ents1, trees=True, edge_right=True)
m1 = {'id': 'obj1', 'name': '옵젝영역', 'bgm': 'wind', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'obj_forest', 'rows': rows1,
      'spawns': {'from_left': {'x': 60, 'y': 8 * T + 8, 'facing': 'right'}, 'start': {'x': 60, 'y': 8 * T + 8, 'facing': 'right'}, 'landing': {'x': (W - 4) * T, 'y': 8 * T + 8, 'facing': 'left'}, 'meet': {'x': PX + PUSH * T - 210, 'y': 8 * T + 8, 'facing': 'right'}},
      'enter': {'script': 'obj1_arrive'},
      'preload': ['assets/sprites/junhee.png', 'assets/sprites/yongjun.png'],
      'meta': {'connected': True, 'road': [R0, R1], 'cannon': [ix, iy], 'push': PUSH, 'pushers': [JX, JY, PX, YY],
               'cam_group': [CANNON_C + 3.5, 8.25], 'cam_meet': [CANNON_C + 2.9, 8.25],
               'trees': len([e for e in ents1 if e.get('id', '').startswith('ot')])},
      'entities': ents1}
maps = {'obj1': m1}
if '--check' in sys.argv:
    ok = all(json.loads(io.open(f'assets/maps/{k}.json', encoding='utf-8').read()) == v for k, v in maps.items())
    print('obj1', 'same' if ok else 'DIFFERENT'); sys.exit(0 if ok else 1)
for k, v in maps.items(): io.open(f'assets/maps/{k}.json', 'w', encoding='utf-8').write(json.dumps(v, ensure_ascii=False, indent=1))
print('wrote obj1', W, 'x', H, 'trees', m1['meta']['trees'])
