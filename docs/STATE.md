# SUBTARUNE 현재 상태 (세션 넘어갈 때 여기부터 읽는다)

마지막 갱신: 2026-09-10

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
| 캐릭터 정의 | `src/data/characters.js` | 이름/목소리/팔레트/`portraitThreshold`(초상화 흰검 변환 문턱). 형섭 대사는 `HS()` 규칙(위 '형섭 대사 구분') |
| 대사 | `src/data/scripts.js` | 키 = 상호작용/트리거의 `script`. 태그 `{w=} {s=} {c=} {shake} {wave}` |
| 컷신 | `src/data/cutscenes/*.js` | `/cutscene` 스킬. 노드 레퍼런스 `src/ui/cutscene.js` 상단 |
| 목소리 블립 | `assets/audio/voices/<voice>.mp3` (0.1~0.2s 한 조각, **앞 무음 없이** — 경섭 클립은 무음 62ms 때문에 안 들렸었음) | `src/core/audio.js VOICES` 의 `rate`(톤) / `level`(크기) / `minGap`(블립 최소 간격, 초; 긴 클립용) / `poly`(앞 소리를 끊지 않음 — 나레이션 원본 방식) |
| 효과음 | `assets/audio/sfx/<name>.mp3` | 파일 있으면 파일, 없으면 합성. 로드 목록은 `src/main.js loadSfxFiles([...])` — **새 이름은 여기 추가** |
| BGM | `assets/audio/bgm/<name>.mp3` | 맵 JSON `bgm`, 컷신 `{bgm:'x'}` |
| 오디오 출처 | `design/audio/references.md` | 유튜브 링크·경로·상태 |
| 델타룬 에셋 라이브러리 | `assets/library/deltarune/{sprites,maps}` | 참고·소품용. **배경/타일은 직접 그린 것을 쓴다**(사용자 요구) |

