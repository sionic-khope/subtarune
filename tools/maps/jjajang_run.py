#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from repository root: /usr/bin/python3 tools/maps/jjajang_run.py [--check]
# ──────────────────
"""파란 토리이 길(jjajang_run, BUILD230 사용자 브리핑 2026-09-19):
"오른쪽으로 가는 맵 가면 오른쪽 길 이어져 있고 파란색 호이리(토리이)가 오른쪽 끝에 하나 깔려 있는 맵, 파란색 토리이를 지날 때마다 기믹(검 뽑기 준비 동작 → 잔상 달리기, X 점프, C 베기, 공중 C 회전 베기, 쿠키런처럼 왼쪽에서 계속 달림).
이번 맵은 검은 바닥인데 물 깔린 전제라 한 발자국마다 동그란 파장. 토리이로 달려서 10초쯤 지나면 오른쪽 맵 끝에 도착하게(그만큼 길게)."
- 석상 앞 숲 오른쪽 문에서 왼쪽 가장자리(8~9행)로 들어와 오른쪽 끝까지 곧은 길. 바닥은 새 타일 '*'(검은 물: 물걸음 루프 + 물결 고리), 양 끝 출입구 칸은 '+'(같은 그림의 가장자리 칸). 오른쪽 끝 문 → 토리이 굽이 길(jjajang_run2, BUILD236).
- 28~29열 트리거(토리이 두 기둥이 화면에 든 뒤) → 토리이 앞 청소부 연출(jjajang_run_intro, 한 번). 걷는 구간 0~32열, 파란 토리이(기존 토리이 색 변환 assets/props/jjajang_torii_blue_*.png) 가까운 기둥 30열(길 아래 칸), 먼 기둥은 길 위 칸. 기둥 사이를 지나는 32~33열 트리거(매번, 오른쪽을 볼 때만) → 러너 기믹(src/world/runner.js).
- 달리기 구간 34~196열 ≈ 5200px / 520px/s ≈ 10초 → 맵 오른쪽 안쪽(끝 386px 앞 = 카메라가 끝까지 따라올 수 있는 자리)에서 제동. 소나무·검은 숲은 소나무 숲과 같은 지역 자산, 브금 my_castle_town 이어짐."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Final

MAP_ID: Final = 'jjajang_run'
WIDTH: Final = 209                    # 달리기 구간 ≈ 10초 + 카메라 클램프 여유(리뷰 2026-09-19: 제동·정지도 화면 왼쪽 22% 자리에서)
HEIGHT: Final = 14                    # 토리이 그림(285px)이 길 위로 서려면 길이 8~9행(토리이 길과 같은 높이)
TILE: Final = 32
ROAD_ROWS: Final = (8, 9)
TORII_COL: Final = 30                 # 가까운 기둥 밑동 칸
TRIGGER_COLS: Final = (32, 33)        # 기둥 사이(대각선 문) 를 지나는 자리
INTRO_COLS: Final = (28, 29)          # 토리이 앞 청소부 연출(BUILD235) 트리거 — 토리이 바로 앞(BUILD239: 22~23열은 대사 때 토리이가 화면 오른쪽 밖이라 “보이기도 전에 대사” → 두 기둥이 다 보이는 자리)
RUN_END_MARGIN: Final = 386           # 제동 목표 = 맵 오른쪽 끝 - 386px: 카메라 최대 x(pxW-480) 에서도 캐릭터 가운데가 화면 22%(105.6px) 자리
RUN_SPEED: Final = 520
# assets/source/jjajang-torii-v1/runtime-contract.json (배율 0.3)
NEAR_BASE: Final = (57.0, 285.3)
FAR_BASE: Final = (196.0, 216.6)
BACK_OFFSET: Final = (176, 121)
# assets/source/jjajang-pines-v1/runtime-contract.json (배율 0.345): (파일, 폭, 높이, 밑동 x)
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


def torii(col: int) -> list[dict[str, object]]:
    """토리이 길(jjajang_torii.py) 과 같은 배치: 가까운 기둥 밑동을 길 아래 칸(row 7) 위쪽 2px 에, 먼 기둥은 계약대로 오른쪽 위(row 4)."""
    near_x = col * TILE + 16
    near_y = (ROAD_ROWS[1] + 1) * TILE + 2
    ix = round(near_x - NEAR_BASE[0])
    iy = round(near_y - NEAR_BASE[1])
    far_x = ix + FAR_BASE[0]
    far_y = iy + FAR_BASE[1]
    back = {
        'type': 'prop', 'id': 'jjajang_torii_blue_back', 'image': 'assets/props/jjajang_torii_blue_back.png',
        'x': round(far_x - 12), 'y': round(far_y - 22), 'w': 24, 'h': 22, 'ix': ix + BACK_OFFSET[0], 'iy': iy + BACK_OFFSET[1], 'solid': True,
    }
    front = {
        'type': 'prop', 'id': 'jjajang_torii_blue_front', 'image': 'assets/props/jjajang_torii_blue_front.png',
        'x': near_x - 12, 'y': near_y, 'w': 24, 'h': 24, 'ix': ix, 'iy': iy, 'solid': True,
    }
    assert (ROAD_ROWS[0] - 1) * TILE <= back['y'] and back['y'] + back['h'] <= ROAD_ROWS[0] * TILE, '먼 기둥 히트박스는 길 위 칸 안'
    assert (ROAD_ROWS[1] + 1) * TILE <= front['y'] and front['y'] + front['h'] <= (ROAD_ROWS[1] + 2) * TILE, '가까운 기둥 히트박스는 길 아래 칸 안'
    assert iy >= 0, '토리이 그림이 맵 위로 나간다'
    return [back, front]


def build_map() -> dict[str, object]:
    rows = [['@'] * WIDTH for _ in range(HEIGHT)]
    for row in ROAD_ROWS:
        for col in range(WIDTH):
            rows[row][col] = '*'
        rows[row][0] = '+'
        rows[row][WIDTH - 1] = '+'
    # 소나무: 길 위(5~6행)·아래(11~12행)에 12칸 간격으로 엇갈리게, 토리이 주변(24~40열)은 비운다
    cells: list[tuple[int, int]] = []
    for col in range(6, WIDTH - 6, 12):
        if 24 <= col <= 40:
            continue
        cells.append((col, 6 if (col // 12) % 2 else 5))
        cells.append((col + 6, 12 if (col // 12) % 2 else 11))
    pines = [p for p in (pine(i, col, row) for i, (col, row) in enumerate(cells)) if p]
    for p in pines:
        col, row = (p['x'] + 12) // TILE, (p['y'] + 6) // TILE
        assert rows[row][col] == '@', f'소나무 밑동이 길 위: {col},{row}'
    gate = torii(TORII_COL)
    # 기둥 사이를 지나면(오른쪽을 볼 때만, 스크립트가 판단) 러너 기믹 — once 없음: “파란 토리이를 지날 때마다”
    run_trigger = {
        'type': 'trigger', 'id': 'run_torii_trigger', 'x': TRIGGER_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE,
        'script': 'jjajang_run_start',
    }
    # 토리이 앞 청소부 연출(사용자 브리핑 2026-09-19): 대사 10줄 → 휘리릭 사라짐. 한 번만
    intro_trigger = {
        'type': 'trigger', 'id': 'run_intro_trigger', 'x': INTRO_COLS[0] * TILE, 'y': ROAD_ROWS[0] * TILE, 'w': 2 * TILE, 'h': 2 * TILE,
        'once': True, 'flag': 'run_intro_started', 'unless': 'run_intro_done', 'script': 'jjajang_run_intro',
    }
    # 오른쪽 끝 10px → 토리이 굽이 길(jjajang_run2, BUILD236)
    door_east = {
        'type': 'door', 'id': 'run_run2_door', 'x': WIDTH * TILE - 10, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_run2', 'spawn': 'from_west', 'sfx': False,
    }
    door_west = {
        'type': 'door', 'id': 'run_statue_door', 'x': 0, 'y': ROAD_ROWS[0] * TILE, 'w': 10, 'h': 2 * TILE,
        'to': 'jjajang_statue', 'spawn': 'from_east', 'sfx': False,
    }
    end_x = WIDTH * TILE - RUN_END_MARGIN
    return {
        'id': MAP_ID,
        'name': '파란 토리이 길',
        'stage': 'ship_sinking_done',
        'bgm': 'my_castle_town',
        'dim': 0.08,
        'preload': ['assets/sprites/hyungsub-runner-prep.png', 'assets/sprites/hyungsub-runner-run.png', 'assets/sprites/hyungsub-runner-jump.png', 'assets/sprites/hyungsub-runner-slash.png', 'assets/sprites/hyungsub-runner-upslash.png', 'assets/sprites/hyungsub-runner-airslash.png'],
        'rows': [''.join(row) for row in rows],
        'spawns': {
            'from_west': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'start': {'x': 1 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'before_torii': {'x': 25 * TILE + 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'right'},
            'from_east': {'x': (WIDTH - 2) * TILE - 8, 'y': ROAD_ROWS[0] * TILE + 6, 'facing': 'left'},
        },
        'meta': {
            'connected': True,
            'route': [[1, ROAD_ROWS[0]], [WIDTH - 2, ROAD_ROWS[0]]],
            'role': '석상 앞 숲 다음: 곧은 검은 물길, 30열 파란 토리이를 지나면 러너 기믹으로 오른쪽 끝(제동 목표 ' + str(end_x) + ')까지 약 10초 달린다. 오른쪽 끝 다음 맵 대기. 브금 my_castle_town 이어짐',
            'torii': [TORII_COL, ROAD_ROWS[1] + 1],
            # startX 는 트리거 오른쪽 끝(명목상 출발선). 실제 출발은 트리거 안에서 선 자리(최대 64px 앞)
            # outro: 달리기가 멈추면 runner.finish 가 이 스크립트를 부른다(outroFlag 가 서기 전까지). 그동안 동료는 숨긴 채
            'run': {'startX': (TRIGGER_COLS[1] + 1) * TILE, 'endX': end_x, 'speed': RUN_SPEED, 'outro': 'jjajang_run_outro', 'outroFlag': 'run_outro_done'},
            'runRoadRows': list(ROAD_ROWS),   # 러너 바닥 물결 줄기가 깔리는 행
        },
        'entities': [*pines, *gate, intro_trigger, run_trigger, door_west, door_east],
    }


def main() -> None:
    if '--help' in sys.argv:
        print('Usage: /usr/bin/python3 tools/maps/jjajang_run.py [--check]')
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
    print('wrote', MAP_ID, WIDTH, 'x', HEIGHT, 'pines', len([e for e in map_data['entities'] if e['id'].startswith('jjajang_pine')]))


if __name__ == '__main__':
    main()
