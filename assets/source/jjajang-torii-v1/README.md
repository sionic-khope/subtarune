# 짜장 토리이 (jjajang-torii-v1, BUILD226, 2026-09-18)

사용자 브리핑: "중간중간 총 3개 일정 간격으로 토리이가 대각선으로 통로로 있게 해줘, 길 안에 까는 게 아님. [후시미 이나리 사진] 이런 디자인으로."

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 `torii-ref.png` = 사용자 사진 `reference.png` 900px 축소), quality high, 1024×1024. 프롬프트 `torii.prompt.txt`(전송본 `torii-raw.prompt.txt`, usage `torii-raw.meta.json`, 로그 `gen-torii.log`). raw 1회로 채택.
- raw: `torii-raw.png` — 대각선 3/4 시점(가까운 기둥 왼쪽 아래, 먼 기둥 오른쪽 위, 대들보가 오른쪽 위로 오름), 마젠타 배경.
- export: `/usr/bin/python3 assets/source/jjajang-torii-v1/export.py 0.3` → 색키 → 전체 bbox → 배율 0.3 NEAREST → 이진 알파. **두 조각**(깊이 정렬): `assets/props/jjajang_torii_back.png` = 먼 기둥 기둥대+받침(대들보 아래, 캐릭터 뒤), `assets/props/jjajang_torii_front.png` = 대들보·가까운 기둥·먼 기둥 윗부분(캐릭터 앞). 둘 다 246×285, 같은 ix/iy 로 겹쳐 놓는다. 기둥 밑동 위치는 `runtime-contract.json`(nearBase [57,285.3], farBase [196,216.6]).
- 배치(`tools/maps/jjajang_torii.py torii()`): 가까운 기둥 밑동을 길 아래 칸(row 10) 위쪽에, 먼 기둥 밑동은 계약대로 길 위 칸(row 7)에 떨어진다 — 기둥 히트박스(24×24, 24×22)는 길 칸을 건드리지 않는다(연결 감사 통과). 총 높이 285px(기둥 약 170px, 요플래 65px 의 2.6배 — 사진처럼 사람이 작게 지나는 크기).
- 검수: `preview-pieces-2x.png`(조각), 플레이테스트 `tests/playtest/jjajang-torii.mjs` 스크린샷 `torii_02_gate_1~3.png`(길 위에서 두 기둥 사이를 지남, 앞 기둥이 캐릭터 앞·뒤 기둥이 뒤).