## 지금까지 확정된 규칙 (사용자 피드백)
- **걷기 아트 v3(2026-09-10 최신)**: 사용자 요청으로 형섭·경섭·빠맨을 내장 이미지 도구로 재생성했다. `assets/source/walk-v3/`에 각 4방향×4열 원본/프롬프트를 보존하고 `assets/sprites/`의 세 PNG를 교체한다. 형섭은 전 방향 입 없음. 세 캐릭터의 옆걷기는 새 중립 상체와 새 하체 A/B를 연결하는 3포즈/4박자이며, `characters.js sideWalk` 연결 높이도 새 시트 기준이다. 아래의 원본 유지·다른 캐릭터 발 위치 이동 설명은 v3 이전 이력이며 쥰희의 기존 방식만 계속 유지한다. 대화창 초상화와 과거 원본은 교체하지 않았다. 최신 main의 억빠맨 동료/추종/뗏목/저장 기능과 `CHAR_SCALE=1.43`은 보존한다.
- **전투 이미지 v1(2026-09-10)**: 형섭=칼/입 없음, 경섭=양손도끼, 빠맨=파란 구슬 한손 마법봉. 사용자 승인으로 내장 이미지 생성 사용(모델 2.5 고정 아님). 각 4대기+4공격, `assets/battle/` 원본/프롬프트와 `src/data/battle-sprites.js` 프레임 영역·발 기준점·시간을 함께 사용한다. RGB 마젠타 원본이므로 최초 열기 때 투명 프레임을 캐시한다. `?map=test&battle=1` 또는 테스트룸 팻말로 열고 좌우/C/X로 선택/공격/복귀. 기존 필드를 멈추며 세이브는 유지한다. **전투 모션 미리보기만 연결됨**: 적/HP/턴/피해/스토리 전투 시스템은 아직 없다. 기존 걷기와 별도 에셋이다.
- **형섭 보행·표시 보정(2026-09-10)**: 형섭만 중립 상체 + 원본 하체 두 포즈를 조합해 발의 교차를 살린다. 옆방향은 3포즈/4박자 유지. 원본·입 없는 얼굴·정면/뒷면·속도는 그대로다. 아래의 발 위치 이동 방식은 다른 캐릭터에 계속 적용한다. 화면은 DPR 기반 정수 배율로 표시하고 작은 창은 전체 맞춤한다. `CHAR_SCALE=1.43`은 보존하므로 내부 비정수 캐릭터 확대 자체는 남아 있다. 아트 재생성이나 전투 이미지 작업 완료로 취급하지 않는다.
- 에셋은 **그대로**: 원본 시트를 보존하고 게임용 추출 이후 추가 축소/색 양자화를 하지 않는다. 추출 시에도 외곽선 침식·색 평균 금지. 합성 목소리는 싫어함 → 유튜브/게임 원본 소리 사용.
- 델타룬 이미지를 통째로 가져오지 말고 **같은 퀄리티로 직접 그린** 타일/소품으로 맵 구성 (`tools/art/`).
- **형섭 대사 구분(2026-09-10 확정)**: 인트로 맵(방·복도·거실, `void_fallen` 전)에서 형섭이 **입으로 말하는 줄**은 `HS()`(`src/data/scripts.js` export) → 이름 '형섭' + 흰검 초상화 + **가재맨 '넌' 톤 목소리**(`voices/hyungsub.mp3`). 사물 설명("창문이다")·괄호 속 생각·상태("기분이 안좋아졌다")·의성어("철컥..")는 narrator 그대로. **보라맵부터는 자아가 바뀐 컨셉** → 형섭 대사도 이름·초상화 없이 narrator(HS 금지). 브리핑의 `형섭:` 줄은 이 규칙으로 변환.
- **형섭 그림에는 입이 없음**: 2026-09-09 사용자가 직접 픽셀 수정을 승인해 옆모습에 남은 입선 261픽셀만 피부로 복원했다. 원본 수정 범위는 `assets/source/hyungsub-mouth-retouch.json`. 코·안경·턱·경섭의 입은 유지. 입이 남은 이전 생성 초안을 재사용하지 않는다.
- **대화창 초상화는 언더테일처럼 흰/검 2톤 도트**(2026-09-09 확정). 컬러 `assets/portraits/*.png` 를 런타임에 `gfx.monoPortrait` 가 변환(96→48 축소, 어두운 픽셀=검정, 실루엣 가장자리는 흰 선). 캐릭터별 문턱은 `src/data/characters.js portraitThreshold`(빠맨 0.3, 쥰희 0.6, 기본 0.38). 새 캐릭터 초상화가 뭉개지면 이 값만 조정.
- 캐릭터 배율 `CHAR_SCALE=1.43`(world.js, 2026-09-09 +10%). 기본 이동 = 달리기, X/Shift = 천천히. C 확인, X 취소, Esc 타이틀, V 메뉴, T(타이틀) 테스트룸, F1 디버그(오디오 상태 포함).
- 걷기 보정: 방향별 4프레임을 공통 영역/같은 샘플링 격자로 추출하고 신발 끝을 보존한다. **옆걷기는 전 캐릭터 3포즈**(2026-09-09 사용자 요청): 기본→발 A→기본→발 B. 상체·머리·팔은 고정하고 발 위치만 바꾼다. PNG는 각 옆방향 첫 프레임 + `characters.js sideWalk` 설정으로 최초 로드 시 조합, 대체 도트는 기존 TORSO+LEGS 방식. PNG·초상화·정면/뒷면 모션은 유지. 이전 형섭 전용 `walkFrameOrder`는 폐기. `Character.animPhase`, 이동 속도, 충돌 시 정지, `CHAR_SCALE`은 유지한다.
- 대화창 4줄·여백 넉넉히. 말풍선/하단 가이드 UI 없음. 대화창 열림/닫힘 효과음 없음(언더테일 동일). 나레이션 = 언더테일 원본 `snd_txt1`, **글자마다(33ms) 울리고 앞 소리를 끊지 않음**(`poly:true, minGap:0` — 언더테일과 동일. 2026-09-09 '두 글자에 한 번' 으로 바꿨다가 '목소리 바뀌었다' 피드백으로 복구). 긴 클립인 경섭·빠맨만 mono cut + minGap 0.07~0.08.
- 트리거/문 무결성 규칙은 `.claude/skills/map/SKILL.md` 체크리스트 + `tests/unit/maps.test.mjs` 가 강제(재진입 1회, 쿨다운, 문 핑퐁, 스폰 위치, 영역 겹침).
- 문 전환 페이드는 **항상 검은색**(직전 컷신이 흰 페이드를 썼어도 — 2026-09-09 '눈 아프다'). 보라맵 문은 소리 없음(`door` 엔티티 `sfx:false`).
- 컷신 중 맵이 새면 안 됨 → `{curtain:'black'|'white'|null}` 로 막는다. `{bgm:null, fadeOut:n}` (fade 아님).
- **UI 표현 규칙(재발 금지)**: 맵은 화면(480×360) 이상 크기 + 타일맵은 사방 벽으로 닫는다(검은 띠·뚫림 금지, `tests/unit/maps.test.mjs` 가 검사). 플레이어가 소품 히트박스에 겹쳐 있으면(침대 위 등) 항상 소품 앞에 그린다. 컷신 포즈 전환 직후 캐릭터가 가려지면 안 된다. 스크린샷으로 **네 모서리와 상태 전환 순간**을 확인한 뒤 완료라고 한다.
- OMC 하네스 유지: `.claude/settings.json` 에 statusLine/hooks 넣지 않는다.

