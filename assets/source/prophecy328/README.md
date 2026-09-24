# prophecy328 — 예언의 회랑 그림 6장·남색 대문

- 참조: `refs/prophecy-style-ref.png`(사용자 제공 델타룬 예언 화면), 가재맨 사진(`../cathedral323/refs/gajaeman-photo-ref.png`), 형섭 시트 정면 → `refs/panels-ref.png`로 가로 결합. 대문은 `refs/gate-ref.png`(기존 castle306_gate 2×).
- 모델 `openai/gpt-image-2.5-sunburst`, 그림 6장 1536×1024 한 장(3×2), 대문 1024×1024, 각 1회 생성·채택. 프롬프트 `panels.prompt.txt`, `door.prompt.txt`.
- 후처리 `process.py`: 마젠타 키·분홍 fringe 제거 → tight crop → premultiplied BOX 한 번 축소(그림 높이140, 대문264) → 알파 이진화. 결과 `assets/props/prophecy328_{1..6}.png`, `prophecy328_door.png`, 미리보기 `preview.png`.
- 제목 글자는 그림에 넣지 않고 게임 폰트로 그린다.
