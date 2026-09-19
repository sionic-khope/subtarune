# 석상 (jjajang-statue-v1, BUILD228, 2026-09-19)

사용자 브리핑: "[사진] 이 사진 그대로에서 배경만 제거하고 석상 버전으로 바꾼 거로 앞에 깔려 있어서 막혀 있게 해 줘 좀 거대함. 화면 잘림 잘 고려하고 자연스러움도."

- 참조: `reference.png` = 사용자 사진(640×426), 전송본 `statue-ref.png`.
- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits, quality high, 1024×1024. 프롬프트 `statue.prompt.txt`(전송본 `statue-raw.prompt.txt`, usage `statue-raw.meta.json`, 로그 `gen-statue.log`). raw 1회로 채택.
- raw: `statue-raw.png` — 사진의 자세(팔 벌림·주먹·부푼 정장·표정) 그대로 회색 화강암, 마젠타 배경. 사진에 잘린 다리와 낮은 받침대는 서 있는 석상이 되도록 채웠다.
- export: `/usr/bin/python3 assets/source/jjajang-statue-v1/export.py 0.18` → 색키 → bbox → 배율 0.18 NEAREST → 이진 알파 → `assets/props/jjajang_statue.png` 160×177(요플래 65px 의 2.7배). 밑동 x 는 `runtime-contract.json`(baseX 78).
- 배치(`tools/maps/jjajang_statue.py`): 그림자 통로(27~30열) 입구, 밑변 224, 히트박스 = 그림 폭 안쪽 2px × 24px. 대화 중엔 카메라를 올려 석상 전체가 대화창 위 230px 안에 들어온다(`STATUE_VIEW`).
- 검수: `tests/playtest/jjajang-statue.mjs` 스크린샷 `statue_01_blocked.png`(석상이 길을 막음), `statue_02_view.png`(대화 중 석상 전체).
