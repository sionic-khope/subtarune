# rise359 — 뗏목 점프 뒤 상승·노을 땅 (BUILD359)

모델 openai/gpt-image-2.5-sunburst (tools/sprites/imagegen.py). 각 raw 옆 `*.prompt.txt`·`*.meta.json`.

- `rise-raw.png` (채택) / `rise2-raw.png`: 상승 자세 2×2 — 오른쪽·앞·왼쪽·뒤, 팔 아래로 뻗고 위를 봄. 참조 `ref-hyungsub.png`(형섭 필드 시트 3배).
- `land2-raw.png` (채택) / `land-raw.png`: 앞덤블링 둘·착지 웅크림·무릎 꿇기(옆모습 오른쪽).
- `sunset-raw.png`: 노을 바다 + 산·섬 실루엣, 가운데 해 자리 비움. 참조 `ref-sunset.png` = 마이야르 노을 배경 + 사용자 참고 그림(`ref-landing-layout.png`).
- `process.py`: 마젠타 제거 → 칸 자르기 → 4칸 띠(발 = 칸 아래 가운데) → `assets/sprites/hyungsub-rise.png`, `hyungsub-land.png`; 배경 1/2 → `assets/backdrops/castle_sunset359.png`.
- `audio/stw.mp3`: YouTube LAn-JYzKm5M 전체. 42.7초부터 → `assets/audio/bgm/save_the_world_rise.mp3`.