## 스토리 진행 상태
- 오프닝(나레이션 11줄 → 요플래 선택 → 흰색 → 우이동 캡션 → 침대에서 일어남) 완료.
- 방 상호작용: 컴퓨터(코드 없음→엄마), 침대(이불/선반→바세린), 포스터, 창문(반지하: 창밖에 반밖에 안 보인다), 문(컴퓨터 전엔 잠김 `requires:'pc_checked'`). 러그는 사용자 요청으로 제거(2026-09-09).
- 복도 `corridor`(ㄱ자: 방문에서 내려와 오른쪽 끝 출입구 → 거실). 액자(어릴 때 사진), **삽**("삽이다. 집 밖으로 나갈 때 써야 한다." — 집 밖 이벤트 복선, 아직 아이템은 아님).
- 거실 `living`(26×13, 살짝 어두움 `dim:0.22`, 부엌 오른쪽): 진입 컷신 `living_enter` 1회(엄마 없음 → 코드 찾자 → 배고파 → 밥상), 밥상(에그타르트 예/아니오 → 먹으면 접시만 남음, `tart_eaten`), 냉장고(후추·사골곰탕 → 기분 안좋아짐), 티비("빈 코드를 뒤져봐야겠다." — 다음 이벤트 대기), 왼쪽 출입구 → 복도. 그 외 전부 대사 있음: 소파·화분·장식장·싱크대(밥솥)·가스레인지(사골곰탕 냄비)·창문·시계(8시 35분, 오프닝과 같은 시각)·달력. 러그/방석/상부장/문틀은 장식.
- **벽에 붙는 소품 규칙**: 포스터·창문·시계·달력·액자처럼 벽에 걸린 것은 히트박스를 **벽 밑단(y 86~96, h 10)** 에 두고 그림은 `ix/iy` 로 위에 그린다. 안 그러면 플레이어가 벽 앞(y 96)에서 C 를 눌러도 프로브(0.6타일 앞)가 닿지 않는다. `tests/playtest/furniture.mjs` 가 전 소품 도달성을 검사.
- 티비: 3D 서랍 씬에서 보라색 컴퓨터 코드 획득(아래 '3D 씬'). 코드를 얻은 뒤 컴퓨터는 "(코드는 챙겼다.)" — **꽂는 이벤트는 브리핑 대기**.
- 코드 챙긴 뒤 컴퓨터: **방송 컷신** `pc_stream`(철컥 → 방송 세팅 → 채팅창 100명 왜 늦었냐/엄준식 → 사과·일요일 약속 → 극락·ㅋㅋㅋ 도배 → 오류창 "보라색 코드에서 에러" [해결하기] → 딸깍 → 정적·물음표 → 소용돌이 → 흰색 → `void` 맵에 추락, stage `void_fallen`). 콘티 `design/narrative/cutscenes/pc_stream.md`.
- `void` 맵(30×12, `tools/art/void_set.py`): 검은 허공 위 보라색 땅·꽃, 왼쪽 착지 꽃밭 → 오른쪽 길 → 끝에 **거대한 검은 문**(`big_door.png`, `void_door` 임시 한 줄). 언더테일 초반 유적 입구 구도. **여기서부턴 브금 없이 잔잔한 바람 소리**(`bgm/wind.mp3`, 합성 32s 루프, 0.28).
- **큰 아치문(`big_door.png`)은 보라맵1 출구 전용**(2026-09-10 사용자 확정). 이후 맵의 출입은 땅이 화면 가장자리까지 이어진 곳(문 그림 없음, `door` 영역만). 코드는 재사용 가능하게 남겨 둠.
- 뗏목을 탄 플레이어는 **항상 뗏목 위에** 그려지고 발이 뗏목 아래쪽에 닿는다(덮이는 느낌 금지).
- `void` 대문 → **`void2`(보라맵2)**: 왼쪽 문으로 들어와 아래 보라 길(막다른길), 위쪽 착지 → **파란 물길 + 뗏목**(C 로 타면 오른쪽으로 ~4초 일직선, 반대편 착지에 내림, 다시 타면 되돌아옴) → 길 끝 거대한 검은 문(`void_door` 임시 한 줄, 다음 방 브리핑 대기).
- 검은 화면 목소리: 흰색 뒤 검은 화면에서 정체불명 목소리(`mystery`, snd_txt2 톤다운) 8줄("... 일어.. 일어나.." … "절대...ㄹ..") → 보라맵.
- `void2` 뗏목 앞 표지판(사용자 텍스트): "앞으로만 가는 땟목이다." / "아 물론! 뒤로도 갈수있다." / "반대편에서 탄다면~ 껄껄." 오른쪽 문 → **`void3`**.
- **`void3` 뗏목 퍼즐**(36×24): 입구 A(표지판 "땟목이 갈리는 곳이다 / 나가는 길은 하나뿐 껄껄") → 뗏목 → 교차로 B(위·오른쪽·아래 뗏목 셋) → **정답은 오른쪽 G**(표지판 "오 이걸 찾았노 ㅊㅋㅊㅋ"(사용자 지정), 땅이 화면 오른쪽 끝까지 이어져 그대로 `void4`). 아래 D("막다른 길이다 / 내려온 땟목을 다시 타면 돌아간다 껄껄")와 위 경로 C→F→E("막다른 길이다 껄껄")는 막다른길. 표지판 대사는 사용자 지정 하나 빼고 내가 지음.
- **`void4` 긴 뗏목 길**(76×16, 뗏목 ~12초 — 억빠맨 앞뒤 6초씩): 배경에 멀리서 지글지글 끓는 보라 불(`backdrop:'purple_fire'`). 물 한가운데 낮은 기둥 위에 **억빠맨(빠맨 스프라이트)**이 정면 보고 서 있음 → 지나쳐 도착하면 컷신 `void4_arrive`(카메라 억빠맨 클로즈업: "어 ㅅㅂ" / "형 구해줘요 ㅅㅂ 저 여기 갇혔어요." / "저기 저기 뭔가 다리를 내리는 레버가 있는거같아요" → 레버 클로즈업 → 주인공 복귀. "오케이" 는 사용자 요청으로 뺌). 도착지: 오른쪽에 **작은 잠긴 문**(`door_small.png` 문짝 위에 자물쇠, "자물쇠로 잠겨 있다"), 문 바로 옆 **4칸 계단** → 높은 발판의 **레버** → `void4_lever`: 다리가 드르르르륵 떨어지며 쿵!(rumble·thud·흔들림) → 다리 타일 연결(`tileSwaps.bridge_down`, 플래그 `bridge_down`) → 다리로 억빠맨까지 걸어가 말 걸면 **억빠맨 대화**(`src/data/cutscenes/void4_ppaman.js`): "안녕하세요 형. 구해주셔서 감사해요" → 선택지 [여긴 어디 / 왜 여기 / 물어볼건 없다]. 1: 방송 보다가… 의성어 20개가 0.16s 씩 스치는 개그 → 형섭 머리 위 `...` 말풍선 → "했어요." → (나레이션) "... ㅂㅅ새끼같다" → "어쨋든 그래요 형." / 2: 보라색 땅·다른 사람들·빨리 나가고 싶다 / 1·2 뒤엔 "더 물어보실거 있으세요?" 로 반복 / 3: "동행해도 괜찮을까요?" → "빨리 나가는걸 목표로 하죠" → **[억빠맨이 동료가 되었다]**(`ppaman_joined`, NPC 사라지고 뒤따라 걷기). 가입 후 말 걸기 불가(동료는 프로브 대상 아님).
- 다음(사용자 브리핑 대기): 억빠맨 동료 이후(경섭 합류 예정 — 파티 시스템은 준비됨), 엄마 NPC(스프라이트 필요), 미니게임 프레임워크(타이밍 버튼).
- **스토리 브리핑 형식**: 사용자는 `[트리거]` + `이름: 대사 (인터랙션 # 연출)` 로 준다 → `.claude/skills/cutscene/SKILL.md` 의 변환표대로 되묻지 않고 노드로 옮긴다. 선택지 연출 옵션 `delay/stagger/locked/auto/cursor:false` 는 `src/ui/dialogue.js` TextBox 가 지원(테스트룸 `test_choice_slow`, `test_choice_locked`).

