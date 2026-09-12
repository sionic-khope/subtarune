# 마이야르호 노을·카트 자산

2026-09-12. 내장 image_gen으로 만든 게임용 픽셀 아트. 제작 중 긴 보행 대신 약8초 접근 → 자동 탑승 → 약20초 옆모습 카트 주행으로 변경되었다. 카트는 왼쪽을 보며 요플래·빠맨·경섭 순서다. 반려된 앞뒤 원근 카트 초안은 런타임에 사용하지 않는다.

| 원본 | 게임 파일 | 규격 |
|---|---|---|
| sunset-raw.png | assets/backdrops/maillard_sunset.png | 1536×1024 원본 그대로. 해 없는 노을 바다, 수평선 원본 y약400 |
| sun-raw.png | assets/props/maillard_sun.png | 256×256 RGBA. crop [30,30,196,196], 중심[128,128] |
| cart-side-raw.png | assets/props/maillard-cart.png | 256×256 RGBA. crop [61,106,134,43], 수평 옆모습, 바퀴 포함 |

원본은 보존했다. generate2dsprite processor로 배경 제거·가장 큰 연결체 추출·최근접 축소만 실행했다. 테두리 침식·색 양자화 없음. strict QC: empty/edge-touch/clamp 모두0. 처리 설정과 bbox는 `sun-pipeline-meta.json`, `cart-pipeline-meta.json`. 도구 기본 저장소에도 생성 원본이 남아 있다.

재처리(각 input/output 선택):

```sh
uv run --with pillow --with numpy /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py process --input assets/source/maillard-sunrise-v1/sun-raw.png --target asset --mode single --output-dir /tmp/maillard-sun-processed --rows 1 --cols 1 --cell-size 256 --single-size 256 --fit-scale 0.9 --align center --scale-strategy preserve --component-mode largest --edge-clean-depth 0 --strict-qc
```

## 생성 프롬프트 요약

원경: Reference existing maillard_sea.png for ocean material/pixel density only. New3:2 opaque pixelRPG sunsetocean, no text/UI/characters/boats/buildings. Immense layered peach/coral clouds withgoldundersides, indigo/mauve/orangesky, oceanbelow. NO SUN/MOON/disk; gameinserts animatedsun. Clearcentralsky, crispbroadpixelclusters, restrainedcopperglints, no softpainting. 요청 수평선45%와 달리 생성 결과39.1%를 측정하여 런타임141/360에 맞췄다.

해: One isolatedcolossal sunsetSUN, Deltarune-like lowresolutionpixelRPG. Cream/goldendisk, stair-steppededges, broadwarmhorizontalbands, amber/coralbottom,palecenter; tighthalobands, no rays/face/cloud/ocean/reflection. Central70%safesquare,128pixelartfeel, cream#fff2b4 gold#ffcc70 amber#f39256, no text/UI. Uniformmagenta requested; deliveredtransparency preserved.

채택 카트: ONE extremelysimple woodenMINECART, EXACT SIDEVIEWLEFT. Like araftwithwheels: longlow rectangularhoney-browntub, horizontaltoprim,TWOplanklines,TWOgreywheels,tinyaxle. No elaboratebands/rivets/3D/interiorfloor/diagonal/topdown. Black1pixeloutline,twowoodtones/twowheeltones, lowwallforriderlayering. Generousmargin,48×24logicalpixelfeel, no character/rail/scene/groundplate/text. Uniformmagenta requested. 반려된 후면 카트 대신 이 그림을 사용한다.

## 재사용

`src/data/maillard-sunrise.js`가 시간·crop·색·크기를 소유하며 `src/world/sunrise.js`가 해/노을/밝기를 담당한다. 카트 음악14초부터4초간 상승 후 고정 상태를 배 맵에서 재사용한다. 캐릭터는 기존 원본 시트로 새 생성/덮어쓰기 없음.
