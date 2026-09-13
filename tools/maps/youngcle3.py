#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# ─── How to run ───
# Run from the repository root: uv run tools/maps/youngcle3.py [--check]
# ──────────────────
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final, Union

JsonValue = Union[str, int, float, bool, None, list["JsonValue"], dict[str, "JsonValue"]]

MAP_ID: Final = "youngcle3"
WIDTH: Final = 18
HEIGHT: Final = 18
FLAG: Final = "youngcle3_crate_solved"
PUZZLE: Final = "youngcle3_crate"


def build_map() -> dict[str, JsonValue]:
    rows = ["!" * WIDTH for _ in range(HEIGHT)]
    rows[4] = "J" * WIDTH
    for row in range(5, 12):
        rows[row] = "J" + "I" * (WIDTH - 2) + "J"
    rows[12] = "J" * WIDTH
    return {
        "id": MAP_ID, "name": "영클 공장 화물 연습실", "stage": "void_fallen",
        "bgm": "youngcle_factory", "backdrop": "youngcle_factory", "dim": 0.08,
        "enter": {"script": "youngcle3_crate_intro"},
        "rows": rows,
        "preload": ["assets/tiles/youngcle_iron.png", "assets/backdrops/youngcle_factory.png"],
        "spawns": {
            "start": {"x": 80, "y": 280, "facing": "right"},
            "left": {"x": 80, "y": 280, "facing": "right"},
            "right": {"x": 496, "y": 280, "facing": "left"},
        },
        "meta": {
            "connected": True, "puzzle": "crate", "difficulty": "tutorial", "pushes": 3,
            "solution": ["R", "R", "U"], "crateStart": [194, 290],
            "plates": [[256, 256]], "gate": [448, 160, 24, 224],
        },
        "entities": [
            {"type": "door", "id": "youngcle3_left", "x": 32, "y": 172, "w": 16, "h": 200,
             "to": "youngcle2", "spawn": "top", "sfx": False, "interact": False},
            {"type": "factory_rail", "id": "youngcle3_rail_top", "x": 32, "y": 160,
             "w": 512, "h": 12},
            {"type": "factory_rail", "id": "youngcle3_rail_bottom", "x": 32, "y": 384,
             "w": 512, "h": 12},
            {"type": "factory_sign", "id": "youngcle3_sign", "x": 96, "y": 208,
             "label": "상자", "icon": "!", "script": "youngcle3_crate_sign"},
            {"type": "factory_console", "id": "youngcle3_console", "puzzle": PUZZLE, "flag": FLAG,
             "x": 96, "y": 328, "resetCrates": True, "script": "youngcle_crate_reset",
             "solvedScript": "youngcle_crate_done"},
            {"type": "factory_bulkhead", "id": "youngcle3_bulkhead", "x": 288, "y": 288,
             "w": 32, "h": 64},
            {"type": "factory_wire", "id": "youngcle3_wire", "puzzle": PUZZLE, "flag": FLAG,
             "points": [[272, 272], [368, 272], [368, 176], [448, 176]]},
            {"type": "factory_plate", "id": "youngcle3_plate", "puzzle": PUZZLE, "flag": FLAG,
             "x": 256, "y": 256},
            {"type": "factory_crate", "id": "youngcle3_crate", "puzzle": PUZZLE, "flag": FLAG,
             "x": 194, "y": 290, "solvedX": 258, "solvedY": 258},
            {"type": "factory_gate", "id": "youngcle3_gate", "flag": FLAG,
             "x": 448, "y": 160, "w": 24, "h": 224},
            {"type": "door", "id": "youngcle3_right", "x": 528, "y": 172, "w": 16, "h": 200,
             "to": "youngcle4", "spawn": "left", "sfx": False, "interact": False},
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