## 상태 시스템 (2026-09-09 설계 — "코드 얻었는데 컴퓨터가 초기 대사" 같은 순서 꼬임 방지)
- **스토리 단계** `src/core/story.js STAGES`: `start → opening_seen → pc_checked → living_entered → cord_found → (다음 비트)`. 순서대로만 나아가고, 뒤 단계에 도달하면 **앞 단계 플래그가 전부 자동으로 선다**(backfill). 되돌아가지 않는다. 단계 id = `flags` 키라서 문/소품/스크립트는 `flags` 만 본다.
- **상태를 바꾸는 통로는 `game.setFlag(key)` 하나**: 스크립트 `{ stage:'id' }`(스토리 비트) / `{ set:{…} }`(side flag: `tart_eaten`, `vaseline`, `fridge_checked` 처럼 순서와 무관한 것), 트리거 `flag`, 맵 `enter.flag`, `scene3d flag`, 상자 `flag`. `flags[x]=true` 직접 쓰기 금지. 조건은 `game.has(key)` / 스크립트 `if:(f, story)=>…`.
- **새 스토리 비트 추가 절차**: `STAGES` 에 한 줄(id·설명·그 시점 맵/스폰) → 도달하는 스크립트에 `{ stage:'id' }` → 그 단계 이후 대사가 달라지는 소품은 `{ if:(f)=>f.id, goto:… }` 분기. 맵 JSON 에는 `"stage"`(그 맵에 있으려면 최소 도달 단계)를 적는다.
- **개발용 바로가기**도 단계를 거친다: `?map=living` → 그 맵의 `stage` 까지 backfill, `?stage=cord_found` → 그 단계의 맵/스폰으로. 타이틀 T(테스트룸)도 같음. → 바로가기로 들어가도 대사가 꼬이지 않는다.
- **자동 저장/이어하기**: 단계가 오를 때·맵을 옮길 때·스크립트가 끝날 때 `localStorage('subtarune.save.v1')` 에 저장(단계·플래그·인벤토리·맵·좌표·설정). 타이틀: 세이브 있으면 `C 이어하기 / X 처음부터(두 번)`. 새 게임은 세이브 삭제. Esc→타이틀은 저장을 지우지 않는다.
- 검증: `tests/unit/story.test.mjs`(backfill·비회귀), `maps.test.mjs`(맵 stage 선언·STAGES 맵/스폰 존재), `tests/playtest/story.mjs`(바로가기 backfill → 컴퓨터 대사, cord_found 이후 컴퓨터/문/티비, 자동 저장→새로고침→이어하기, 처음부터). F1 디버그에 `stage:` 표시.

