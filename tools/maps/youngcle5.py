#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle5.py [--check]
# ──────────────────
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = "youngcle5"
WIDTH: Final = 18
HEIGHT: Final = 18
FLAG: Final = "youngcle5_crate_solved"
PUZZLE: Final = "youngcle5_crates"


def build_map() -> dict[str, JsonValue]:
    rows = ["!" * WIDTH for _ in range(HEIGHT)]
    rows[4] = "J" * WIDTH
    for row in range(5, 12):
        rows[row] = "J" + "I" * (WIDTH - 2) + "J"
    rows[12] = "J" * WIDTH
    return {
        "id": MAP_ID, "name": "영클 공장 복수 화물 검사실", "stage": "void_fallen",
        "bgm": "youngcle_factory", "backdrop": "youngcle_factory", "dim": 0.08,
        "rows": rows,
        "preload": ["assets/tiles/youngcle_iron.png", "assets/backdrops/youngcle_factory.png",
                    "assets/props/factory_crate145.png"],
        "spawns": {
            "start": {"x": 64, "y": 344, "facing": "right"},
            "left": {"x": 64, "y": 344, "facing": "right"},
            "landing": {"x": 496, "y": 280, "facing": "left"},
        },
        "meta": {
            "connected": True, "puzzle": "crate", "difficulty": "hard", "pushes": 16,
            "solution": ["AR", "AD", "BR", "BR", "BR", "BU", "BU", "BR", "BR", "AD",
                         "AR", "AR", "AR", "AR", "AR", "AR"],
            "crateStarts": [[162, 258], [226, 258]],
            "plates": [[384, 192], [384, 320]], "gate": [448, 160, 24, 224],
            "landing": [480, 160, 48, 224], "moveArea": [4, 5, 9, 7],
        },
        "entities": [
            {"type": "door", "id": "youngcle5_left", "x": 32, "y": 172, "w": 16, "h": 200,
             "to": "youngcle4", "spawn": "right", "sfx": False, "interact": False},
            {"type": "factory_rail", "id": "youngcle5_rail_top", "x": 32, "y": 160,
             "w": 512, "h": 12},
            {"type": "factory_rail", "id": "youngcle5_rail_bottom", "x": 32, "y": 384,
             "w": 512, "h": 12},
            {"type": "door", "id": "youngcle5_right", "x": 528, "y": 172, "w": 16, "h": 200,
             "to": "youngcle_cats", "spawn": "left", "sfx": False, "interact": False},
            {"type": "factory_move_area", "id": "youngcle5_move_area", "puzzle": PUZZLE,
             "x": 128, "y": 160, "w": 288, "h": 224},
            {"type": "factory_sign", "id": "youngcle5_sign", "x": 96, "y": 208,
             "label": "2개", "icon": "!", "script": "youngcle5_crate_sign"},
            {"type": "factory_console", "id": "youngcle5_console", "puzzle": PUZZLE, "flag": FLAG,
             "x": 96, "y": 328, "resetCrates": True, "script": "youngcle_crate_reset",
             "solvedScript": "youngcle_crate_done"},
            {"type": "factory_bulkhead", "id": "youngcle5_bulkhead_top", "x": 256, "y": 192,
             "w": 32, "h": 64},
            {"type": "factory_bulkhead", "id": "youngcle5_bulkhead_middle", "x": 256, "y": 288,
             "w": 32, "h": 32},
            # 2026-09-15 난이도 소폭 상향: 위 발판 바로 아래(col8,row2)를 막아 B를 col8에서 위로 올릴 수 없다.
            # B는 col6에서 먼저 올린 뒤 row1을 따라 오른쪽으로 — 발판까지 밀고 나서야 갇힌 걸 알면 초기화 콘솔
            {"type": "factory_bulkhead", "id": "youngcle5_bulkhead_plate", "x": 384, "y": 224,
             "w": 32, "h": 32},
            {"type": "factory_wire", "id": "youngcle5_wire_top", "puzzle": PUZZLE, "flag": FLAG,
             "points": [[400, 208], [424, 208], [424, 176], [448, 176]]},
            {"type": "factory_wire", "id": "youngcle5_wire_bottom", "puzzle": PUZZLE, "flag": FLAG,
             "points": [[400, 336], [424, 336], [424, 368], [448, 368]]},
            {"type": "factory_plate", "id": "youngcle5_plate_top", "puzzle": PUZZLE, "flag": FLAG,
             "x": 384, "y": 192},
            {"type": "factory_plate", "id": "youngcle5_plate_bottom", "puzzle": PUZZLE, "flag": FLAG,
             "x": 384, "y": 320},
            {"type": "factory_crate", "id": "youngcle5_crate_a", "puzzle": PUZZLE, "flag": FLAG,
             "x": 162, "y": 258, "solvedX": 386, "solvedY": 322,
             "onSolved": "youngcle5_crate_complete"},
            {"type": "factory_crate", "id": "youngcle5_crate_b", "puzzle": PUZZLE, "flag": FLAG,
             "x": 226, "y": 258, "solvedX": 386, "solvedY": 194,
             "onSolved": "youngcle5_crate_complete"},
            {"type": "factory_gate", "id": "youngcle5_gate", "flag": FLAG,
             "x": 448, "y": 160, "w": 24, "h": 224},
        ],
    }


def main() -> None:
    data = build_map()
    output = Path(f"assets/maps/{MAP_ID}.json")
    index_path = Path("assets/maps/index.json")
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if '--check' in sys.argv:
        same = output.exists() and json.loads(output.read_text(encoding="utf-8")) == data
        registered = MAP_ID in index["maps"]
        print(MAP_ID, "same" if same and registered else "DIFFERENT")
        raise SystemExit(0 if same and registered else 1)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if MAP_ID not in index["maps"]:
        index["maps"].append(MAP_ID)
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", MAP_ID, WIDTH, "x", HEIGHT)


if __name__ == "__main__":
    main()
