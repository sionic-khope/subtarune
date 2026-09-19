#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_nest.py [--check]
# ──────────────────
"""드럼통 둥지(jjajang_nest, BUILD249 사용자 브리핑 2026-09-19):
"다음맵으로 가면 오른쪽길 1초정도 걷다가 뭔가 둥글게 둥지처럼 지어져있고 뭔가 드럼통 수십개 쌓여있는 스프라이트, 드럼통들이 쓰레기장처럼 널브러져있는 적당히큰 동그라미 공간 보스전 맵 느낌"
"그리고 브금이 꺼져야함" / "가리고 딱 맵 중간 살짝 오른쪽에 상호작용할수있는 드럼통 하나 배치해주고"
- 굽은 물길(jjajang_bend2) 오른쪽 문에서 왼쪽 가장자리(17~18행)로 들어와 오른쪽으로 6칸(≈1.3초) 걸으면 지름 18칸의 동그란 공간. 바닥은 같은 지역 자산(검은 물 '*').
- 둘레는 드럼통 더미(assets/props/jjajang_drum_pile_big|small.png)가 둥지처럼 두르고, 그 바깥은 검은 소나무 숲. 출구는 왼쪽 문 하나. 가운데 드럼통을 두드리면 악마 등장과 전투로 이어진다.
- 브금 없음: 맵 bgm null 이라 changeMap 이 stopBgm(0.4) 한다(JJAJANG_AFTER_JOIN_MAPS 에 넣지 않는다).
- 가운데에서 살짝 오른쪽(중심 +4칸)에 상호작용 드럼통 하나 — C 로 누른다."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_nest'
WIDTH: Final = 30
HEIGHT: Final = 26
TILE: Final = 32
ENTRY_ROWS: Final = (12, 13)          # 왼쪽 입구 길
ENTRY_COLS: Final = (0, 6)            # 1초쯤 걷는 구간 — 스폰(1칸)에서 원 경계(6칸)까지 152px ≈ 1.3초(걷기 120px/s)
CENTER: Final = (15, 13)              # 동그란 공간 중심(칸)
RADIUS: Final = 9                     # 반지름(칸) — 지름 18칸 = 576px. 화면(480)보다 조금 커서 둘러싼 드럼통 벽이 화면에 걸쳐 보인다(둥지 느낌)
DRUM: Final = ('assets/props/jjajang_drum.png', 33, 56)
DRUM_OFFSET: Final = 4                # 상호작용 드럼통은 중심에서 오른쪽 4칸("맵 중간 살짝 오른쪽")
PILE_BIG: Final = ('assets/props/jjajang_drum_pile_big.png', 111, 86)
PILE_SMALL: Final = ('assets/props/jjajang_drum_pile_small.png', 102, 48)
NEAR_BASE: Final = (57.0, 285.3)
FAR_BASE: Final = (196.0, 216.6)
BACK_OFFSET: Final = (176, 121)
PINES: Final = (
    ('assets/props/jjajang_pine_1.png', 141, 157, 100),
    ('assets/props/jjajang_pine_2.png', 135, 159, 30),
    ('assets/props/jjajang_pine_3.png', 108, 167, 60),
    ('assets/props/jjajang_pine_4.png', 167, 146, 58),
)


def pine(index: int, col: int, row: int) -> dict[str, object] | None:
    file, width, height, base_x = PINES[index % len(PINES)]
    cx, base_y = col * TILE + 16, row * TILE + 30
    ix, iy = cx - base_x, base_y - height
    if ix < 0 or iy < 0 or ix + width > WIDTH * TILE or base_y > HEIGHT * TILE:
        return None
    return {
        'type': 'prop', 'id': f'jjajang_pine_{index + 1}', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': ix, 'iy': iy, 'solid': True,
    }


def torii(tag: str, col: int, road_rows: tuple[int, int]) -> list[dict[str, object]]:
    """가까운 기둥 밑동을 길 아래 칸 위쪽 2px 에, 먼 기둥은 계약대로 오른쪽 위(길 위 칸)."""
    near_x = col * TILE + 16
    near_y = (road_rows[1] + 1) * TILE + 2
    ix = round(near_x - NEAR_BASE[0])
    iy = round(near_y - NEAR_BASE[1])
    far_x = ix + FAR_BASE[0]
    far_y = iy + FAR_BASE[1]
    back = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_back', 'image': 'assets/props/jjajang_torii_blue_back.png',
        'x': round(far_x - 12), 'y': round(far_y - 22), 'w': 24, 'h': 22, 'ix': ix + BACK_OFFSET[0], 'iy': iy + BACK_OFFSET[1], 'solid': True,
    }
    front = {
        'type': 'prop', 'id': f'jjajang_torii_blue_{tag}_front', 'image': 'assets/props/jjajang_torii_blue_front.png',
        'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24, 'ix': ix, 'iy': iy, 'solid': True,
    }
    assert (road_rows[0] - 1) * TILE <= back['y'] and back['y'] + back['h'] <= road_rows[0] * TILE, '먼 기둥 히트박스는 길 위 칸 안'
    assert (road_rows[1] + 1) * TILE <= front['y'] and front['y'] + front['h'] <= (road_rows[1] + 2) * TILE, '가까운 기둥 히트박스는 길 아래 칸 안'
    assert iy >= 0
    return [back, front]


def stele(index: int, col: int, road_row: int) -> dict[str, object]:
    """밑동을 길 바로 위 칸(숲)에 두고, 히트박스는 그림 폭 안쪽 — 길에서 C 로 읽는다."""
    file, width, height = STELE
    cx, base_y = col * TILE + 16, road_row * TILE - 2
    return {
        'type': 'prop', 'id': f'jjajang_stele{index}', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12,
        'ix': cx - width // 2, 'iy': base_y - height, 'solid': True, 'script': f'jjajang_stele{index}',
    }




def ring_cells(rows: list[list[str]]) -> list[tuple[int, int, bool]]:
    """둘레를 따라 드럼통 더미를 놓을 자리(칸, 큰 더미 여부). 밑동은 원 바깥(숲)이라 길을 막지 않는다."""
    out: list[tuple[int, int, bool]] = []
    for index in range(20):
        angle = math.tau * index / 20 - math.pi / 2
        col = CENTER[0] + round(math.cos(angle) * (RADIUS + 1.6))
        row = CENTER[1] + round(math.sin(angle) * (RADIUS + 1.6))
        if not (2 <= col < WIDTH - 2 and 2 <= row < HEIGHT - 2):
            continue
        if rows[row][col] != '@':
            continue
        if ENTRY_ROWS[0] - 2 <= row <= ENTRY_ROWS[1] + 2 and col < CENTER[0]:
            continue
        out.append((col, row, index % 2 == 0))
    return out


def pile(index: int, col: int, row: int, big: bool) -> dict[str, object]:
    file, width, height = PILE_BIG if big else PILE_SMALL
    cx, base_y = col * TILE + 16, row * TILE + 28
    return {
        'type': 'prop', 'id': f'jjajang_nest_pile{index}', 'image': file,
        'x': cx - 14, 'y': base_y - 12, 'w': 28, 'h': 12, 'ix': cx - width // 2, 'iy': base_y - height, 'solid': True,
    }


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in ENTRY_ROWS:
        for col in range(ENTRY_COLS[0], ENTRY_COLS[1] + 1):
            rows[row][col] = '*'
        rows[row][0] = '+'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            dx, dy = col - CENTER[0], row - CENTER[1]
            if dx * dx + dy * dy <= RADIUS * RADIUS:
                rows[row][col] = '*'
    # 입구 길과 원이 이어지는지(걸어 들어갈 수 있는지)
    for col in range(ENTRY_COLS[0], CENTER[0]):
        assert rows[ENTRY_ROWS[0]][col] == '*' or rows[ENTRY_ROWS[0]][col] == '+', f'입구가 끊겼다: {col}'
    cells: list[tuple[int, int]] = []
    for col in range(4, WIDTH - 4, 8):
        for row in (3, HEIGHT - 5):
            c, r = col + (row // 8) % 2 * 3, row
            dx, dy = c - CENTER[0], r - CENTER[1]
            if rows[r][c] != '@' or dx * dx + dy * dy <= (RADIUS + 3) ** 2:
                continue
            cells.append((c, r))
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(cells)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    ring = ring_cells(rows)
    piles = [pile(i + 1, col, row, big) for i, (col, row, big) in enumerate(ring)]
    # 공간 안에도 쓰레기장처럼 널브러뜨린다(가운데는 비워 둔다 — 보스전 무대)
    inner = [(CENTER[0] - 6, CENTER[1] - 5), (CENTER[0] + 5, CENTER[1] - 6), (CENTER[0] - 5, CENTER[1] + 5), (CENTER[0] + 6, CENTER[1] + 4), (CENTER[0] + 1, CENTER[1] + 7)]
    for i, (col, row) in enumerate(inner):
        dx, dy = col - CENTER[0], row - CENTER[1]
        assert 16 <= dx * dx + dy * dy <= RADIUS * RADIUS, f'안쪽 더미가 가운데거나 원 밖: {col},{row}'
        piles.append(pile(len(ring) + i + 1, col, row, False))
    assert len(piles) >= 14, f'드럼통 더미가 너무 적다: {len(piles)}'
    # 상호작용 드럼통: 중심에서 오른쪽 DRUM_OFFSET 칸(원 안, 길 위에 서 있다)
    file, width, height = DRUM
    cx, base_y = (CENTER[0] + DRUM_OFFSET) * TILE + 16, CENTER[1] * TILE + 26
    drum = {
        'type': 'prop', 'id': 'jjajang_nest_drum', 'image': file,
        'x': cx - 12, 'y': base_y - 12, 'w': 24, 'h': 12, 'ix': cx - width // 2, 'iy': base_y - height,
        'solid': True, 'script': 'jjajang_nest_drum',
    }
    assert rows[(drum['y'] + 6) // TILE][(drum['x'] + 12) // TILE] == '*', '상호작용 드럼통은 원 안(길 위)'
    assert (CENTER[0] + DRUM_OFFSET) * TILE > WIDTH * TILE / 2, '맵 가운데보다 오른쪽'
    door_west = {
        'type': 'door', 'id': 'nest_bend2_door', 'x': 0, 'y': ENTRY_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_bend2', 'spawn': 'from_east', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '드럼통 둥지',
        'stage': 'ship_sinking_done',
        'bgm': None,
        'dim': 0.08,
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ENTRY_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ENTRY_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_drum': {'x': (CENTER[0] - 3) * TILE + 8, 'y': CENTER[1] * TILE + 6, 'facing': 'right'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ENTRY_ROWS[0]], [CENTER[0], CENTER[1]]],
            'role': '굽은 물길 다음: 왼쪽에서 오른쪽으로 6칸(≈1.3초) 걸으면 드럼통 더미가 둘러싼 지름 18칸의 동그란 공간. 입장 브금 없음. 가운데 오른쪽 4칸의 드럼통을 두드리면 악마 등장과 전투',
            'nest': {'center': list(CENTER), 'radius': RADIUS, 'drumCol': CENTER[0] + DRUM_OFFSET},
        },
        'entities': [*pines, *piles, drum, door_west, {
            'type': 'npc', 'id': 'drum_devil', 'sprite': 'drum_devil',
            'x': cx - 12, 'y': base_y - 16, 'w': 24, 'h': 16,
            'hidden': True, 'solid': False, 'facing': 'left',
        }],
    }


def main() -> None:
    if '--help' in sys.argv:
        print(f'Usage: /usr/bin/python3 tools/maps/{MAP_ID}.py [--check]')
        return
    if any(argument != '--check' for argument in sys.argv[1:]):
        print('Unknown argument. Use --help.', file=sys.stderr)
        raise SystemExit(2)
    output = Path(f'assets/maps/{MAP_ID}.json')
    map_data = build_map()
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        print(MAP_ID, 'same' if same else 'DIFFERENT')
        raise SystemExit(0 if same else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, map_data['meta'].get('runs', ''))


if __name__ == '__main__':
    main()
