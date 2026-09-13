#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Final

MAP_ID: Final = "youngcle3"
WIDTH: Final = 18
HEIGHT: Final = 18
FLAG: Final = "youngcle3_crate_solved"


def build_map() -> dict[str, object]:
    rows = ["!" * WIDTH for _ in range(HEIGHT)]
    rows[5] = "J" * WIDTH
    for row in range(6, 11):
        rows[row] = "J" + "I" * (WIDTH - 2) + "J"
    rows[11] = "J" * WIDTH
    return {
        "id": MAP_ID, "name": "영클 공장 압력실", "stage": "void_fallen",
        "bgm": "youngcle_factory", "backdrop": "youngcle_factory", "dim": 0.08,
        "rows": rows,
        "preload": ["assets/tiles/youngcle_iron.png", "assets/backdrops/youngcle_factory.png"],
        "spawns": {
            "start": {"x": 96, "y": 248, "facing": "right"},
            "left": {"x": 96, "y": 248, "facing": "right"},
            "right": {"x": 480, "y": 248, "facing": "left"},
        },
        "meta": {
            "connected": True, "puzzle": "crate", "pushes": 3,
            "crateStart": [192, 242], "plate": [288, 240], "gate": [416, 192, 24, 160],
        },
        "entities": [
            {"type": "door", "id": "youngcle3_left", "x": 32, "y": 204, "w": 16, "h": 136,
             "to": "youngcle2", "spawn": "top", "sfx": False, "interact": False},
            {"type": "factory_rail", "id": "youngcle3_rail_top", "x": 32, "y": 192,
             "w": 512, "h": 12},
            {"type": "factory_rail", "id": "youngcle3_rail_bottom", "x": 32, "y": 340,
             "w": 512, "h": 12},
            {"type": "factory_wire", "id": "youngcle3_wire", "puzzle": "crate", "flag": FLAG,
             "points": [[304, 256], [368, 256], [368, 208], [416, 208]]},
            {"type": "factory_plate", "id": "youngcle3_plate", "puzzle": "crate", "flag": FLAG,
             "x": 288, "y": 240},
            {"type": "factory_crate", "id": "youngcle3_crate", "puzzle": "crate", "flag": FLAG,
             "x": 192, "y": 242, "solvedX": 290, "solvedY": 242},
            {"type": "factory_console", "id": "youngcle3_console", "puzzle": "crate", "flag": FLAG,
             "x": 128, "y": 200, "resetCrate": True, "script": "youngcle_crate_controls",
             "solvedScript": "youngcle_crate_done"},
            {"type": "factory_gate", "id": "youngcle3_gate", "flag": FLAG,
             "x": 416, "y": 192, "w": 24, "h": 160},
            {"type": "door", "id": "youngcle3_right", "x": 528, "y": 204, "w": 16, "h": 136,
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
