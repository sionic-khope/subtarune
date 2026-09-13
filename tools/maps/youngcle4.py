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

MAP_ID: Final = "youngcle4"
WIDTH: Final = 18
HEIGHT: Final = 18
FLAG: Final = "youngcle4_circuit_solved"


def build_map() -> dict[str, object]:
    rows = ["!" * WIDTH for _ in range(HEIGHT)]
    rows[5] = "J" * WIDTH
    for row in range(6, 11):
        rows[row] = "J" + "I" * (WIDTH - 2) + "J"
    rows[11] = "J" * WIDTH
    return {
        "id": MAP_ID, "name": "영클 공장 차단기실", "stage": "void_fallen",
        "bgm": "youngcle_factory", "backdrop": "youngcle_factory", "dim": 0.08,
        "rows": rows,
        "preload": ["assets/tiles/youngcle_iron.png", "assets/backdrops/youngcle_factory.png"],
        "spawns": {
            "start": {"x": 96, "y": 248, "facing": "right"},
            "left": {"x": 96, "y": 248, "facing": "right"},
            "landing": {"x": 480, "y": 248, "facing": "left"},
        },
        "meta": {
            "connected": True, "puzzle": "circuit", "plates": ["youngcle4_circuit_a", "youngcle4_circuit_b"],
            "source": [144, 256], "breaker": [400, 256], "gate": [416, 192, 24, 160],
            "landing": [448, 192, 64, 160],
        },
        "entities": [
            {"type": "door", "id": "youngcle4_left", "x": 32, "y": 204, "w": 16, "h": 136,
             "to": "youngcle3", "spawn": "right", "sfx": False, "interact": False},
            {"type": "factory_rail", "id": "youngcle4_rail_top", "x": 32, "y": 192,
             "w": 512, "h": 12},
            {"type": "factory_rail", "id": "youngcle4_rail_bottom", "x": 32, "y": 340,
             "w": 512, "h": 12},
            {"type": "factory_rail", "id": "youngcle4_rail_end", "x": 532, "y": 204,
             "w": 12, "h": 136},
            {"type": "factory_console", "id": "youngcle4_console", "puzzle": "circuit", "flag": FLAG,
             "x": 96, "y": 200, "script": "youngcle_circuit_controls",
             "solvedScript": "youngcle_circuit_controls"},
            {"type": "factory_wire", "id": "youngcle4_wire_source", "puzzle": "circuit", "flag": FLAG,
             "source": True, "points": [[144, 256], [224, 256]]},
            {"type": "factory_circuit", "id": "youngcle4_circuit_a", "puzzle": "circuit", "flag": FLAG,
             "x": 224, "y": 240, "orientation": 1, "solution": 0},
            {"type": "factory_wire", "id": "youngcle4_wire_middle", "puzzle": "circuit", "flag": FLAG,
             "poweredBy": ["youngcle4_circuit_a"], "points": [[256, 256], [320, 256]]},
            {"type": "factory_circuit", "id": "youngcle4_circuit_b", "puzzle": "circuit", "flag": FLAG,
             "x": 320, "y": 240, "orientation": 1, "solution": 0,
             "poweredBy": ["youngcle4_circuit_a"]},
            {"type": "factory_wire", "id": "youngcle4_wire_breaker", "puzzle": "circuit", "flag": FLAG,
             "poweredBy": ["youngcle4_circuit_a", "youngcle4_circuit_b"],
             "points": [[352, 256], [400, 256], [400, 208], [416, 208]]},
            {"type": "factory_gate", "id": "youngcle4_gate", "flag": FLAG, "style": "plasma",
             "x": 416, "y": 192, "w": 24, "h": 160},
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
