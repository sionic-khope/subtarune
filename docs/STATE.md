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
| 가구/소품 그림 | `assets/props/*.png` | `tools/art/room_set.py`(방) / `tools/art/living_set.py`(복도·거실·부엌) 의 `prop_*` 함수. 실행은 `/usr/bin/python3`(PIL 있음) |
| 캐릭터 스프라이트 | `assets/sprites/<id>.png` (4열×4행, 2x) | `tools/sprites/slice_sheet.py` 로 원본에서 재추출. 가장자리 연결 배경만 제거, 기존 엔진용 배율은 최근접 변환. **추가 축소·색 평균·양자화 금지** |
| 캐릭터 정의 | `src/data/characters.js` | 이름/목소리/팔레트. 형섭은 `self`(이름·초상화 없음) |
| 대사 | `src/data/scripts.js` | 키 = 상호작용/트리거의 `script`. 태그 `{w=} {s=} {c=} {shake} {wave}` |
| 컷신 | `src/data/cutscenes/*.js` | `/cutscene` 스킬. 노드 레퍼런스 `src/ui/cutscene.js` 상단 |
| 목소리 블립 | `assets/audio/voices/<voice>.mp3` (0.1~0.2s 한 조각) | `src/core/audio.js VOICES` 의 `rate`(톤) / `level`(크기) |
| 효과음 | `assets/audio/sfx/<name>.mp3` | 파일 있으면 파일, 없으면 합성. 로드 목록은 `src/main.js loadSfxFiles([...])` — **새 이름은 여기 추가** |
| BGM | `assets/audio/bgm/<name>.mp3` | 맵 JSON `bgm`, 컷신 `{bgm:'x'}` |
| 오디오 출처 | `design/audio/references.md` | 유튜브 링크·경로·상태 |
| 델타룬 에셋 라이브러리 | `assets/library/deltarune/{sprites,maps}` | 참고·소품용. **배경/타일은 직접 그린 것을 쓴다**(사용자 요구) |

## 지금까지 확정된 규칙 (사용자 피드백)
- 에셋은 **그대로**: 원본 시트를 보존하고 게임용 추출 이후 추가 축소/색 양자화를 하지 않는다. 추출 시에도 외곽선 침식·색 평균 금지. 합성 목소리는 싫어함 → 유튜브/게임 원본 소리 사용.
- 델타룬 이미지를 통째로 가져오지 말고 **같은 퀄리티로 직접 그린** 타일/소품으로 맵 구성 (`tools/art/`).
- 형섭 대사는 나레이션처럼(이름·초상화 없음, narrator 목소리).
- 기본 이동 = 달리기, X/Shift = 천천히. C 확인, X 취소, Esc 타이틀, V 메뉴, T(타이틀) 테스트룸, F1 디버그(오디오 상태 포함).
- 대화창 4줄·여백 넉넉히. 말풍선/하단 가이드 UI 없음. 대화창 열림/닫힘 효과음 없음(언더테일 동일). 나레이션 = 언더테일 원본 `snd_txt1` 원본 길이 그대로, 글자 33ms.
- 트리거/문 무결성 규칙은 `.claude/skills/map/SKILL.md` 체크리스트 + `tests/unit/maps.test.mjs` 가 강제(재진입 1회, 쿨다운, 문 핑퐁, 스폰 위치, 영역 겹침).
- 컷신 중 맵이 새면 안 됨 → `{curtain:'black'|'white'|null}` 로 막는다. `{bgm:null, fadeOut:n}` (fade 아님).
- **UI 표현 규칙(재발 금지)**: 맵은 화면(480×360) 이상 크기 + 타일맵은 사방 벽으로 닫는다(검은 띠·뚫림 금지, `tests/unit/maps.test.mjs` 가 검사). 플레이어가 소품 히트박스에 겹쳐 있으면(침대 위 등) 항상 소품 앞에 그린다. 컷신 포즈 전환 직후 캐릭터가 가려지면 안 된다. 스크린샷으로 **네 모서리와 상태 전환 순간**을 확인한 뒤 완료라고 한다.
- OMC 하네스 유지: `.claude/settings.json` 에 statusLine/hooks 넣지 않는다.

