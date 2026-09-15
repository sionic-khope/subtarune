#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle12.py [--check]
# ──────────────────
"""무대 뒷편 대기실(2026-09-15 사용자: “계단으로 올라가면 무대 뒷편 대기실 같은 가로로 적당히 짧은 맵, 오른쪽 끝에 뚜울라”; BUILD180 개편 “무대 뒷편 느낌이 안 나고 너무 가로로 길다”).
15×12 로 줄이고 생성 소품(assets/source/stage180: 분장 거울·옷걸이·소파·기타 케이스·드럼 케이스·무대 입구 커튼·마룬 카펫)으로 그린룸 분위기.
무대 홀(youngcle11) 양쪽 계단 꼭대기 문에서 들어오고(왼쪽), 오른쪽 끝 무대 입구 커튼 앞의 뚜울라에게 말을 걸면 리듬 게임 연출(`backstage_ttuulla`)."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = 'youngcle12'
WIDTH: Final = 15
HEIGHT: Final = 12


def main() -> None:
    """Write the backstage room or check its generator output and map registration."""
    cells = [['!'] * WIDTH for _ in range(HEIGHT)]
    for row in range(3, 9):
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
        'id': MAP_ID, 'name': '엄청 대박인 배 무대 뒷편 대기실', 'stage': 'void_fallen',
        'bgm': None, 'backdrop': 'youngcle_factory',
        'battleBg': 'youngcle_factory', 'dim': 0.18,
        'rows': [''.join(row) for row in cells],
        'preload': ['assets/tiles/youngcle_iron.png', 'assets/backdrops/youngcle_factory.png', 'assets/sprites/ttuulla.png',
                    *[f'assets/props/backstage_{name}.png' for name in ('carpet', 'vanity', 'rack', 'couch', 'guitar_case', 'drum_cases', 'curtain_door')]],
        'spawns': {
            'start': {'x': 72, 'y': 200, 'facing': 'right'},
            # 홀 계단 꼭대기 문에서 들어올 때(왼쪽 끝)
            'from_stairs': {'x': 72, 'y': 200, 'facing': 'right'},
        },
        'meta': {'connected': True, 'route': [[2, 6], [12, 6]]},
        'entities': [
            # 왼쪽 끝 → 무대 홀(왼쪽 계단 아래). 열린 통로라 C 없이 방향키로 통과
            {'type': 'door', 'id': 'youngcle12_left', 'x': 32, 'y': 96, 'w': 16, 'h': 192,
             'to': 'youngcle11', 'spawn': 'from_backstage', 'sfx': False, 'interact': False},
            # 마룬 카펫(바닥 위 그림) — 방 가운데
            {'type': 'prop', 'id': 'backstage_carpet', 'image': 'assets/props/backstage_carpet.png',
             'x': 16, 'y': 112, 'w': 448, 'h': 160, 'solid': False, 'sortY': -995},
            # 위 벽: 분장 거울(왼쪽)·옷걸이(가운데) — 그림은 벽에 걸리고 몸(막힘)은 아래 60% 만
            {'type': 'prop', 'id': 'backstage_vanity', 'image': 'assets/props/backstage_vanity.png',
             'x': 60, 'y': 84, 'w': 96, 'h': 40, 'ix': 60, 'iy': 1, 'solid': True, 'sortY': -900},
            {'type': 'prop', 'id': 'backstage_rack', 'image': 'assets/props/backstage_rack.png',
             'x': 192, 'y': 88, 'w': 96, 'h': 36, 'ix': 192, 'iy': 29, 'solid': True, 'sortY': -900},
            # 오른쪽 위: 무대로 나가는 입구 커튼(뚜울라가 그 앞에 선다)
            {'type': 'prop', 'id': 'backstage_curtain_door', 'image': 'assets/props/backstage_curtain_door.png',
             'x': 340, 'y': 100, 'w': 112, 'h': 24, 'ix': 340, 'iy': 3, 'solid': True, 'sortY': -900},
            # 아래쪽: 소파(왼쪽)·드럼 케이스·기타 케이스(오른쪽)
            {'type': 'prop', 'id': 'backstage_couch', 'image': 'assets/props/backstage_couch.png',
             'x': 44, 'y': 236, 'w': 96, 'h': 40, 'ix': 44, 'iy': 178, 'solid': True},
            {'type': 'prop', 'id': 'backstage_drum_cases', 'image': 'assets/props/backstage_drum_cases.png',
             'x': 316, 'y': 244, 'w': 72, 'h': 36, 'ix': 316, 'iy': 177, 'solid': True},
            {'type': 'prop', 'id': 'backstage_guitar_case', 'image': 'assets/props/backstage_guitar_case.png',
             'x': 404, 'y': 252, 'w': 44, 'h': 28, 'ix': 404, 'iy': 220, 'solid': True},
            # 오른쪽 끝, 무대 입구 앞의 뚜울라: 말을 걸면 리듬 게임 연출
            {'type': 'npc', 'id': 'ttuulla_back', 'sprite': 'ttuulla', 'x': 396, 'y': 170, 'facing': 'left', 'wander': 0,
             'visualScale': 1.79, 'solid': True, 'script': 'backstage_ttuulla'},
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