## 재사용 기믹
- **뗏목** `src/world/world.js Raft` (`type:'raft'`): `{ type:'raft', id, image:'assets/props/raft.png', x,y, route:[[x,y],…], speed:114 }`. 옆에서 C → route 를 따라 일직선 이동(타는 동안 `game.ride` 가 서서 입력·트리거 정지), 도착하면 진행 방향으로 밀어 내림, 반대편에서 타면 되돌아옴. 위치는 `flags.raft_<id>`(route 인덱스)로 유지 → 맵을 나갔다 와도 그 자리. 속도 기본 171px/s(2026-09-09 +50%). 소리: 탈 때·1.1s 마다·내릴 때 `splash`(합성 첨벙, 2026-09-10 더 물소리답게). 물 타일 `o/O`(완전 단색 파랑, 막힘). 뗏목 도트는 최소(외곽선+한 색+선 3개) — 델타룬식, 요청 없는 소품은 디테일 넣지 않는다. 새 맵에 그대로 복사해 route 만 바꾸면 됨. 퍼즐 예시 `void3`(교차로 + 막다른길 2개). 검증 `tests/playtest/raft.mjs`, `void3.mjs`.
- **QA 바로가기**: `src/core/story.js QA_POINTS` — URL `?qa=<id>` 또는 **타이틀에서 Q** → 목록(↑↓ C). 지점: `opening`(방), `living`(거실 진입), `tv`(티비 앞), `pc_stream`(코드 획득 직후 컴퓨터 앞, C 로 방송), `void`(보라맵1), `raft`(보라맵2 뗏목 앞), `void3`(보라맵3 퍼즐 입구). 그 지점까지 스토리 단계가 자동으로 채워진다. 새 이벤트를 만들면 "직전 지점"을 한 줄 추가. 스폰에 `facing` 을 주면 그 방향으로 서서 시작.

