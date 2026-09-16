# 오방순 얼굴 (obangsun-face-v1, BUILD207) — 광선 패턴 얼굴 탄 + 대화창 초상화

사용자 2026-09-17 “오방순 얼굴이 가운데에 (도트이미지화해서) 뜨고 … 공격이 나갈땐 입을 벌리고있어야함”.

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 `ref.png` = obangsun_big 정면 얼굴). 프롬프트 `face.prompt.txt`(전송본 `face-raw.prompt.txt`, usage `face-raw.meta.json`). 1536×1024 한 장에 입 다문 얼굴·입 벌린 얼굴 2칸.
- export: `face-raw.png` → `face-strip.png`(112 셀 2×1, fit 0.94, 배율 0.1212, `face-strip.export-meta.json`) → `assets/enemies/obangsun-face-closed.png` / `obangsun-face-open.png`(112×112). 탄막 `obangsun_rays` 가 open 을 토글한다.
- 초상화(BUILD208): `assets/portraits/obangsun.png` 96×96 = `obangsun-face-closed.png` 의 bbox 를 92px 로 LANCZOS 축소해 가운데 아래 정렬. 런타임 `monoPortrait(scale 2, 기본 임계 0.38)` 로 48px 흰/검 2톤(머리·눈·입 검정, 얼굴 흰색). 이전엔 초상화 파일이 없어 시트 얼굴 폴백이 아주 작게 나왔다.
