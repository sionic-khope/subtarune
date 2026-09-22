# 최미스 플라워리 이동·초상화

## 납품

- `assets/sprites/choimis_flower.png`:512×512 RGBA,128×128셀,4열×4행. 행down/up/left/right,열0→1→2→3 반복,정지0번. 공통피벗(64,120),모든셀 실제신발바닥y120. GIF미리보기160ms/프레임이며 런타임은 기존걷기애니메이터시간을 따른다.
- `assets/portraits/choimis_flower.png`:48×48 RGBA. 정면0프레임의(37,17,92,70)을48×46 NEAREST로축소하고 위1px여백. 얼굴을다시그리지않았다.
- `runtime-128.png`/`sheet-transparent.png`는동일한납품시트. `frames/`,방향별GIF/strip,밝은·어두운확대미리보기,`old-new-comparison-4x.png`를함께보존했다. `neutral-front-8x.png`는정면대표512×512미리보기이며현재128셀기준4배다(초기64셀후처리시의파일이름유지).

## 생성·정체성

부모제작담당의Codex내장imagegen원본`exec-0647677c-27fa-4e31-b9ac-6e612d123e98.png`를`raw-sheet.png`로보관했다. 원생성파일은변경하지않았다. 내부모델·seed·요금은unknown이며정확한프롬프트는`prompt-used.txt`. 정체성참조는기존최미스,자세영감은플라워리이고금발·금색피부·꽃얼굴·새코트를추가하지않는다.

흰뾰족머리·안경·긴코·넓은뺨·이빨입·수염점·분홍GAP의상을유지하고몸통을좁힌생성결과다. 원본16셀은방향별중립/통과/보폭을포함하며중립에가까운포즈도있다. 모두큰보폭의서로다른16동작이라고주장하지않는다.

## 기계적처리

원본1254×1254의실제alpha를128기준이진화하고공통외곽(1,1,1253,1253)을잘라313×313소스셀로분할했다. 전체마젠타키는꺼분홍옷을보존했다. 표준`generate2dsprite`처리기의largest-component/공통preserve-scale/center-QC기하를사용한뒤최종픽셀은원본에서NEAREST로직접128셀에샘플링한다. 공통배율0.4007667731629393,프레임별bbox정규화없음,팔레트양자화없음.

실제신발바닥을y120에배치한다. 최종1px알파경계에붙은고채도이색잔여만기존최미스처리규칙으로제거했다. 마스크와프레임별제거량은`export.py`/`qc-meta.json`. 얼굴·글자·신체를그리거나늘이지않았다. 중간처리기의LANCZOS그림은납품에사용하지않았다.

초기64셀축소→2배후보는GAP의일부획을잃어반려하고원본→128셀직접샘플링으로교체했다. 최종전신높이99–104px(이전96–98px),몸체CV0.02623,최대키증가8.34%이하다. 16프레임모두비어있지않고경계접촉·clamp0,실제alpha0/255,발기준선동일. 밝은/어두운배경전프레임에서손발·분홍몸통·방향·GAP·얼굴을확인했다. 사용자최종승인과게임내통합검수는별도다.

재현: `uv run assets/source/choimis-flower291/walk/export.py tools/sprites/sheet_processor.py`.

SHA256:runtime`10abc8ce43b27c0c67cb70ff916315578bf16a3187bd11b7173f6b58ec7c738a`,portrait`c4ce7a5d250f11d58899edf25d7dff9cc330b982668bf47857890a4be2b93c93`,raw`9e9fb5a8c50d817a68f2420239f6b715994ac9b2295846f7849a6c71b4ab1858`.
