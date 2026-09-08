# SUBTARUNE 현재 상태 (세션 넘어갈 때 여기부터 읽는다)

마지막 갱신: 2026-09-09

## 한 줄 요약
델타룬 느낌의 웹 도트 스토리 어드벤처(팬게임, 비수익). 주인공 형섭(요플래). 타이틀 → 나레이션 오프닝 → 우이동 반지하 방 → (다음: 엄마 있는 거실 → 코드 찾기).

## 실행
`./dev.sh` → http://localhost:8000 (캐시 없는 서버, 에디터 저장 API 포함). 바꾼 뒤엔 **서버 재기동 + Cmd+Shift+R**. 타이틀 좌하단 `build` 스탬프(`src/main.js BUILD`)로 최신인지 확인.

## 어디에 뭐가 있나
| 무엇 | 파일 | 바꾸는 법 |
|---|---|---|
| 맵(방·거실…) | `assets/maps/<id>.json` (+`index.json`) | 에디터(`/editor.html`)나 JSON 직접 편집. 타일맵(`rows`) 또는 이미지맵(`image`+`walkable/solids`). 소품은 `entities` 의 `type:'prop'` |
| 타일 그림 | `assets/tiles/<name>.png` 32×32 | `tools/art/room_set.py` 로 생성(직접 그린 픽셀아트). 새 타일은 `src/world/tiles.js` 에 `registerTile` 한 줄 |
| 가구/소품 그림 | `assets/props/*.png` | `tools/art/room_set.py` 의 `prop_*` 함수 (painter 프리미티브로 그림) |
| 캐릭터 스프라이트 | `assets/sprites/<id>.png` (4열×4행, 2x) | 사용자가 준 AI 시트를 `tools/sprites/slice_sheet.py` 로 1/2 누끼 변환. **축소·양자화 금지** |
| 캐릭터 정의 | `src/data/characters.js` | 이름/목소리/팔레트. 형섭은 `self`(이름·초상화 없음) |
| 대사 | `src/data/scripts.js` | 키 = 상호작용/트리거의 `script`. 태그 `{w=} {s=} {c=} {shake} {wave}` |
| 컷신 | `src/data/cutscenes/*.js` | `/cutscene` 스킬. 노드 레퍼런스 `src/ui/cutscene.js` 상단 |
| 목소리 블립 | `assets/audio/voices/<voice>.mp3` (0.1~0.2s 한 조각) | `src/core/audio.js VOICES` 의 `rate`(톤) / `level`(크기) |
| 효과음 | `assets/audio/sfx/<name>.mp3` | 파일 있으면 파일, 없으면 합성. 로드 목록은 `src/main.js loadSfxFiles([...])` — **새 이름은 여기 추가** |
| BGM | `assets/audio/bgm/<name>.mp3` | 맵 JSON `bgm`, 컷신 `{bgm:'x'}` |
| 오디오 출처 | `design/audio/references.md` | 유튜브 링크·경로·상태 |
| 델타룬 에셋 라이브러리 | `assets/library/deltarune/{sprites,maps}` | 참고·소품용. **배경/타일은 직접 그린 것을 쓴다**(사용자 요구) |

## 지금까지 확정된 규칙 (사용자 피드백)
- 에셋은 **그대로**: 스프라이트 축소/색 양자화 금지, 합성 목소리는 싫어함 → 유튜브/게임 원본 소리 사용.
- 델타룬 이미지를 통째로 가져오지 말고 **같은 퀄리티로 직접 그린** 타일/소품으로 맵 구성 (`tools/art/`).
- 형섭 대사는 나레이션처럼(이름·초상화 없음, narrator 목소리).
- 기본 이동 = 달리기, X/Shift = 천천히. C 확인, X 취소, Esc 타이틀, V 메뉴, T(타이틀) 테스트룸, F1 디버그(오디오 상태 포함).
- 대화창 4줄·여백 넉넉히. 말풍선/하단 가이드 UI 없음. 대화창 열림/닫힘 효과음 없음(언더테일 동일). 나레이션 = 언더테일 원본 `snd_txt1` 원본 길이 그대로, 글자 33ms.
- 트리거는 **들어갈 때 한 번**만 발동(밟고 있는 동안 반복 금지).
- 컷신 중 맵이 새면 안 됨 → `{curtain:'black'|'white'|null}` 로 막는다. `{bgm:null, fadeOut:n}` (fade 아님).
- **UI 표현 규칙(재발 금지)**: 맵은 화면(480×360) 이상 크기 + 타일맵은 사방 벽으로 닫는다(검은 띠·뚫림 금지, `tests/unit/maps.test.mjs` 가 검사). 플레이어가 소품 히트박스에 겹쳐 있으면(침대 위 등) 항상 소품 앞에 그린다. 컷신 포즈 전환 직후 캐릭터가 가려지면 안 된다. 스크린샷으로 **네 모서리와 상태 전환 순간**을 확인한 뒤 완료라고 한다.
- OMC 하네스 유지: `.claude/settings.json` 에 statusLine/hooks 넣지 않는다.

## 스토리 진행 상태
- 오프닝(나레이션 11줄 → 요플래 선택 → 흰색 → 우이동 캡션 → 침대에서 일어남) 완료.
- 방 상호작용: 컴퓨터(코드 없음→엄마), 침대(이불/선반→바세린), 포스터, 문(컴퓨터 전엔 막힘). 
- 다음: 거실(엄마) 맵을 `tools/art` 세트로 확장해서 그리기, 문 연결, 엄마 NPC(스프라이트 필요), 미니게임 프레임워크(타이밍 버튼).

## 검증 방법
`node --test 'tests/unit/*.test.mjs'` · `node tests/playtest/smoke.mjs` · `node tests/playtest/cutscene.mjs opening` (스크린샷 `tests/playtest/shots/`). 헤드리스 크로미움: `~/Library/Caches/ms-playwright/chromium_headless_shell-*/…/chrome-headless-shell` (CHROME_EXE).
