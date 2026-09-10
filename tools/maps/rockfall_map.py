# -*- coding: utf-8 -*-
"""낙석 맵 생성기 (재사용). 보라 길 3줄 + 낙석 레인 n개 + 출입구를 규칙대로 뽑는다.
규칙(2026-09-10 사용자 확정): 입구에서 8타일 뒤 첫 레인, 레인 간격 5타일, 마지막 레인 뒤 6타일, 길은 3줄, dim 0.3, 소리 없음.

실행 예:
  /usr/bin/python3 tools/maps/rockfall_map.py void9 --rocks 6 --entry top --exit down \
      --prev void8 --prev-spawn door_back --next void10 --next-spawn from_top
그 뒤 assets/maps/index.json 에 id 추가 + src/core/story.js QA_POINTS 한 줄 + 이전 맵 door 의 to/spawn 연결.
현재 void5/6/7 은 이 스크립트로 만든 것과 동일하다 (`--check` 로 확인).
"""
import argparse, io, json, sys

RUN, SP, TAIL = 8, 5, 6            # 도입 여유 / 레인 간격 / 꼬리 (타일)
PATH_ROWS = (5, 6, 7)              # 가로 길 3줄
GROUND = 250                       # 바위 아래쪽 y (길 맨 아랫줄 안)
ROCK = {'image': 'assets/props/rock.png', 'period': 2.0, 'warn': 0.8, 'fall': 0.4, 'rest': 0.45}


def ground(r, c): return 'x' if (r + c) % 2 == 0 else 'X'


def build(mid, n, entry, exit_kind, prev, prev_spawn, nxt, nxt_spawn):
    first = 1 + (3 if entry == 'top' else 0) + RUN
    lanes = [first + SP * i for i in range(n)]
    last = lanes[-1]
    if exit_kind == 'down':
        W = last + TAIL + 1 + 3 + 1
        H = 13 if entry == 'left' else 14
    else:
        W = last + TAIL + 1 + 1; H = 14
    rows = [[' '] * W for _ in range(H)]
    for r in PATH_ROWS:
        for c in range(1, W - 1): rows[r][c] = ground(r, c)
    for c in range(1, W - 1): rows[8][c] = 'y'
    if entry == 'top':
        for r in range(1, 5):
            for c in range(1, 4): rows[r][c] = ground(r, c)
    if exit_kind == 'down':
        ex = range(W - 4, W - 1)
        for r in range(8, H - 1):
            for c in ex: rows[r][c] = ground(r, c)
        for c in ex: rows[H - 1][c] = 'y'
    rows = [''.join(r) for r in rows]
    ents = []
    if entry == 'left': ents.append({'type': 'door', 'x': 32, 'y': 160, 'w': 12, 'h': 96, 'to': prev, 'spawn': prev_spawn, 'sfx': False})
    else: ents.append({'type': 'door', 'x': 32, 'y': 32, 'w': 96, 'h': 10, 'to': prev, 'spawn': prev_spawn, 'sfx': False})
    for i, col in enumerate(lanes):
        ents.append({'type': 'rockfall', 'image': ROCK['image'], 'x': col * 32 + 16, 'ground': GROUND, 'period': ROCK['period'], 'offset': round((i % 3) * 0.667, 3), 'warn': ROCK['warn'], 'fall': ROCK['fall'], 'rest': ROCK['rest']})
    if exit_kind == 'down':
        ents.append({'type': 'door', 'x': (W - 4) * 32, 'y': (H - 1) * 32 - 12, 'w': 96, 'h': 12, 'to': nxt, 'spawn': nxt_spawn, 'sfx': False})
        back = {'x': (W - 4) * 32 + 32, 'y': (H - 2) * 32, 'facing': 'up'}
    else:
        ents.append({'type': 'door', 'x': (W - 1) * 32 - 12, 'y': 160, 'w': 12, 'h': 96, 'to': nxt, 'spawn': nxt_spawn, 'sfx': False})
        back = {'x': (W - 3) * 32, 'y': 200, 'facing': 'left'}
    if entry == 'left': spawns = {'from_' + prev: {'x': 60, 'y': 200, 'facing': 'right'}, 'start': {'x': 60, 'y': 200}, 'door_back': back}
    else: spawns = {'from_top': {'x': 64, 'y': 58, 'facing': 'down'}, 'start': {'x': 64, 'y': 58}, 'door_back': back}
    return {'id': mid, 'name': '???', 'bgm': 'scarlet', 'stage': 'void_fallen', 'dim': 0.3, 'backdrop': 'purple_fire', 'rows': rows, 'spawns': spawns, 'entities': ents}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('id'); ap.add_argument('--rocks', type=int, required=True)
    ap.add_argument('--entry', choices=['left', 'top'], default='top'); ap.add_argument('--exit', choices=['down', 'right'], default='down')
    ap.add_argument('--prev', required=True); ap.add_argument('--prev-spawn', default='door_back')
    ap.add_argument('--next', required=True); ap.add_argument('--next-spawn', default='from_top')
    ap.add_argument('--check', action='store_true', help='쓰지 않고 기존 파일과 같은지만 본다')
    a = ap.parse_args()
    m = build(a.id, a.rocks, a.entry, a.exit, a.prev, a.prev_spawn, a.next, a.next_spawn)
    path = 'assets/maps/%s.json' % a.id
    if a.check:
        cur = json.loads(io.open(path, encoding='utf-8').read())
        same = cur == m; print(a.id, 'same' if same else 'DIFFERENT'); sys.exit(0 if same else 1)
    io.open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
    print('wrote', path, 'cols', len(m['rows'][0]), 'rows', len(m['rows']), 'lanes', [e['x'] for e in m['entities'] if e['type'] == 'rockfall'])


if __name__ == '__main__':
    main()