## 스토리 진행 상태
- 오프닝(나레이션 11줄 → 요플래 선택 → 흰색 → 우이동 캡션 → 침대에서 일어남) 완료.
- 방 상호작용: 컴퓨터(코드 없음→엄마), 침대(이불/선반→바세린), 포스터, 창문(반지하: 창밖에 반밖에 안 보인다), 문(컴퓨터 전엔 잠김 `requires:'pc_checked'`). 러그는 사용자 요청으로 제거(2026-09-09).
- 복도 `corridor`(ㄱ자: 방문에서 내려와 오른쪽 끝 출입구 → 거실). 액자(어릴 때 사진), **삽**("삽이다. 집 밖으로 나갈 때 써야 한다." — 집 밖 이벤트 복선, 아직 아이템은 아님).
- 거실 `living`(26×13, 살짝 어두움 `dim:0.22`, 부엌 오른쪽): 진입 컷신 `living_enter` 1회(엄마 없음 → 코드 찾자 → 배고파 → 밥상), 밥상(에그타르트 예/아니오 → 먹으면 접시만 남음, `tart_eaten`), 냉장고(후추·사골곰탕 → 기분 안좋아짐), 티비("빈 코드를 뒤져봐야겠다." — 다음 이벤트 대기), 왼쪽 출입구 → 복도. 그 외 전부 대사 있음: 소파·화분·장식장·싱크대(밥솥)·가스레인지(사골곰탕 냄비)·창문·시계(8시 40분)·달력. 러그/방석/상부장/문틀은 장식.
- **벽에 붙는 소품 규칙**: 포스터·창문·시계·달력·액자처럼 벽에 걸린 것은 히트박스를 **벽 밑단(y 86~96, h 10)** 에 두고 그림은 `ix/iy` 로 위에 그린다. 안 그러면 플레이어가 벽 앞(y 96)에서 C 를 눌러도 프로브(0.6타일 앞)가 닿지 않는다. `tests/playtest/furniture.mjs` 가 전 소품 도달성을 검사.
- 다음(사용자 브리핑 대기): 티비 이벤트, 엄마 NPC(스프라이트 필요), 미니게임 프레임워크(타이밍 버튼).

## 맵 데이터 옵션 (엔진이 지원하는 것)
- 맵 JSON: `bgm`, `dim`(0~1, 어두움 오버레이 — 대화창은 안 어두워짐), `enter:{script, flag}`(도착 페이드 인 직후 1회 스크립트. flag 있으면 영구 1회, 대사 중이면 건너뜀).
- 엔티티: `door` 는 `requires:'플래그'` + `lockedScript` 로 잠금(트리거와 같은 진입 1회 규칙). 소품 `unless:'플래그'`(플래그 서면 안 나옴, 예: 먹은 에그타르트) / `requires:'플래그'`(서야 나옴). 스크립트에서 `{remove:'id'}` 로 즉시 제거.
- 장식 소품(러그·방석, script 없음)은 C 프로브 대상이 아니다(`canInteract`). 바닥에 깔리는 소품은 히트박스를 윗변 2px(`w,h:2`)로 줘서 y정렬상 항상 뒤에 그린다.
- 검증 스크립트: `tests/playtest/house.mjs` (방→복도→거실 전 동선·상호작용·재진입 19개 체크).

## 검증 방법
스프라이트: `uv run --with pillow --with numpy --with pytest pytest tests/sprites -q` (배경·외곽선·원본 색·프레임 계약 회귀). `node tests/playtest/sprites.mjs` (서버 8765, 형섭·경섭·빠맨·쥰희 4방향×4프레임, 대화창 인물 연결, PNG 로딩). 원본 3인 시트 왼쪽부터 `hyungsub/gyeongsub/ppaman`, 돼지 별도 시트는 `junhee`다. 재추출 명령은 README의 '캐릭터 시트 재추출' 참고.

2026-09-09 재추출 검증: 스프라이트 회귀 8개·기존 유닛 32개 통과, 실제 브라우저에서 4명 이동/대화창 확인. 구형 `smoke.mjs`는 현재 없는 `merchant` 스크립트와 `house` 맵을 참조해 런타임 오류가 난다(스프라이트 변경과 무관한 기존 테스트 문제). 스프라이트 확인은 `sprites.mjs`, 집 동선은 `house.mjs` 사용.

`node --test 'tests/unit/*.test.mjs'` · `node tests/playtest/house.mjs`(집 동선) · `node tests/playtest/cutscene.mjs opening` (스크린샷 `tests/playtest/shots/`). 헤드리스 크로미움: `~/Library/Caches/ms-playwright/chromium_headless_shell-*/…/chrome-headless-shell` (CHROME_EXE). `playwright-core` 는 프로젝트에 없음 — 세션 스크래치 `pw/node_modules` 가 있는 폴더에 스크립트를 복사해 실행(`SHOT_DIR` 로 스크린샷 위치 지정).
UI 확인: 스크린샷 **네 모서리 + 전환 순간**을 보고 끝낸다(ㄱ자 맵의 벽 바깥 검은 영역은 델타룬과 같은 정상 표현, 바닥 아래로 검은 띠가 보이면 버그).
