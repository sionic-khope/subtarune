# cathedral323 — 가재맨 검(대성당 오르기 기믹)

## 참조(사용자 제공, 2026-09-24)
- `refs/knight-swords-ref.png`: 로어링 나이트 검(실루엣만 참고)
- `refs/gajaeman-photo-ref.png`: 가재맨 사진(형체 참고, “리얼하게, 색깔만 검은색”)
- `refs/wind-staircase-ref.png`: 바람 연출 분위기 참고(계단)
- 추가 개념 참조: `assets/props/gajaeman_castle.png`(사람 형체를 물체에 녹인 기존 승인 자산)

## 생성
- 모델 `openai/gpt-image-2.5-sunburst`, OpenGateway `images/edits`, 1024×1536, quality high, 1회 생성·채택
- 참조 한 장: `sword-ref.png` = 위 세 장을 `imagegen.py compose --scale 0.5 --gap 16 --background 000000`로 가로 결합(왼쪽부터 Image1 칼, Image2 사진, Image3 성)
- 프롬프트: `sword.prompt.txt`, raw: `sword-raw.png`(+ `.prompt.txt`/`.meta.json`)

## 후처리 (`process.py`, `/usr/bin/python3 assets/source/cathedral323/process.py`)
1. 순수 마젠타 키 제거(가장자리 연결 + 팔·몸 사이 막힌 구멍), 가장자리 분홍 fringe 제거
2. 불투명 영역으로 tight crop(634×1334)
3. 한 번의 BOX 축소(premultiplied)로 높이160 → 76×160, 알파 이진화(≥128)
4. 결과 `assets/props/cathedral323_sword.png`, 미리보기 `sword-preview.png`(4×)

NEAREST 축소는 얼굴·안경이 점 잡음으로 뭉개져 반려했다(1차 미리보기). 색 양자화 없음.

## 런타임 계약
- 그리기 76×160, 칼날 끝이 아래. 줄 가운데 x에 중심, 위쪽이 손잡이.
- 판정: 줄 중심 ±22px, 그림 위에서24px 아래부터 끝까지(`swordHitRect`). 경고 띠와 같은 폭.
- 꼭대기 부채: 0.9배 다섯 자루, 가재맨 머리 위.
