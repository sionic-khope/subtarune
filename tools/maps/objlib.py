# -*- coding: utf-8 -*-
"""옵젝영역(obj0~) 생성기 공용 조각: 얕은 물 길(a/A/j) + 둘레 2칸 숲 바닥(c) + 절벽(V) + 나무(tree_obj / 넷에 하나 tree_obj_purple, 밑동은 숲 바닥 위·길 밖).
   obj0.py / obj1.py 가 import 한다(직접 실행 없음 — check.sh 는 --check 인자 처리가 없는 파일을 건너뛴다)."""
T = 32
def water(r, c):
    """얕은 물 두 변형 체커 + 수련잎(드문드문, 입구 4칸은 비움)"""
    if 4 <= c and (r * 7 + c * 5) % 19 == 0: return 'j'
    return 'a' if (r + c) % 2 == 0 else 'A'
def build(W, H, R0, R1, ents, trees=True, clear=(), edge_right=False, prefix='ot'):
    """rows 를 만들고 ents 에 나무 소품을 붙인다.
       clear: [(c0, c1, 'top'|'bottom')] — 그 열 범위의 위/아래 숲 띠에는 나무를 심지 않는다(소품 자리)
       edge_right: 길 오른쪽 끝(W-1 열)을 'Y'(막힌 물)로 — 컷신 NPC 가 맵 밖으로 달려 나가는 바닥(공중부양 금지, 가장자리 막힘 규칙 유지)"""
    rows = [[' '] * W for _ in range(H)]
    for r in range(R0, R1 + 1):
        for c in range(1, W - 1): rows[r][c] = water(r, c)
        if edge_right: rows[r][W - 1] = 'Y'
    for r in range(H):                                                                   # 물 둘레 2칸 숲 바닥('c', 막힘) — 나무는 그 위에만
        for c in range(W):
            if rows[r][c] == ' ' and any(0 <= r + dr < H and rows[r + dr][c] in 'aAj' for dr in (-2, -1, 1, 2)): rows[r][c] = 'c'
    for r in range(1, H):
        for c in range(W):
            if rows[r][c] == ' ' and rows[r - 1][c] == 'c': rows[r][c] = 'V'                # 숲 바닥 아래 가장자리에 절벽면
    rows = [''.join(r) for r in rows]
    if not trees: return rows
    grid = [list(r) for r in rows]
    def ground(r, c): return 0 <= r < H and 0 <= c < W and grid[r][c] in 'aAj'
    def cleared(r, c): return any(c0 <= c <= c1 and ((side == 'top' and r < R0) or (side == 'bottom' and r > R1)) for (c0, c1, side) in clear)
    spots = []
    for r in range(1, H - 2):
        for c in range(1, W - 2):
            if cleared(r, c): continue
            if grid[r][c] != 'c':
                if grid[r + 1][c] == 'c' and not ground(r + 2, c) and (r * 5 + c * 3) % 3 == 0: spots.append((r, c))   # 위쪽 띠 뒷줄: 그림은 허공 위지만 밑동은 숲 바닥(r+1) — 위도 두 줄로 울창하게
                continue
            near = any(ground(r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
            if near and (r * 5 + c * 3) % 3 == 0: spots.append((r, c))                      # 길가는 빽빽하게
            elif near and (r * 7 + c * 5) % 4 == 0: spots.append((r, c))
            elif not near and (r * 11 + c * 7) % 5 == 0: spots.append((r, c))
    seen = set()
    for j, (r, c) in enumerate(spots):
        x, y = c * T - 12, r * T - 40
        if ground(r + 1, c): y -= T                                                          # 밑동(그림 y+72)이 길 위에 떨어지면 한 칸 올린다 — 나무 밑동은 길 밖(maps-layout 감사)
        if any(abs(x - sx) < 30 and abs(y - sy) < 28 for (sx, sy) in seen): continue
        seen.add((x, y))
        img = 'assets/props/tree_obj_purple.png' if (r * 13 + c * 7) % 4 == 0 else 'assets/props/tree_obj.png'   # 넷에 하나는 보라 나무
        ents.append({'type': 'prop', 'id': f'{prefix}{j}', 'image': img, 'x': x + 16, 'y': y + 72, 'w': 24, 'h': 12, 'ix': x, 'iy': y, 'solid': True})
    return rows
