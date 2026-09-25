# arena332 — 결전지(가재맨·섭타룬·청소년거인)

모두 openai/gpt-image-2.5-sunburst, 각 1회 채택(근육팔은 첫 요청이 안전 필터 오탐으로 거부돼 사진 참조 없이 `arm2.prompt.txt`로 재요청).
- 배경 `arena.prompt.txt` → `arena-raw.png`(참조: 사용자 델타룬 화면 + 예언 회랑 남색 문) → `assets/props/arena332_room.png` 768×1152, 위쪽 확장 `arena332_upper.png`(선반 띠를 이어 어둠으로).
- 몬스터 `monsters.prompt.txt`/`monsters2.prompt.txt`(참조: 우디르섭·탈리야섭) → 10종 `arena332_<name>.png`(크기 44~118px).
- 청소년 `cheong.prompt.txt`(참조: 사용자 그림 + 형섭 시트) → `arena332_cheong.png` 56px.
- 근육팔 `arm2.prompt.txt` → `arena332_arm.png` 높이130. 청소년거인 상체 `giant.prompt.txt` → `arena332_giant.png` 높이480.
- 후처리 `process.py`(마젠타 키·BOX 한 번·알파 이진화). 참고 이미지(분수·청소년 원본)는 `refs/`.
