#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_torii.py [--check]
# ──────────────────
"""짜장 토리이 길(jjajang_torii, BUILD226 사용자 브리핑 2026-09-18):
"그 다음 맵은 위쪽 두 칸 + 오른쪽으로 쭉 이어져 있는 길로 만들어 주고, 중간중간 총 3개 일정 간격으로 토리이가 대각선으로 통로로 있게(길 안에 까는 게 아님),
[후시미 이나리 사진] 이런 디자인으로. 맵이 살짝 어두워서 화면 전체가 다 보이는 게 아니고 주인공 기준 3분의 2 원만 보이게, 겉으로 갈수록 점점 노이즈 어둠이 차게."
- 짜장숲 위 가장자리에서 들어와(아래 가장자리 문) 두 칸 올라간 뒤 오른쪽 끝까지 이어지는 2칸 폭 길. 길 타일은 숲과 같은 '$'(옵젝영역0 에코 발소리).
- 토리이 3개: gpt-image-2.5-sunburst 로 만든 대각선 3/4 시점 문(assets/source/jjajang-torii-v1). 가까운 기둥은 길 아래 칸(row 10), 먼 기둥은 길 위 칸(row 7)에 서고
  대들보가 길 위를 가로지른다 — 길 안에 놓지 않는다. 깊이: 먼 기둥대(back)는 캐릭터 뒤, 대들보+가까운 기둥(front)은 캐릭터 앞.
- 시야: 맵 `vision`(주인공 중심 반지름 125 맑음 → 205 까지 노이즈 알갱이가 차오르고 246 부터 완전히 검음) — src/main.js drawVision.
- 이벤트: 두 번째 토리이를 지나면(35~36열 트리거) 청소부(허약) 합류 컷신 `torii_janitor`(src/data/cutscenes/jjajang_torii.js). 스폰 before_janitor/after_janitor 는 QA 지점용.
- 오른쪽 끝은 다음 맵 자리(통로만 열림, 문 없음 — 브리핑 대기). 브금은 숲과 같은 wind(지정 없음, 같은 구역 이어짐)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_torii'
WIDTH: Final = 48
HEIGHT: Final = 14
TILE: Final = 32
STUB_LEFT: Final = 9
STUB_RIGHT: Final = 10
ROAD_TOP: Final = 8
ROAD_BOTTOM: Final = 9
# 토리이 export 계약(assets/source/jjajang-torii-v1/runtime-contract.json, 배율 0.3): 축소 이미지 246×285 안 기둥 밑동 바닥 중앙
TORII_SIZE: Final = (246, 285)
NEAR_BASE: Final = (57.0, 285.3)
FAR_BASE: Final = (196.0, 216.6)
# 뒤 조각(먼 기둥대)은 자기 bbox 로 잘라 저장 — 전체 캔버스 기준 오프셋(runtime-contract backOffset)
BACK_OFFSET: Final = (176, 121)
TORII_COLS: Final = (16, 28, 40)


def tree(tree_id: str, col: int, row: int, variant: int) -> dict[str, object]:
    return {
        'type': 'prop', 'id': tree_id, 'image': f'assets/props/jjajang_tree_{variant}.png', 'scale': 2,
        'x': col * TILE + 23, 'y': row * TILE + 118, 'w': 18, 'h': 10, 'ix': col * TILE, 'iy': row * TILE, 'solid': True,
    }


def torii(index: int, col: int) -> list[dict[str, object]]:
    """가까운 기둥 밑동을 (col 칸 가운데, row 10 위쪽 2px) 에 둔다. 먼 기둥 밑동은 이미지 계약대로 오른쪽 위(row 7)로 떨어진다."""
    near_x = col * TILE + 16
    near_y = (ROAD_BOTTOM + 1) * TILE + 2
    ix = round(near_x - NEAR_BASE[0])
    iy = round(near_y - NEAR_BASE[1])
    far_x = ix + FAR_BASE[0]
    far_y = iy + FAR_BASE[1]
    back = {
        'type': 'prop', 'id': f'jjajang_torii_{index}_back', 'image': 'assets/props/jjajang_torii_back.png',
        'x': round(far_x - 12), 'y': round(far_y - 22), 'w': 24, 'h': 22, 'ix': ix + BACK_OFFSET[0], 'iy': iy + BACK_OFFSET[1], 'solid': True,
    }
    front = {
        'type': 'prop', 'id': f'jjajang_torii_{index}_front', 'image': 'assets/props/jjajang_torii_front.png',
        'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24, 'ix': ix, 'iy': iy, 'solid': True,
    }
    assert (ROAD_TOP - 1) * TILE <= back['y'] and back['y'] + back['h'] <= ROAD_TOP * TILE, '먼 기둥 히트박스는 길 위 칸(row 7) 안'
    assert (ROAD_BOTTOM + 1) * TILE <= front['y'] and front['y'] + front['h'] <= (ROAD_BOTTOM + 2) * TILE, '가까운 기둥 히트박스는 길 아래 칸(row 10) 안'
    return [back, front]


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in (ROAD_TOP, ROAD_BOTTOM):
        for col in range(STUB_LEFT, WIDTH):
            rows[row][col] = '$'
        rows[row][WIDTH - 1] = '&'
    for row in range(ROAD_BOTTOM + 1, HEIGHT):
        for col in range(STUB_LEFT, STUB_RIGHT + 1):
            rows[row][col] = '$'
    for col in range(STUB_LEFT, STUB_RIGHT + 1):
        rows[HEIGHT - 1][col] = '&'
    gates = [piece for index, col in enumerate(TORII_COLS) for piece in torii(index + 1, col)]
    # 나무: 길 위(0~4행)·아래(11~12행) 숲, 토리이 그림 폭(가까운 기둥 기준 -2~+7칸)과 입구 줄기(8~11열)는 비운다
    blocked_cols = {c for col in TORII_COLS for c in range(col - 2, col + 8)}
    tree_cells: list[tuple[int, int]] = []
    for row in (0, 3, 11):
        offset = (row // 3) % 2
        for col in range(offset, WIDTH - 1, 3):
            if col in blocked_cols or (row >= 11 and col in (8, 9, 10, 11)):
                continue
            tree_cells.append((col, row))
    trees = [tree(f'jjajang_tree_{index + 1}', col, row, index % 3 + 1) for index, (col, row) in enumerate(tree_cells)]
    # 두 번째 토리이(28열, 그림은 34열까지)를 지나면 청소부 이벤트(BUILD226): 35~36열 길 전체를 덮는 트리거, 한 번만
    janitor_trigger = {
        'type': 'trigger', 'id': 'torii_janitor_trigger', 'x': 35 * TILE, 'y': ROAD_TOP * TILE, 'w': 2 * TILE, 'h': 2 * TILE,
        'once': True, 'flag': 'torii_janitor_started', 'unless': 'torii_janitor_joined', 'script': 'torii_janitor',
    }
    door_back = {
        'type': 'door', 'id': 'torii_forest_door', 'x': STUB_LEFT * TILE, 'y': HEIGHT * TILE - 10, 'w': 2 * TILE, 'h': 10,
        'to': 'jjajang_forest', 'spawn': 'from_north', 'sfx': False,
    }
    return {
        'id': MAP_ID,
        'name': '짜장 토리이 길',
        'stage': 'ship_sinking_done',
        'bgm': 'wind',
        'dim': 0,
        'vision': {'radius': 125, 'edge': 205, 'noise': 0.5},
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_forest': {'x': 10 * TILE - 8, 'y': (HEIGHT - 2) * TILE + 12, 'facing': 'up'},
            'start': {'x': 10 * TILE - 8, 'y': (HEIGHT - 2) * TILE + 12, 'facing': 'up'},
            'from_east': {'x': (WIDTH - 3) * TILE, 'y': ROAD_TOP * TILE + 16, 'facing': 'left'},
            'before_janitor': {'x': 32 * TILE + 8, 'y': ROAD_TOP * TILE + 6, 'facing': 'right'},
            'after_janitor': {'x': 38 * TILE + 8, 'y': ROAD_TOP * TILE + 6, 'facing': 'right'},
        },
        'meta': {
            'connected': True,
            'route': [[10, HEIGHT - 2], [10, ROAD_TOP], [WIDTH - 2, ROAD_TOP]],
            'role': '짜장숲 다음: 두 칸 위 → 오른쪽 직선 길, 대각선 토리이 3개, 주인공 중심 원형 시야(vision). 오른쪽 끝 다음 맵은 브리핑 대기',
            'torii': [{'col': col, 'nearBase': [col * TILE + 16, (ROAD_BOTTOM + 1) * TILE + 2]} for col in TORII_COLS],
        },
        'entities': [*trees, *gates, janitor_trigger, door_back],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_torii.py [--check]')
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
