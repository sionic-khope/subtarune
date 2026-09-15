#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle11.py [--check]
# ──────────────────
"""윗길(youngcle10) 위로 올라오면 나오는 무대 홀(2026-09-15 사용자: “세로로 적당히 길고 가로도 적당한 맵, 맨 위에 무대가 크게, 올라가는 계단이 사이드에,
조명·불 다 꺼지고 위에 빨간 커튼이 살짝 올라가 있어 어두워서 검게 가려진 느낌”). 나중에 뚜울라 연출 뒤 델타룬 3장 테나식 리듬 게임이 여기서 열린다(다음 브리핑).
소품은 tools/art/stage_hall_set.py(무대 앞면·계단·커튼 밸런스·꺼진 트러스·어둠 막) + 편집노조 무대의 옆 커튼·스피커 재사용."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle11'
WIDTH: Final = 26
HEIGHT: Final = 26
# 관객(BUILD179, 사용자 아이디어): 입장 연출에서 뚜울라가 부르면 아래 문에서 걸어 들어와 홀 아래쪽(rows 16~22)을 채운다. 파크가디언·비데·도트마리오 + 엑스트라.
# 연출 뒤 재입장은 여기 자리 그대로(requires). 4줄 × 7칸, 살짝 흔들린 자리. 줄(stage11_rope) 아래로는 못 내려간다
CROWD_SPRITES: Final = (
    ('park_guardian_costume', 1.6), ('warm_bidet', 1.0), ('mini_mario', 1.0), ('lucky_guy', 1.0), ('naram', 1.0), ('eunbyeol', 1.0), ('expelled_viewer', 1.0),
    ('yakulbeol', 1.0), ('mabaem', 1.0), ('parkwonsung', 1.0), ('yerim', 1.0), ('chakgeom', 1.0), ('parang', 1.0), ('norang', 1.0),
    ('wemix', 1.0), ('seopnyang', 1.0), ('gyeongnyang', 1.0), ('lucky_guy', 1.0), ('naram', 1.0), ('parang', 1.0), ('norang', 1.0),
    ('eunbyeol', 1.0), ('yakulbeol', 1.0), ('mabaem', 1.0), ('chakgeom', 1.0), ('yerim', 1.0), ('expelled_viewer', 1.0), ('wemix', 1.0),
)
CROWD_SPOTS: Final = [
    (100 + col * 96 + ((row * 37 + col * 53) % 21 - 10), 548 + row * 50 + ((row * 29 + col * 17) % 13 - 6))
    for row in range(4) for col in range(7)
]
# 줄 사이 32px 틈(x384~416)은 관객 하나(crowd_3)가 정확히 막고 선다
CROWD_SPOTS[3] = (404, 540)


def main() -> None:
    """Write the stage hall or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    # 무대(위쪽, rows 2~7 · cols 3~22), 무대 앞면 row 8 은 막힘(계단 cols 3~4·21~22 만 열림), 홀 rows 9~23 · cols 1~24
    for row in range(2, 8):
        for col in range(3, 23):
            cells[row][col] = 'I'
    for col in (3, 4, 21, 22):
        cells[8][col] = 'I'
    # 공연 뒤 뚫리는 무대 오른쪽 길(BUILD185 사용자: “무대 오른쪽에 길 뚫어주고”): rows 4~5 · cols 23~24 → youngcle13. 뚫리기 전엔 벽 소품(stage11_right_wall)이 막는다
    for row in (4, 5):
        for col in (23, 24):
            cells[row][col] = 'I'
    for row in range(9, 24):
        for col in range(1, WIDTH - 1):
            cells[row][col] = 'I'
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] != 'I':
                continue
            for delta_row in (-1, 0, 1):
                for delta_col in (-1, 0, 1):
                    edge_row, edge_col = row + delta_row, col + delta_col
                    if (0 <= edge_row < HEIGHT and 0 <= edge_col < WIDTH
                            and cells[edge_row][edge_col] == '!'):
                        cells[edge_row][edge_col] = 'J'
    map_data = {
        'id': MAP_ID, 'name': '엄청 대박인 배 무대 홀', 'stage': 'void_fallen',
        'bgm': None, 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.22,
        # 입장 연출(뚜울라 등장, 무대 불 켜짐)은 페이드가 걷히기 전에 시작(early) — 걸어 들어오는 모습이 페이드인과 겹친다
        'enter': {'script': 'stage_hall_intro', 'early': True},
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png', 'assets/props/hall_carpet.png', 'assets/props/stage_floor.png',
                    'assets/props/stage_front.png', 'assets/props/stage_stairs.png', 'assets/props/stage_valance.png',
                    'assets/props/stage_truss_off.png', 'assets/props/stage_dark.png',
                    'assets/props/editor-union-curtain.png', 'assets/props/editor-union-speaker.png',
                    'assets/props/editor-union-wall-panel.png', 'assets/sprites/ttuulla.png', 'assets/props/stage_rope_l.png', 'assets/props/stage_rope_r.png'],
        'spawns': {
            'start': {'x': 400, 'y': 700, 'facing': 'up'},
            # 윗길(youngcle10)에서 위로 올라올 때(홀 아래 가운데)
            'from_below': {'x': 400, 'y': 700, 'facing': 'up'},
            # 대기실(youngcle12)에서 돌아올 때: 왼쪽 계단 아래
            'from_backstage': {'x': 116, 'y': 304, 'facing': 'down'},
            # 공연 뒤 연출: 무대 가운데(밴드 자리 앞)
            'on_stage': {'x': 416, 'y': 200, 'facing': 'down'},
            # 오른쪽 길(youngcle13)에서 돌아올 때
            'from_right': {'x': 696, 'y': 160, 'facing': 'left'},
        },
        'meta': {'connected': True, 'route': [[12, 22], [12, 10], [3, 8], [12, 4]],
                 'crowd': [{'id': f'crowd_{i}', 'sprite': sprite, 'scale': scale, 'x': x, 'y': y}
                           for i, ((sprite, scale), (x, y)) in enumerate(zip(CROWD_SPRITES, CROWD_SPOTS))],
                 # 밴드 자리(2026-09-15 사용자: 경섭 드럼·형섭 기타·빠맨 보컬 — 스프라이트는 다시 만들 예정): 무대 위 왼쪽·가운데·오른쪽
                 'stage': {'center': [416, 160], 'left_stairs': [96, 256], 'right_stairs': [672, 256],
                           'drums': [256, 184], 'guitar': [416, 196], 'vocal': [576, 184], 'ttuulla': [416, 120]}},
        'entities': [
            # 바닥 그림(BUILD180 생성 텍스처): 무대는 검은 판자, 홀은 마룬 카펫 — 타일 위에 깔리는 큰 소품(막힘 없음)
            {'type': 'prop', 'id': 'stage11_floor', 'image': 'assets/props/stage_floor.png',
             'x': 96, 'y': 64, 'w': 640, 'h': 192, 'solid': False, 'sortY': -996},
            {'type': 'prop', 'id': 'hall11_carpet', 'image': 'assets/props/hall_carpet.png',
             'x': 32, 'y': 288, 'w': 768, 'h': 480, 'solid': False, 'sortY': -997},
            # 홀 아래 가운데 → 윗길(from_hall). 열린 통로라 C 없이 방향키로 통과
            {'type': 'door', 'id': 'youngcle11_down', 'x': 352, 'y': 752, 'w': 128, 'h': 16,
             'to': 'youngcle10', 'spawn': 'from_hall', 'sfx': False, 'interact': False},
            # 양쪽 계단 꼭대기 → 무대 뒷편 대기실(youngcle12). 계단으로 올라가면 바로 대기실이 나온다(사용자). 연출의 뚜울라(NPC)는 문을 안 밟는다
            *[{'type': 'door', 'id': f'youngcle11_stairs_{side}', 'x': x, 'y': 224, 'w': 64, 'h': 16,
               'to': 'youngcle12', 'spawn': 'from_stairs', 'sfx': False, 'interact': False}
              for side, x in (('l', 96), ('r', 672))],
            # 무대 오른쪽 길: 공연 뒤(stage_show_done) 문이 열린다. 그 전엔 벽 판이 막고(unless), 연출이 remove 로 뚫는다
            {'type': 'door', 'id': 'youngcle11_right', 'x': 784, 'y': 128, 'w': 16, 'h': 64,
             'to': 'youngcle13', 'spawn': 'left', 'sfx': False, 'interact': False, 'requires': 'stage_show_done', 'lockedScript': 'stage_right_locked'},
            {'type': 'prop', 'id': 'stage11_right_wall', 'image': 'assets/props/editor-union-wall-panel.png',
             'x': 736, 'y': 128, 'w': 64, 'h': 64, 'ix': 736, 'iy': 116, 'solid': True, 'sortY': 200, 'unless': 'stage_show_done'},
            {'type': 'sign', 'id': 'stage11_right_gate', 'x': 752, 'y': 160, 'w': 1, 'h': 1, 'solid': False},
            # 무대 가운데 기준물(연출 rel 용) + 어둠 속에 서 있는 뚜울라(연출에서 show, 연출 뒤엔 unless)
            {'type': 'sign', 'id': 'stage11_center', 'x': 416, 'y': 160, 'w': 1, 'h': 1, 'solid': False},
            {'type': 'npc', 'id': 'ttuulla', 'sprite': 'ttuulla', 'x': 416, 'y': 120, 'facing': 'down', 'wander': 0,
             'visualScale': 1.79, 'hidden': True, 'solid': False, 'unless': 'stage_hall_intro_done'},
            # 연출 뒤 재입장: 무대 가운데에서 기다리는 뚜울라(리듬 게임 브리핑 뒤 여기서 승부가 시작된다)
            # 공연(리듬 게임)이 끝나면 사라진다 — 공연 뒤 연출의 ttuulla_show 와 겹쳐 ‘땅 파고 사라졌는데 뚜울라가 남는’ 버그(BUILD188 포스트모텀)
            {'type': 'npc', 'id': 'ttuulla_wait', 'sprite': 'ttuulla', 'x': 416, 'y': 105, 'facing': 'down', 'wander': 0,
             'visualScale': 1.79, 'solid': False, 'requires': 'stage_hall_intro_done', 'unless': 'rhythm_stage_done'},
            # 벽 패널(위 벽), 꺼진 조명 트러스 셋(무대 위 벽)
            *[{'type': 'prop', 'id': f'stage11_wall_{index}', 'image': 'assets/props/editor-union-wall-panel.png',
               'x': x, 'y': 0, 'w': 128, 'h': 76, 'solid': False, 'sortY': -980}
              for index, x in enumerate((0, 704))],
            *[{'type': 'prop', 'id': f'stage11_truss_{index}', 'image': 'assets/props/stage_truss_off.png',
               'x': x, 'y': 0, 'w': 218, 'h': 40, 'solid': False, 'sortY': -960}
              for index, x in enumerate((100, 307, 514))],
            # 살짝 올라간 빨간 커튼(무대 위쪽 가로) + 양옆 커튼 + 무대 앞면 + 양옆 계단
            {'type': 'prop', 'id': 'stage11_valance', 'image': 'assets/props/stage_valance.png',
             'x': 96, 'y': 36, 'w': 640, 'h': 48, 'solid': False, 'sortY': -940},
            *[{'type': 'prop', 'id': f'stage11_curtain_{index}', 'image': 'assets/props/editor-union-curtain.png',
               'x': x, 'y': 64, 'w': 96, 'h': 124, 'solid': False, 'sortY': -930}
              for index, x in enumerate((96, 640))],
            {'type': 'prop', 'id': 'stage11_front', 'image': 'assets/props/stage_front.png',
             'x': 160, 'y': 256, 'w': 512, 'h': 32, 'solid': False, 'sortY': -900},
            *[{'type': 'prop', 'id': f'stage11_stairs_{index}', 'image': 'assets/props/stage_stairs.png',
               'x': x, 'y': 248, 'w': 64, 'h': 40, 'solid': False, 'sortY': -900}
              for index, x in enumerate((96, 672))],
            # 홀 바닥 양옆 스피커(막힘) — 왼쪽은 대기실 복귀 스폰(116,304) 타일을 피해 아래로
            *[{'type': 'prop', 'id': f'stage11_speaker_{index}', 'image': 'assets/props/editor-union-speaker.png',
               'x': x, 'y': y, 'w': 64, 'h': 88, 'solid': True}
              for index, (x, y) in enumerate(((32, 344), (728, 300)))],
            # 관객(연출 뒤 재입장용, 연출 중엔 컷신이 같은 id 로 spawn 해 걸어 들어온다) + 관객석 줄(막힘)
            *[{'type': 'npc', 'id': f'crowd_{i}', 'sprite': sprite, 'x': x, 'y': y, 'facing': 'up', 'wander': 0,
               'visualScale': scale, 'solid': True, 'requires': 'stage_hall_intro_done'}
              for i, ((sprite, scale), (x, y)) in enumerate(zip(CROWD_SPRITES, CROWD_SPOTS))],
            *[{'type': 'prop', 'id': f'stage11_rope_{side}', 'image': f'assets/props/stage_rope_{side}.png',
               'x': x, 'y': 500, 'w': w, 'h': 12, 'ix': x, 'iy': 494, 'solid': True, 'sortY': 520, 'requires': 'stage_hall_intro_done'}
              for side, x, w in (('l', 32, 352), ('r', 416, 384))],
            # 어둠 막: 무대 전체(커튼·트러스·무대 위 사람까지)를 검게 — 조명이 켜지는 연출 때 remove
            {'type': 'prop', 'id': 'stage11_dark', 'image': 'assets/props/stage_dark.png',
             'x': 96, 'y': 32, 'w': 640, 'h': 232, 'solid': False, 'sortY': 9000, 'unless': 'stage_hall_lit'},
        ],
    }
    output = Path(f'assets/maps/{MAP_ID}.json')
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == map_data
        registered = MAP_ID in index['maps']
        print(MAP_ID, 'same' if same and registered else 'DIFFERENT')
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(map_data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if MAP_ID not in index['maps']:
        index['maps'].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT)


if __name__ == '__main__':
    main()
