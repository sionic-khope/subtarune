# 영클 TV 표정 glare(째려봄) v2 (youngcle-glare-v2, BUILD203)

사용자 2026-09-16 “영클 짜증내는 초상화 깨짐” — BUILD200 의 손 편집판(smirk 픽셀 수정 + 흰 바탕 흑백 초상, tools/art/youngcle_glare_set.py)은 초상이 흰 상자로 깨지고 눈 소용돌이도 사라져 폐기.
- 공급자 OpenGateway `openai/gpt-image-2` edits, 참조 `ref.png`(smirk TV 삽화 3배 — 정체성·팔짱). 프롬프트 `glare.prompt.txt`(전송본 `glare-raw.prompt.txt`). 1회.
- raw `glare-raw.png` 1024×1024 마젠타 배경: 반쯤 감긴 외눈에 소용돌이 눈동자, 내려간 눈썹, 일자 입, 팔짱.
- export `export.py`(uv, youngcle151/export.py 의 clean_magenta·fit_bbox·portrait_from 재사용): logical 128×64 → 142 배경판에 (10,0) 238×119 → `assets/illustrations/youngcle-tv-glare.png` 258×119; 초상 = logical 얼굴 crop 46px → 96×96 컬러·투명(다른 표정과 같은 규격, 대화창이 실행 중 흑백 변환) → `assets/portraits/youngcle_tv_glare.png`.
