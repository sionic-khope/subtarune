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

MAP_ID: Final = "youngcle2"
WIDTH: Final = 18
HEIGHT: Final = 30


def build_rows() -> list[str]:
    cells = [["!"] * WIDTH for _ in range(HEIGHT)]
    for row in range(22, 27):
        for col in range(1, 12):
            cells[row][col] = "I"
    for row in range(1, 27):
        for col in range(8, 13):
            cells[row][col] = "I"
    for row in range(HEIGHT):
        for col in range(WIDTH):
            if cells[row][col] != "I":
                continue
            for delta_row in (-1, 0, 1):
                for delta_col in (-1, 0, 1):
                    rail_row, rail_col = row + delta_row, col + delta_col
                    if 0 <= rail_row < HEIGHT and 0 <= rail_col < WIDTH and cells[rail_row][rail_col] == "!":
                        cells[rail_row][rail_col] = "J"
    return ["".join(row) for row in cells]


def build_map() -> dict[str, object]:
    return {
        "id": MAP_ID, "name": "영클 공장 연결로", "stage": "void_fallen",
        "bgm": "youngcle_factory", "backdrop": "youngcle_factory", "dim": 0.08,
        "rows": build_rows(),
        "preload": ["assets/tiles/youngcle_iron.png", "assets/backdrops/youngcle_factory.png"],
        "spawns": {
            "start": {"x": 96, "y": 784, "facing": "right"},
            "left": {"x": 96, "y": 784, "facing": "right"},
            "top": {"x": 304, "y": 80, "facing": "down"},
        },
        "meta": {"connected": True, "route": [[3, 24], [10, 24], [10, 3]]},
        "entities": [
            {"type": "door", "id": "youngcle2_left", "x": 32, "y": 716, "w": 16, "h": 136,
             "to": "youngcle1", "spawn": "right", "sfx": False, "interact": False},
            {"type": "door", "id": "youngcle2_top", "x": 268, "y": 32, "w": 136, "h": 16,
             "to": "youngcle3", "spawn": "left", "sfx": False, "interact": False},
            {"type": "factory_rail", "id": "youngcle2_rail_lower", "x": 32, "y": 704,
             "w": 224, "h": 12},
            {"type": "factory_rail", "id": "youngcle2_rail_bottom", "x": 32, "y": 852,
             "w": 384, "h": 12},
            {"type": "factory_rail", "id": "youngcle2_rail_left", "x": 256, "y": 32,
             "w": 12, "h": 672},
            {"type": "factory_rail", "id": "youngcle2_rail_right", "x": 404, "y": 32,
             "w": 12, "h": 672},
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
