# sapphire331 — 사파이어 발광석 바닥 (BUILD331)

- 사용자: “예언맵 바로 이전맵 남색이 더 짙고 발광석 느낌 땅, 그림자도 조금”, “사파이어같은 느낌으로”.
- `floor.prompt.txt` → `floor-raw.png` (openai/gpt-image-2.5-sunburst, 1024×1024, 참조 없음, 1회 채택).
- `tools/art/castle331_sapphire_set.py`: 가장자리 48px를 반대편과 섞어 이음새 제거 → BOX 한 번 192px → 맵별 밝기(오르막 0.72, 예언 회랑 0.34).
  결과: `assets/tiles/castle327_{aisle,floor,edge_left,edge_right}.png`, `castle328_void_floor.png`, `assets/props/castle331_{spire_room,prophecy_strip,prophecy_strip_v,shadow_*}.png`.
