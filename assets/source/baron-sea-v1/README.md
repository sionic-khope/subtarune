# 바다 추격용 바론

2026-09-12 사용자 요청: 오른쪽 바다에서 왼쪽을 보며 용준을 입에 물고 있는 거대 바론. 나무총 첫 명중에 붉게 반응하고 옆모습으로 포효한다.

- `raw-sheet.png`: 이미지 생성 원본. 기존 바론 왼쪽 발사 그림·포효 시트를 정체성 참고로 사용했다.
- `sheet-transparent.png`: 2×2, 셀 660×660, 순서 대기·흡기·포효·회복. 런타임은 같은 바이트의 `assets/sprites/baron-sea.png`다.
- 용준은 그림에 합성하지 않고 기존 정면 캐릭터를 입 앵커에 붙여 그린다. 몸통·얼굴 정체성을 새로 바꾸지 않는다.
- `pipeline-meta.json`에 변환 계약을 기록했다. 원본 픽셀 크기 유지, 공통 바닥 정렬, 양자화·외곽 침식 없음. 마젠타 임계40/외곽55로 배경만 제거한다. 기본100/150은 보라 몸통까지 지워 사용하지 않는다.

생성 프롬프트: SUBTARUNE용 날카로운 저해상도 픽셀 아트. 거대 보라 바론의 뿔·여러 황록색 눈·보라 갑옷 목·연보라 배·뼈색 송곳니 유지. 바다에서 솟은 상반신 옆모습이며 왼쪽을 본다. 바다·배경·사람은 그리지 않는다. 검게 열린 입은 기존 용준을 게임에서 붙일 자리다. 2행2열의 대기, 흡기, 크게 포효, 회복 네 프레임. 크기·바닥 기준 고정, 중앙70% 안에 전신 실루엣, 절단 금지. 제한된 평면 색과 계단형 외곽선, 블러·그라데이션 금지. 배경은 단색 #FF00FF. 글자·격자·워터마크 없음.

재생성 후처리: `generate2dsprite.py process --target creature --mode roar --rows 2 --cols 2 --cell-size 660 --fit-scale 0.95 --scale-strategy preserve --align bottom --shared-scale --component-mode all --trim-border 0 --edge-clean-depth 0 --threshold 40 --edge-threshold 55 --strict-qc --duration 160`.
