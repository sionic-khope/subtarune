# -*- coding: utf-8 -*-
"""보라맵11 거대 나무 (사용자 브리핑 2026-09-10: "가로로 조금 긴 맵, 가운데 거대한 나무, 쥰희·경섭 컷신 → 경섭 합류").
44×16 타일, 땅 3~12행. 나무 `tree_big.png`(240×264) 가운데, 밑동만 막힘. 경섭·쥰희·통나무는 `unless: void11_intro`.
브금은 `lancer` 이되 `bgmFlag: void11_intro` — 첫 도착은 조용히 시작하고 컷신이 쥰희 첫 대사에서 켠다. 도착 컷신은 `enter.early`(검은 화면 아래에서 카메라부터).
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
    {'type': 'prop', 'id': 'tree', 'image': 'assets/props/tree_big.png', 'x': TX + 88, 'y': TY + 252 - 12, 'w': 64, 'h': 14, 'ix': TX, 'iy': TY, 'solid': True},
    {'type': 'prop', 'id': 'logs', 'image': 'assets/props/logs.png', 'x': 752, 'y': GY + 6, 'w': 36, 'h': 10, 'ix': 752, 'iy': GY + 16 - 22, 'solid': True, 'unless': 'void11_intro'},
    {'type': 'npc', 'id': 'gyeongsub', 'sprite': 'gyeongsub', 'x': 806, 'y': GY, 'facing': 'right', 'wander': 0, 'unless': 'void11_intro'},
    {'type': 'npc', 'id': 'junhee', 'sprite': 'junhee', 'x': 892, 'y': GY, 'facing': 'left', 'wander': 0, 'unless': 'void11_intro'},
    {'type': 'door', 'x': 32, 'y': 96, 'w': 8, 'h': 320, 'to': 'void10', 'spawn': 'goal', 'sfx': False},
    {'type': 'door', 'x': (W - 1) * 32 - 8, 'y': 96, 'w': 8, 'h': 320, 'to': 'void12', 'spawn': 'from_left', 'sfx': False},
]
m = {'id': 'void11', 'name': '???', 'bgm': 'lancer', 'bgmFlag': 'void11_intro', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'purple_fire',
     'enter': {'script': 'void11_intro', 'flag': 'void11_intro', 'early': True},
     'rows': rows,
     'spawns': {'start': {'x': 340, 'y': GY + 6, 'facing': 'right'}, 'from_left': {'x': 60, 'y': GY + 6, 'facing': 'right'}, 'landing': {'x': 1330, 'y': GY + 6, 'facing': 'left'}},
     'entities': ents}
m12 = {'id': 'void12', 'name': '???', 'bgm': 'lancer', 'stage': 'void_fallen', 'dim': 0, 'backdrop': 'purple_fire',
       'rows': [' ' * 16] * 4 + [' ' + ''.join(g(r, c) for c in range(1, 15)) + ' ' for r in range(4, 8)] + [' ' + 'y' * 14 + ' '] + [' ' * 16] * 3,
       'spawns': {'from_left': {'x': 60, 'y': 184, 'facing': 'right'}, 'start': {'x': 60, 'y': 184}},
       'entities': [{'type': 'door', 'x': 32, 'y': 128, 'w': 12, 'h': 128, 'to': 'void11', 'spawn': 'landing', 'sfx': False}]}
if '--check' in sys.argv:
    ok = json.loads(io.open('assets/maps/void11.json', encoding='utf-8').read()) == m and json.loads(io.open('assets/maps/void12.json', encoding='utf-8').read()) == m12
    print('void11/12', 'same' if ok else 'DIFFERENT'); sys.exit(0 if ok else 1)
io.open('assets/maps/void11.json', 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
io.open('assets/maps/void12.json', 'w', encoding='utf-8').write(json.dumps(m12, ensure_ascii=False, indent=1))
print('wrote void11 (44x16) + void12 placeholder')
