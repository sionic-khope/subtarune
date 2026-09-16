# 조종실 벽 대포 (ship-cannon-v1, BUILD203)

사용자 2026-09-16 “대포 더 간지나게 만들어주고” + “스프라이트 생성을 하라니까(손그림 금지)”.
- 공급자 OpenGateway `openai/gpt-image-2` edits, 참조 `ref.png`(조종실 콘솔 팔레트). 프롬프트 `cannon.prompt.txt`(전송본 `cannon-raw.prompt.txt`). 1회.
- raw `cannon-raw.png` 1536×1024 마젠타 배경, 오른쪽을 향한 벽걸이 대포(포신 고리 셋·청록 줄·포구 통풍구·피스톤·경고 셰브론·빨간 등).
- export: 색키 → bbox (np.int64(85), np.int64(215), np.int64(1492), np.int64(763)) → 폭 176 NEAREST(배율 0.1251) → `assets/props/ship_cannon.png` (176, 69). 이진 알파.
- 맵 youngcle20 `ship_cannon`(왼쪽 벽 속 x-144 대기 → 연출이 +152 꺼냄).