## 파티(동료) 시스템 (2026-09-10)
- `game.party = ['ppaman', …]`(캐릭터 id 순서). 저장/이어하기에 포함. 새 게임·타이틀에서 초기화. QA 지점 `party:[…]` 로 구성 가능(`?qa=party`).
- **따라 걷기** `src/world/world.js Follower`: 주인공 발자국(`player.trail`)을 슬롯당 0.9타일 뒤에서 그대로 따라 걷는다(델타룬식). 충돌 없음(끼임 방지), 겹치지 않음, 멈추면 마지막 방향 유지. 맵 전환·컷신 뒤엔 주인공 뒤로 재정렬(`spawnParty`/`{regroup:true}`). 뗏목 등 탈것엔 같이 올라탐(주인공 옆).
- 가입/이탈: 컷신 `{ join:'ppaman' }`(맵의 같은 id NPC 제거 + 뒤에 붙음 + 자동저장) / `{ leave:'id' }`. NPC 엔티티엔 `unless:'<id>_joined'` 를 줘서 재로드 시 안 나오게.
- **파티 상태 UI**: V 메뉴 → `파티` — 리더(보라맵부턴 '요플래')와 동료들의 흰검 초상화·이름·역할·한 줄 상태(전투 없음 → HP 대신 상태). 표시명/한 줄은 `characters.js` 의 `partyName/partyDesc`. 메뉴 순서: 아이템·파티·설정·닫기.
- 동료는 말 걸 수 없고(canInteract false), 컷신에서 id 로 `move/face` 가능.
- **`...` 말풍선(재사용)** `src/ui/bubble.js`: 컷신 `{ bubble:'player'|id, dots:3, gap:0.4, hold:0.5 }` — 대화창 없이 머리 위 흰 풍선(검은 1px 테두리, 아래 꼬리)에 점이 하나씩 짧은 간격으로 찍히고 사라진 뒤 다음 노드. 브리핑의 ". (딜레이) . (딜레이) . 말풍선" 은 이걸로.
- 검증: `tests/playtest/party.mjs`(인사·3분기·개그 20상자·말풍선·루프·가입·따라걷기·방향전환·메뉴·저장/이어하기·맵전환 재정렬·뗏목 동승·QA 25개).

## 맵 연출 옵션 (2026-09-10 추가)
- `backdrop:'purple_fire'` — 허공 타일(' ')이 투명해지고 그 뒤에 멀리서 끓는 보라 불(화면 좌표, 카메라 1/4 패럴랙스)이 그려진다(`main.js drawBackdrop`). 다른 배경이 필요하면 이름을 추가.
- `tileSwaps: { <플래그>: { rows: { "<행>": "<새 행>" } } }` — 플래그가 서 있으면 로드 때 그 행으로 교체(다리 내려옴 등). 컷신에서 즉시 적용은 `{ tiles:'<플래그>' }` + `{ set:{<플래그>:true} }`. 행 길이는 원본과 같아야 함(유닛 테스트가 검사).
- `preload: [이미지…]` — 컷신에서 `{spawn}` 할 소품 이미지는 여기 적어야 로드된다(맵 엔티티가 아니라서).
- QA 지점에 `flags:{…}` 를 주면 그 side flag 도 켜진 채 시작(`void4_end`).
- 타일 `b`(다리, 걸을 수 있음) `s`(계단). 소품 `pillar/padlock/lever_off/lever_on/bridge_span49`.

