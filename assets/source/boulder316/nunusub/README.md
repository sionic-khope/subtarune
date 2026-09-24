# 누누섭316: 거대한 바위 밀기 적

최종 런타임은 `assets/enemies/nunusub316.png`,768×768 RGBA,384px셀2×2, 공통 발 피벗192,360이다. 순서는0왼쪽 밀기 버티기/1낮게 힘주는 밀기/2포효/3오른쪽으로 밀려남이다.0↔1은280/320ms 반복, 포효700ms·밀려남600ms는 장면 담당이 연결할 권장 hold다. 실제 몸 높이는290/268/321/299px이며 한 공통 배율로 처리했다. 낮은 힘주기와 곧추선 포효의 키 차이를 프레임별 확대 보정하지 않았다. 장면 담당 합의 배율0.88에서 약255/236/282/263px로 일반 파티50~65px보다 크게 보인다.

## 외형과 참조

- [Riot 공식 누누와 윌럼프](https://www.leagueoflegends.com/en-us/champions/nunu/),2026-09-24 조회. 작은 기수와 거대한 털복숭이 설인의 구도, 뿔·여러 팔·손 실루엣 참고. 페이지가 제공한 [기본 스플래시](https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nunu_0.jpg)를 `references/riot-nunu-willump.jpg`로 보존했다. 게임에 이 스플래시를 표시하는 것은 아니다.
- `assets/sprites/gajaeman_shadow.png`: 넓은 볼·큰 U자 코·검은 안경·두 눈, 회청/먹색 얼굴 정체성.
- `assets/source/regret315/syndrasub/frame-0.png`: 픽셀 윤곽·짙은 회청/남색/보라 색감. 실제 참조 입력3개를 모두 열어 본 뒤 생성했다.
- `assets/source/memory309/udyrsub/processed/combat-1.png`: 동일 지역 스타일 확인용으로 열었으며 생성 호출 첨부는 하지 않았다.

기수와 설인 각각 눈 두 개와 안경을 유지한다. 네 팔을 가진 설인의 앞손은 왼쪽의 별도 바위를 밀고, 포효 때만 입을 벌린다. 바위·바닥·연기·오라·충격/먼지/소리는 시트에 구워 넣지 않았다. 미는 손의 대략적인 셀 접점은0번 위손42,202/아래손64,238,1번 위손43,215/아래손42,260이다. 바위 접촉은 이 좌표를 장면 발 피벗에 상대 변환하여 맞춘다.

## 생성과 후처리

내장 image_gen1회. 정확한 실제 프롬프트는 `prompt-used.txt`. 출력 원본은 `raw-sheet.png`(1254×1254,627px셀)이며 원래 도구 경로는 `/Users/khope@sionic.ai/.codex/generated_images/01a0ceb3-fd8e-7991-b9a8-7c984c346ba0/exec-077c3bdb-bf6b-44f8-807c-c82a34ef3aeb.png`다. 도구가 backend모델·quality·비용을 노출하지 않아 unknown이다. 외부 유료 API를 호출하지 않았다. 프롬프트는 마젠타 배경을 요구했지만 반환 파일의 실제 알파를 보존했다.

1. `generate2dsprite.py process`: creature/combat,2행2열,384셀,fit0.90,preserve,feet,shared-scale,largest,trim0,edge-clean0,strict QC. `processed/`는 검사/마스크·분할 메타데이터이며 중간 `sheet-transparent.png`는 최종 런타임 파일이 아니다.
2. `export.cjs`: 원본 cleanPNG와 셀 로컬crop에 셀 원점을 더해 추출, 첫 포즈crop높이 기준 `300/520` 하나의 배율로 모든 셀 NEAREST축소, 알파128 기준 이진화, 투명 가장자리만 잘라 공통feet360에 놓음. 얼굴·팔·발·옷을 새로 그리거나 프레임별 배율을 바꾸지 않는다.

재현(저장소 루트):

```sh
uv run --with numpy --with pillow /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py process --input assets/source/boulder316/nunusub/raw-sheet.png --target creature --mode combat --rows 2 --cols 2 --output-dir assets/source/boulder316/nunusub/processed --cell-size 384 --fit-scale 0.90 --align feet --scale-strategy preserve --shared-scale --component-mode largest --trim-border 0 --edge-clean-depth 0 --strict-qc --prompt-file assets/source/boulder316/nunusub/prompt-used.txt --duration 300
node assets/source/boulder316/nunusub/export.cjs
```

`sharp`를 별도 모듈 위치에서 읽으면 `SPRITE_SHARP`를 지정한다. 이 경로의 스킬 설치 여부는 실행 환경에 맞춰 확인한다.

## 최종 검사와 한계

최종4셀 모두 비어 있지 않음·서로 다른 픽셀해시·불투명 마젠타0·셀 가장자리 접촉0·공통발360·이진 알파다. `final-qc.json`에 실제crop/bbox/hash가 있다. 모든 최종 포즈를 `contact-preview-2x.png`와 개별 프레임으로 직접 확인했다. 밀기 두 자세는 팔꿈치/무릎/어깨와 기수의 팔이 달라지며, 포효는 네 팔/입이 열리고, 밀려남은 뒤로 젖히고 손을 떼므로 통째 흔들기로 대체하지 않는다.

`preview.html`은 최종 PNG 밀기 두 장을 실제280/320ms로 보여 준다. 장면의 바위 접점·플레이어 대비 크기·카메라 잘림·사운드·승패는 별도 통합 검수 대상이다. 자산 완료를 게임 통합 완료로 주장하지 않는다. 외부 worktree 경로의 LSP hook은 scope오류를 냈으며 실제 export 실행과 `node --check`로 별도 검사했다.

이 자산 작업에서 CUA 브라우저 목록은 비어 있었고 `createBrowserTab('iab', ...)`는 `Browser is not available: iab`를 반환했다. 따라서 실제 브라우저 애니메이션 재생 관찰은 미확인이다. `push-preview.gif`는 최종0/1번의300ms씩 두 프레임 반복 미리보기이며 실제 장면280/320ms 큐를 대신하지 않는다.
