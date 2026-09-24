# prophecy328 — 예언의 회랑 그림 6장·남색 대문

- 참조: `refs/prophecy-style-ref.png`(사용자 제공 델타룬 예언 화면), 가재맨 사진(`../cathedral323/refs/gajaeman-photo-ref.png`), 형섭 시트 정면 → `refs/panels-ref.png`로 가로 결합. 대문은 `refs/gate-ref.png`(기존 castle306_gate 2×).
- 모델 `openai/gpt-image-2.5-sunburst`, 그림 6장 1536×1024 한 장(3×2), 대문 1024×1024, 각 1회 생성·채택. 프롬프트 `panels.prompt.txt`, `door.prompt.txt`.
- 후처리 `process.py`: 마젠타 키·분홍 fringe 제거 → tight crop → premultiplied BOX 한 번 축소(그림 높이140, 대문264) → 알파 이진화. 결과 `assets/props/prophecy328_{1..6}.png`, `prophecy328_door.png`, 미리보기 `preview.png`.
- 제목 글자는 그림에 넣지 않고 게임 폰트로 그린다.

## BUILD331 재생성 (사용자 “가재맨 같지가 않잖아 그 특유에 코큰 그 주인공캐릭터”)
- 참조를 사진 대신 게임 속 가재맨 스프라이트 정면(`refs/gajaeman-sprite-front.png`, gajaeman_shadow 시트 첫 칸 8×)으로 바꾼 `refs/panels-ref2.png`.
- `panels2.prompt.txt` → `panels-raw2.png`(2등신·안경은 맞으나 코가 약함, 반려), 코를 강조한 `panels3.prompt.txt` → `panels-raw3.png` 채택. `process.py`가 raw3을 읽는다.
