#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle4.py [--check]
# ──────────────────
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = "youngcle4"
WIDTH: Final = 18
HEIGHT: Final = 18
FLAG: Final = "youngcle4_circuit_solved"
PUZZLE: Final = "youngcle4_crate"


def build_map() -> dict[str, JsonValue]:
    rows = ["!" * WIDTH for _ in range(HEIGHT)]
    rows[4] = "J" * WIDTH
    for row in range(5, 12):
        rows[row] = "J" + "I" * (WIDTH - 2) + "J"
    rows[12] = "J" * WIDTH
    return {
        "id": MAP_ID, "name": "영클 공장 우회 운반실", "stage": "void_fallen",
        "bgm": "youngcle_factory", "backdrop": "youngcle_factory", "dim": 0.08,
        "rows": rows,
        "preload": ["assets/tiles/youngcle_iron.png", "assets/backdrops/youngcle_factory.png",
                    "assets/props/factory_crate145.png"],
        "spawns": {
            "start": {"x": 80, "y": 280, "facing": "right"},
            "left": {"x": 80, "y": 280, "facing": "right"},
            "right": {"x": 496, "y": 280, "facing": "left"},
        },
        "meta": {
            "connected": True, "puzzle": "crate", "difficulty": "medium", "pushes": 6,
            "solution": ["R", "R", "U", "U", "R", "R"], "crateStart": [194, 290],
            "plates": [[320, 224]], "gate": [448, 160, 24, 224], "moveArea": [4, 5, 9, 7],
        },
        "entities": [
            {"type": "door", "id": "youngcle4_left", "x": 32, "y": 172, "w": 16, "h": 200,
             "to": "youngcle3", "spawn": "right", "sfx": False, "interact": False},
            {"type": "factory_rail", "id": "youngcle4_rail_top", "x": 32, "y": 160,
             "w": 512, "h": 12},
            {"type": "factory_rail", "id": "youngcle4_rail_bottom", "x": 32, "y": 384,
             "w": 512, "h": 12},
            {"type": "factory_move_area", "id": "youngcle4_move_area", "puzzle": PUZZLE,
             "x": 128, "y": 160, "w": 288, "h": 224},
            {"type": "factory_sign", "id": "youngcle4_sign", "x": 96, "y": 208,
             "label": "우회", "icon": "!", "script": "youngcle4_crate_sign"},
            {"type": "factory_console", "id": "youngcle4_console", "puzzle": PUZZLE, "flag": FLAG,
             "x": 96, "y": 328, "resetCrates": True, "script": "youngcle_crate_reset",
             "solvedScript": "youngcle_crate_done"},
            {"type": "factory_bulkhead", "id": "youngcle4_bulkhead", "x": 288, "y": 256,
             "w": 32, "h": 96},
            {"type": "factory_wire", "id": "youngcle4_wire", "puzzle": PUZZLE, "flag": FLAG,
             "points": [[336, 240], [384, 240], [384, 176], [448, 176]]},
            {"type": "factory_plate", "id": "youngcle4_plate", "puzzle": PUZZLE, "flag": FLAG,
             "x": 320, "y": 224},
            {"type": "factory_crate", "id": "youngcle4_crate", "puzzle": PUZZLE, "flag": FLAG,
             "x": 194, "y": 290, "solvedX": 322, "solvedY": 226},
            {"type": "factory_gate", "id": "youngcle4_gate", "flag": FLAG, "style": "plasma",
             "x": 448, "y": 160, "w": 24, "h": 224},
            {"type": "door", "id": "youngcle4_right", "x": 528, "y": 172, "w": 16, "h": 200,
             "to": "youngcle5", "spawn": "left", "sfx": False, "interact": False},
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