## 방송 연출 UI (컷신 노드)
- `{ chat:'open' }` → 오른쪽 트위치식 채팅창(`src/ui/chat.js`, 물리 해상도 16px 폰트, 대화창 위까지). 모드 `late/spam/idle/question/silence/panic` 별 메시지 풀·속도. `{ chat:'close' }`. 닉 100명(`NICKS`, 필수 11명 포함). 쥰희는 "우욱 우욱 우욱 이거 빤스아니여" 한 줄만 도배(`JUNHEE_LINE`).
- `{ dialog:{title,text,button} }` → 윈도우98식 오류창(`src/ui/sysdialog.js`), `{ dialog:'press' }` 버튼 눌림(0.35s), `{ dialog:null }`.
- `{ vortex:{ at:'pc'|[x,y], size, grow } }` → 컴퓨터에서 커지는 소용돌이(`src/ui/vortex.js`, 월드 좌표, 기다리지 않음 — 대사와 동시에 자람), `{ vortex:{size,grow} }` 로 더 키움, `{ vortex:null }`.
- 효과음 파일 추가: `error`(snd_error) `plug`(snd_locker, 철컥) `click`(snd_select, 딸깍) `whoosh`(합성 노이즈, 쉬이익).
- 검증: `tests/playtest/stream.mjs`(채팅 모드 전환·오류창·정적·소용돌이·흰색·void 도착·문까지 걷기·자동저장 14개).

## 3D 씬 (WebGL 오버레이)
- **티비 서랍 씬** `src/scenes/drawer.js`: 티비 C → "빈 코드를 뒤져봐야겠다." → 2D 가 티비로 줌인(`{zoom:2.8, at:'tv'}`) → WebGL 오버레이가 크로스페이드로 덮음 → TV 지직 화면 정면 → 서랍이 스르륵 열리며 카메라가 내려가 고정 → **마우스**로 물건 드래그해 치우고 **보라색 코드** 클릭 → 코드가 화면으로 떠오르며 "획득했다!" → 페이드 아웃 → 2D 줌아웃 → "* 컴퓨터 코드를 획득했다!" (`flags.cord_found`, 인벤토리 '컴퓨터 코드'). X/Esc 로 취소하면 "(나중에 다시 뒤지자.)".
- three.js r170 을 `assets/lib/three.module.js` 로 동봉(MIT, `three.LICENSE`). 모델·텍스처는 전부 코드로 생성(벽지·마루·나무결·영수증·리모컨 텍스처는 캔버스로 그림). 팔레트는 `tools/art` 세트와 동일.
- 컷신 노드: `{ zoom:s, at:id|[x,y], offset?, duration? }`(2D 월드만 줌, UI 제외) · `{ scene3d:'<이름>', flag:'…' }`(`src/scenes/<이름>.js` 의 `run(game,node)` → `{found}`; WebGL 실패 시 자동 생략하고 found 처리 → 진행 막힘 없음). 씬 중엔 `game.scene3d` 가 서서 Esc 무시.
- 새 3D 씬을 만들 땐 `drawer.js` 의 골격(오버레이 DOM `makeOverlay` · 카메라 키프레임 · pointer 드래그 · `window.__drawer3d` 테스트 훅 · `finish()`)을 복사.
- 검증: `tests/playtest/drawer3d.mjs` (SwiftShader WebGL: `--use-angle=swiftshader --enable-unsafe-swiftshader`; 취소 경로 + 물건 드래그 + 코드 클릭 + 복귀 15개 체크, 스크린샷 `d3_*.png`). `house.mjs`/`furniture.mjs` 는 티비 씬을 X 로 닫고 지나간다.

