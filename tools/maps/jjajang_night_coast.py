#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# ─── How to run ───
# uv run tools/maps/jjajang_night_coast.py [--check]
"""Three moonlit coastal crossings, with persistent bridges and reversible ferries."""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Final, Union
from raft_recall import RECALL_IMAGES, recall_levers

Json = Union[None, bool, int, float, str, list['Json'], dict[str, 'Json']]
Point = tuple[int, int]
ROCK: Final = '≈'
EDGE: Final = '≋'
TILE: Final = 32


@dataclass(frozen=True)
class Gate:
    """A visible lever beside the approach to one three-tile bridge gap."""
    flag: str
    lever: Point
    gap: Point


@dataclass(frozen=True)
class Coast:
    """One room's geometry, ordered traversal, ferry legs and switches."""
    number: int
    size: Point
    paths: tuple[tuple[Point, ...], ...]
    ferries: tuple[tuple[Point, Point], ...]
    gates: tuple[Gate, ...]


# BUILD405(사용자 2026-09-28 “너무 긴 거 같다, 30퍼 줄이고 퍼즐도 몇 개 빼고”): 걷는 길 약 30% 단축(309/258/306 → 218/190/212칸),
# 레버 7 → 3(맵마다 1), 뗏목 4 → 3(해안2 에 2, 해안3 에 1)
COASTS: Final = (
    Coast(1, (89, 56), (
        ((0, 44), (18, 44), (18, 9), (74, 9), (74, 27), (44, 27), (44, 44), (88, 44)),
    ), (), (
        Gate('night_coast1_a', (58, 9), (63, 9)),
    )),
    Coast(2, (79, 54), (
        ((0, 36), (14, 36), (14, 9), (32, 9)),
        ((54, 9), (76, 9), (76, 36), (54, 36)),
        ((32, 36), (32, 50), (78, 50)),
    ), (((32, 9), (54, 9)), ((54, 36), (32, 36))), (
        Gate('night_coast2_a', (60, 9), (65, 9)),
    )),
    Coast(3, (93, 60), (
        ((0, 48), (18, 48), (18, 9), (72, 9), (72, 28), (40, 28), (40, 48), (64, 48)),
        ((86, 48), (92, 48)),
    ), (((64, 48), (86, 48)),), (
        Gate('night_coast3_a', (50, 9), (56, 9)),
    )),
)


def paint_path(rows: list[list[str]], points: tuple[Point, ...]) -> None:
    """Carve a three-tile-wide, orthogonal coastal shelf."""
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        for y in range(max(0, min(ay, by) - 1), min(len(rows), max(ay, by) + 2)):
            for x in range(max(0, min(ax, bx) - 1), min(len(rows[0]), max(ax, bx) + 2)):
                rows[y][x] = ROCK


