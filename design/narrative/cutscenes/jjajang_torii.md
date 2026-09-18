# 짜장 토리이 길 — 청소부(허약) 합류 (BUILD226, 2026-09-18)

## 사용자 브리핑 (원문)

> 먼가 노이즈 살짝만 줄여주고 범위는 딱 적당함. 그리고 두번째 토리이 지났을때 이벤트시작. (브금이꺼지고)
>
> (멈추고 1초뒤 뒤에서 또다른 걸음소리가 들림 그리고 물음표? 연출을 만들어서 요플래위에 띄우고 그 뒤로 다시)
> 그리고 청소부 형체의 검은색 실루엣이 걸어옴 발소리가 나며 요플래의 뒤까지 다가옴.
>
> 그리고 나레이션 목소리로
>
> 나레이션: 거기 너
> 나레이션: 지금 뭐하는 짓 인가
> 나레이션: 당장 나를..
>
> 그 뒤로 요플래가 느낌표! 후에 뒤를 돌아보자 화면이 페이드인 되면서 다시 페이드아웃되면서 화면정상화 후에
> 청소부 형태로 바뀌어있음 그때 브금 이걸로 바뀜 https://www.youtube.com/watch?v=JkEhQ3qJubU&list=PLjvc-G0Ad3UWvQDvrLiyi8ax9RxZilW6E&index=18
>
> 청소부: 어이 / 청소부: 젊은이 안녕한가 / 나레이션: 아 아빠..? / 청소부: 뭐? 잘안들린다네, 내가 지금 기억이 잘 안나서말이야 /
> 청소부: 분명 뭔가 폰으로 아들...인가 누군가 방..쉉? 라이부? 유투브? 이런걸 보고있었는데 / 청소부: 아 그뒤로 정신을 차려보니 아무 기억도 안난단 말일새 /
> 청소부: 나이가 들어서 그런가 어이구 힘들구먼 / 나레이션: ... / 청소부: 젊은이 반갑네 / 나레이션: 나는 인사했다. / 청소부: 뭔가 익숙한 얼굴인데 /
> 청소부: 나랑도 좀 닮은거 같구려 껄껄 / 청소부: 됐고 여기엔 어떻게 오게됐당가? / 청소부: 아 모르겠지물론 껄껄 나도 모르니까. /
> 청소부: 일단 이 늙은이 저기까지만 좀 데려다 줄 수 있는가? / 청소부: 응? 저기가 어디냐고? 뭐 저기~까지 저기~
>
> (영문은 모르겠지만 청소부(노란색)이 동료가 되었다)
>
> 하고 이제 억빠맨 김경섭마냥 동료가 되게해줘, 그리고 지금상태일때 인게임전투는 허약모습임 청소부(허약) 청소부(전투)랑 잘 구분해서 이벤트랑 합류 이벤트 이런거 다 구현해줘

## 구현

| 원문 | 구현 | 값 |
|---|---|---|
| 노이즈 살짝만 | `jjajang_torii.py vision.noise` | 0.6 → 0.5, 반지름(125/205)은 그대로 |
| 두 번째 토리이 지났을 때 시작, 브금 꺼짐 | 트리거 `torii_janitor_trigger`(35~36열, 두 번째 토리이 그림 끝 34열 바로 뒤), 컷신 `torii_janitor` 첫 노드 `{bgm:null}` | once, `unless torii_janitor_joined` |
| 멈추고 1초 뒤 뒤에서 걸음소리, 물음표 | `{wait:1}` → `{footsteps:1.2}`(이 구역 걸음 루프를 주인공이 서 있어도 켬, 새 DSL) → `{emote:'player', kind:'?'}`(새 이모트, 무음) | |
| 검은 실루엣이 발소리 내며 뒤까지 | `janitor_shadow`(걷기 시트를 검게 칠한 시트) 를 요플래 왼쪽 330px 에 놓고 `move … footsteps:true` 로 요플래 뒤(왼쪽 44px)까지 | 걷기 속도 |
| 나레이션 3줄 | `N('거기 너')` `N('지금 뭐하는 짓 인가')` `N('당장 나를..')` | narrator 목소리 |
| 느낌표 → 뒤돌아봄 → 페이드 → 청소부로 | `{emote:'!'}` → `{face:'player', dir:'left'}` → `{fade:'out'}` 사이에 실루엣 제거·`janitor` NPC 를 같은 자리에 → `{fade:'in'}` | 0.6초씩 |
| 브금 | `{bgm:'wise_words'}` = 사용자 링크 JkEhQ3qJubU(“56. Wise words (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox”, 47초 루프) | `assets/audio/bgm/wise_words.mp3` |
| 대사 | 원문 그대로, 청소부 = 청소부 목소리(janitor)·시트 얼굴 초상, 나레이션 = narrator | |
| 합류 문구 | `* 영문은 모르겠지만 {c=yellow}청소부가 동료가 되었다{/c}`(기존 “억빠맨이 동료가 되었다” 형식, 조사 이→가) | |
| 동료 | `{join:'janitor'}` + `torii_janitor_joined` 플래그. `PARTY_ORDER` 에 janitor, `partyFromFlags`: 침몰 뒤 + 이 플래그 → ['janitor'] | hp 100(사용자)·노란색 |
| 합류 이후 브금(“청소부가 동료가 된 이후부터 RKQUblO-iCs” → 정정 “아니다 그냥 다음 맵부터 나게 해줘”, “다음 맵으로 갔을 때 브금 다시 재생 ㄴㄴ”) | 컷신은 `wise_words` 를 그대로 두고, `storyBgm`: 합류 뒤 토리이 길 = `wise_words`, `jjajang_pines` 부터 = `my_castle_town`(`JJAJANG_AFTER_JOIN_MAPS`); 같은 이름은 `playBgm` 이 이어 튼다(재시작 없음) | `bgm/my_castle_town.mp3` 131초 루프 |
| 청소부 웃음(추가 지시 “호탕하게, 얼굴 올려서, 쥰희 웃음마냥, 거슨 웃음은 공식거”) | “껄껄” 두 줄 뒤 `{motion:'janitor', name:'laugh', sfx:'laugh_janitor'}` — 웃음 시트 `assets/sprites/janitor-laugh.png`(gpt-image), 소리 = 델타룬 거슨 웃음 클립 1.6초 | 1.1초 4프레임 |
| 실루엣은 지팡이를 짚고 천천히(추가 지시) | `janitor_shadow.png` right 행 = gpt-image 지팡이 걷기(검게), `move speed 44` | 걷기 60 보다 느림 |
| 인게임 전투는 허약 모습 | `BATTLE_SPRITES.janitor` = `assets/battle/janitor.png`(대기 4·공격 4)·`janitor-run.png`·`down/janitor.png` — 깃발 없는 허약 청소부. 깃발·댄스 시트(`assets/enemies/janitor-stance-*`, `janitor-dance.png`)는 ‘청소부(전투)’ 전용으로 남겨 둠 | |

QA: `jjajang_torii_event`(두 번째 토리이 직전) / `jjajang_torii_joined`(합류 뒤, 동료 청소부). 검사: `tests/unit/jjajang-torii.test.mjs`, `tests/playtest/jjajang-torii-janitor.mjs`.