## 맵 데이터 옵션 (엔진이 지원하는 것)
- 맵 JSON: `bgm`, `dim`(0~1, 어두움 오버레이 — 대화창은 안 어두워짐), `enter:{script, flag}`(도착 페이드 인 직후 1회 스크립트. flag 있으면 영구 1회, 대사 중이면 건너뜀).
- 엔티티: `door` 는 `requires:'플래그'` + `lockedScript` 로 잠금(트리거와 같은 진입 1회 규칙). 소품 `unless:'플래그'`(플래그 서면 안 나옴, 예: 먹은 에그타르트) / `requires:'플래그'`(서야 나옴). 스크립트에서 `{remove:'id'}` 로 즉시 제거.
- 장식 소품(러그·방석, script 없음)은 C 프로브 대상이 아니다(`canInteract`). 바닥에 깔리는 소품은 히트박스를 윗변 2px(`w,h:2`)로 줘서 y정렬상 항상 뒤에 그린다.
- 검증 스크립트: `tests/playtest/house.mjs` (방→복도→거실 전 동선·상호작용·재진입 체크). 맵 JSON `stage` 필드는 위 '상태 시스템' 참고.

## 검증 방법
3포즈 옆걷기: `node tests/playtest/side-walk.mjs`는 등록된 8명 모두 좌/우 3종 이미지·기본 포즈 재사용·상체 픽셀 동일·정면/뒷면 불변·4박자 재생과 정지를 실제 브라우저에서 검사한다. 두 브라우저 테스트는 `BASE_URL`로 서버 주소, `SHOT_DIR`로 캡처 폴더를 지정할 수 있다. 보폭/발 영역을 조정할 때는 모든 옆방향의 발 연결·잘림을 다시 눈으로 확인한다.

입·걷기 보정: `tests/sprites/test_hyungsub_mouth.py`는 입선 영역의 피부 복원을, `test_slice_sheet.py`는 가장자리 보존과 실제 시트 머리 기준점 정렬을 검사한다. `tests/unit/animation.test.mjs`와 `sprite-order.test.mjs`는 속도 전환·벽 충돌·프레임 순서를 검사한다. `sprites.mjs`는 현재 48×48 흑백 초상화에 맞춰 PNG 응답을 기다리고, 4명 모두 이동/속도 전환/벽에서 멈춤/대화창을 확인한다.

스프라이트: `uv run --with pillow --with numpy --with pytest pytest tests/sprites -q` (배경·외곽선·원본 색·프레임 계약 회귀). `node tests/playtest/sprites.mjs` (서버 8765, 형섭·경섭·빠맨·쥰희 4방향×4프레임, 대화창 인물 연결, PNG 로딩). 원본 3인 시트 왼쪽부터 `hyungsub/gyeongsub/ppaman`, 돼지 별도 시트는 `junhee`다. 재추출 명령은 README의 '캐릭터 시트 재추출' 참고.

2026-09-09 재추출 검증: 스프라이트 회귀 8개·기존 유닛 32개 통과, 실제 브라우저에서 4명 이동/대화창 확인. 구형 `smoke.mjs`는 현재 없는 `merchant` 스크립트와 `house` 맵을 참조해 런타임 오류가 난다(스프라이트 변경과 무관한 기존 테스트 문제). 스프라이트 확인은 `sprites.mjs`, 집 동선은 `house.mjs` 사용.

`node --test 'tests/unit/*.test.mjs'` · `node tests/playtest/house.mjs`(집 동선) · `furniture.mjs`(소품 도달성) · `choice.mjs`(선택지 연출) · `drawer3d.mjs`(티비 3D 서랍) · `story.mjs`(상태) · `stream.mjs`(방송 컷신) · `raft.mjs`(뗏목·QA) · `void3.mjs`(뗏목 퍼즐·첨벙·무음 문·검은 페이드) · `void4.mjs`(긴 뗏목·억빠맨 컷신·레버 다리·재로드 유지) · `party.mjs`(억빠맨 대화·동료 시스템) · `node tests/playtest/cutscene.mjs opening` (스크린샷 `tests/playtest/shots/`). 헤드리스 크로미움: `~/Library/Caches/ms-playwright/chromium_headless_shell-*/…/chrome-headless-shell` (CHROME_EXE). `playwright-core` 는 프로젝트에 없음 — 세션 스크래치 `pw/node_modules` 가 있는 폴더에 스크립트를 복사해 실행(`SHOT_DIR` 로 스크린샷 위치 지정).
UI 확인: 스크린샷 **네 모서리 + 전환 순간**을 보고 끝낸다(ㄱ자 맵의 벽 바깥 검은 영역은 델타룬과 같은 정상 표현, 바닥 아래로 검은 띠가 보이면 버그).
