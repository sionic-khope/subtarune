# -*- coding: utf-8 -*-
"""보라맵11 거대 나무 (사용자 브리핑 2026-09-10: "가로로 조금 긴 맵, 가운데 거대한 나무, 쥰희·경섭 컷신 → 경섭 합류").
44×16 타일, 땅 3~12행. 나무 `tree_big.png`(240×264) 가운데, 밑동만 막힘. 경섭·쥰희·통나무는 `unless: void11_intro`.
맵 브금은 없음(`bgm: null` — 들어오면 조용). 컷신이 쥰희 첫 대사에서 Lancer 를 켜고 경섭이 동료가 된 뒤 끈다. 도착 컷신: 형섭이 보이는 상태에서 카메라가 오른쪽으로 이동(검은 화면 아래 컷 금지 — 사용자 규칙).
실행: /usr/bin/python3 tools/maps/void11.py  (--check)
"""
import io, json, sys
W, H = 44, 16
rows = [[' '] * W for _ in range(H)]
def g(r, c): return 'x' if (r + c) % 2 == 0 else 'X'
for r in range(3, 13):
    for c in range(1, W - 1): rows[r][c] = g(r, c)
for c in range(1, W - 1): rows[13][c] = 'y'
rows = [''.join(r) for r in rows]
TX, TY = 584, 66                                   # 나무 그림 왼쪽 위 (밑동 바닥 y = 66 + 252 = 318)
GY = 330                                            # 캐릭터 발 y (히트박스 y)
ents = [
    {'type': 'prop', 'id': 'tree', 'image': 'assets/props/tree_big.png', 'x': TX + 88, 'y': TY + 252 - 12, 'w': 64, 'h': 14, 'ix': TX, 'iy': TY, 'solid': True, 'script': 'void11_tree_look'},   # C: "나무다 베인 흔적이 있다." + 경섭 합류 후 빠맨·경섭 대화
    {'type': 'prop', 'id': 'logs', 'image': 'assets/props/logs.png', 'x': 752, 'y': GY + 6, 'w': 36, 'h': 10, 'ix': 752, 'iy': GY + 16 - 22, 'solid': True, 'unless': 'void11_intro'},
    {'type': 'npc', 'id': 'gyeongsub', 'sprite': 'gyeongsub', 'x': 806, 'y': GY, 'facing': 'right', 'wander': 0, 'unless': 'void11_intro'},
    {'type': 'npc', 'id': 'junhee', 'sprite': 'junhee', 'x': 892, 'y': GY, 'facing': 'left', 'wander': 0, 'unless': 'void11_intro'},
    {'type': 'door', 'x': 32, 'y': 96, 'w': 8, 'h': 320, 'to': 'void10', 'spawn': 'goal', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * 32 - 8, 'y': 96, 'w': 8, 'h': 320, 'to': 'teal1', 'spawn': 'from_left', 'sfx': False},   # 청록숲 1
]
m = {'id': 'void11', 'name': '???', 'bgm': None, 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'purple_fire',
     'enter': {'script': 'void11_intro', 'flag': 'void11_intro'},
     'rows': rows,
     'spawns': {'start': {'x': 340, 'y': GY + 6, 'facing': 'right'}, 'from_left': {'x': 60, 'y': GY + 6, 'facing': 'right'}, 'landing': {'x': 1330, 'y': GY + 6, 'facing': 'left'}},
     'entities': ents}
if '--check' in sys.argv:
    ok = json.loads(io.open('assets/maps/void11.json', encoding='utf-8').read()) == m
    print('void11', 'same' if ok else 'DIFFERENT'); sys.exit(0 if ok else 1)
io.open('assets/maps/void11.json', 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
print('wrote void11 (44x16)')
