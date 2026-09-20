# 최미스 자세 3차 (BUILD280, 2026-09-21)

사용자 “스읍미스랑 꽃뽑는 스프라이트 이런건 바지색깔 왜 핑크색아니냐 최미스 스프라이트 고쳐 / 얼굴도 다르네 살짝 미스는”.
- `walk-front-ref.png`: 걷기 시트 정면 0번 칸을 마젠타에 얹어 8배(참조 한 장). 이전 자세(choimis-poses-v1, 참조 = 4×4 미리보기)는 얼굴이 살짝 다르고 바지가 회색이었다.
- `seup-raw.png`(`seup.prompt.txt`) / `pick-raw.png`(`pick.prompt.txt`): “참조를 픽셀 그대로, 분홍 바지, 얼굴 새로 그리지 말 것” → `export.py` 가 걷기 정면 키(96)에 맞춰 128 칸 띠로 만들고 **색을 걷기 시트 팔레트로 스냅**한다(가면 파랑·잎 초록만 예외) → `assets/sprites/choimis-seup.png`(빛 드는 공터·무대 스읍 미스), `choimis-pick.png`.
- `masked-seup-raw.png` / `masked-pick-raw.png`(`masked-*.prompt.txt`, 참조 = 위 raw 0.5배 + 가면 정면): 같은 자세에 가면만 → `assets/sprites/choimis-masked-seup.png`, `choimis-masked-pick.png`(벚꽃 숲 6·7). 손이 얼굴에 닿는 자세는 손이 가면 앞에 오게 지시.
- `runtime-contract.json`: 배율·칸 크기.