def build_map(coast: Coast) -> dict[str, Json]:
    """Build explicit collision, independent bridge rows and round-trip spawn data."""
    width, height = coast.size
    map_id = f'jjajang_night_coast{coast.number}'
    rows = [['!'] * width for _ in range(height)]
    for path in coast.paths:
        paint_path(rows, path)
    for y in range(height - 1):
        for x in range(width):
            if rows[y][x] == ROCK and rows[y + 1][x] == '!':
                rows[y + 1][x] = EDGE
    entities: list[Json] = []
    swaps: dict[str, Json] = {}
    gate_meta: list[Json] = []
    for gate in coast.gates:
        gx, gy = gate.gap
        for y in range(gy - 1, gy + 2):
            for x in range(gx - 1, gx + 2):
                rows[y][x] = '!'
        lx, ly = gate.lever
        for active in (False, True):
            entities.append({'type': 'prop', 'id': f'{gate.flag}_{"on" if active else "off"}',
                'image': f'assets/props/lever_{"on" if active else "off"}.png',
                'x': lx * TILE + 4, 'y': (ly - 1) * TILE + 8, 'w': 24, 'h': 8,
                'ix': lx * TILE + 4, 'iy': (ly - 1) * TILE - 16, 'solid': True,
                'requires' if active else 'unless': gate.flag, 'script': gate.flag})
        gate_meta.append({'flag': gate.flag, 'x': gx * TILE + 4, 'y': gy * TILE + 8,
                          'lever': [lx * TILE + 4, (ly - 1) * TILE + 24],
                          'camera': [gx, gy]})
    completed_rows: dict[str, Json] = {}
    for gate in coast.gates:
        gx, gy = gate.gap
        changed: dict[str, Json] = {}
        for y in range(gy - 1, gy + 2):
            row = rows[y][:]
            row[gx - 1:gx + 2] = ['b'] * 3
            changed[str(y)] = ''.join(row)
        completed_rows.update(changed)
        swaps[gate.flag] = {'rows': completed_rows.copy()}
    near_water: list[Json] = []
    for index, ((ax, ay), (bx, by)) in enumerate(coast.ferries):
        right = bx > ax
        x = (ax + 2) * TILE - 4 if right else (ax - 1) * TILE - 52
        end = (bx - 1) * TILE - 52 if right else (bx + 2) * TILE - 4
        y = ay * TILE - 4
        entities.append({'type': 'raft', 'id': f'coast{coast.number}_{chr(97 + index)}',
            'image': 'assets/props/raft.png', 'x': x, 'y': y, 'route': [[end, by * TILE - 4]],
            'speed': 171, 'walkOn': True, 'swim': ['ppaman', 'gyeongsub'], 'swimAt': 'below'})
        water_left, water_right = -15 * TILE, (width + 15) * TILE
        top, bottom = ay * TILE - 24, y + 384
        near_water.append({'raft': f'coast{coast.number}_{chr(97 + index)}',
            'polygon': [[water_left, top + 8], [0, top], [width * TILE, top + 8],
                        [water_right, top], [water_right, bottom], [water_left, bottom]],
            'shore': [(min(ax, bx) + 2) * TILE, (max(ax, bx) - 1) * TILE],
            'bankY': (ay - 1) * TILE})
    if coast.number == 3:
        entities.append({'type': 'prop', 'id': 'coast3_spring',
            'image': 'assets/props/blue_buff.png', 'anim': {'cols': 3, 'fps': 4},
            'x': (coast.size[0] - 4) * TILE, 'y': (coast.paths[-1][-1][1] - 1) * TILE + 6, 'w': 32, 'h': 20,
            'ix': (coast.size[0] - 4) * TILE - 4, 'iy': (coast.paths[-1][-1][1] - 1) * TILE - 18,
            'solid': True, 'script': 'jjajang_spring'})
    entry_y, exit_y = coast.paths[0][0][1], coast.paths[-1][-1][1]
    previous = 'jjajang_sakura8' if coast.number == 1 else f'jjajang_night_coast{coast.number - 1}'
    following = 'jjajang_night_cliff' if coast.number == 3 else f'jjajang_night_coast{coast.number + 1}'
    entities.extend([
        {'type': 'door', 'id': 'west', 'x': 0, 'y': (entry_y - 1) * TILE, 'w': 10, 'h': 96,
         'to': previous, 'spawn': 'from_east', 'sfx': False, 'interact': False},
        {'type': 'door', 'id': 'east', 'x': width * TILE - 10, 'y': (exit_y - 1) * TILE, 'w': 10, 'h': 96,
         'to': following, 'spawn': 'from_west', 'sfx': False, 'interact': False},
    ])
    spawn: dict[str, Json] = {
        'start': {'x': 132, 'y': entry_y * TILE + 8, 'facing': 'right'},
        'from_west': {'x': 132, 'y': entry_y * TILE + 8, 'facing': 'right'},
        'from_east': {'x': (width - 4) * TILE + 4, 'y': exit_y * TILE + 8, 'facing': 'left'},
    }
    distance = sum(abs(bx - ax) + abs(by - ay) for path in coast.paths for (ax, ay), (bx, by) in zip(path, path[1:])) * TILE
    return {'id': map_id, 'name': ['달빛 해안 · 바위 굽이', '달빛 해안 · 섬 사이', '달빛 해안 · 마지막 여울'][coast.number - 1],
        'stage': 'ship_sinking_done', 'bgm': 'night_coast', 'backdrop': 'jjajang_night_sea',
        'rows': [''.join(row) for row in rows], 'spawns': spawn, 'entities': entities, 'tileSwaps': swaps,
        'preload': ['assets/backdrops/jjajang_night_sea.png', 'assets/tiles/night_coast_rock.png', 'assets/tiles/night_coast_edge.png', 'assets/props/lever_on.png'],
        'meta': {'connected': True, 'coast': {'gates': gate_meta,
            **({'nearWater': near_water} if near_water else {}),
            'walkRoute': [[[x * TILE + 4, y * TILE + 8] for x, y in path] for path in coast.paths],
            'walkDistance': distance, 'defaultMoveSeconds': round(distance / 218.4, 1),
            'slowMoveSeconds': round(distance / 124.8, 1)}}}


def main() -> None:
    """Generate all three adjacent rooms without altering unrelated index entries."""
    if '--help' in sys.argv:
        print('Usage: uv run tools/maps/jjajang_night_coast.py [--check]')
        return
    index_path = Path('assets/maps/index.json')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    valid = True
    for coast in COASTS:
        data = build_map(coast)
        map_id = f'jjajang_night_coast{coast.number}'
        if coast.ferries:
            data['entities'].extend(recall_levers(map_id))
            data['preload'].extend(RECALL_IMAGES)
        output = Path(f'assets/maps/{map_id}.json')
        if '--check' in sys.argv:
            same = output.exists() and json.loads(output.read_text(encoding='utf-8')) == data and map_id in index['maps']
            valid = valid and same
            print(map_id, 'same' if same else 'DIFFERENT')
        else:
            output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
            if map_id not in index['maps']:
                index['maps'].append(map_id)
            print('wrote', map_id)
    if '--check' in sys.argv:
        raise SystemExit(0 if valid else 1)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
