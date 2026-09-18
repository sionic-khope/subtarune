# 검은 소나무 숲 공터 — 아짐키야 조우·전투 (BUILD227, 2026-09-18)

## 사용자 브리핑 (원문, 순서대로)

> 마지막 맵 가운데 풀숲 더 울창하게 만들고 가운데로 가면 브금꺼지고 연출시작
> [연출] ???: ~~.. 디짐 / 요플래 느낌표
>
> 청소부: 허허 이게 무슨소린가. [사진] 이후에 여런 애들 아짐키야1~4로 스프라이트 네개 만들어주고 딱 나오면서 가재맨 애미뒤짐 https://www.youtube.com/watch?v=mARppJip_hc 이영상에 한부분 짤라서 대사로 출력하고.
> 요플래: ..
> 그 뒤에 이 노래가 쭉 나오면서 맵 빙글빙글돌면서 춤추다가 그 아짐키야 4마리정도가 … 22초까지 가재맨애미뒤짐 저 노래 쭉 나오다가 전투로 들어가는거임
>
> 공격패턴은 가재맨애미뒤짐 텍스트를 원시부족들이 간소화한 도트로 피하는곳 아래에 네명이 춤추면서 그 텍스트를 아래에서 뿜어서 피하는 패턴과 가재맨애미뒤짐텍스트가 비처럼내리는거 그리고 쟤네들이 춤추는거 역동적으로 춰서 그거피하는패턴
> 전투브금은 짜장맵부터 https://www.youtube.com/watch?v=QvoQVCBqegU 이거야 일반몹전투브금
> 가재맨애미뒤짐 사운드 따서 상대방 적군 공격대사에도 넣어줘 가재맨ㅇㅁ뒤짐~, 땡개땡개~ ㅇㅁ뒤짐~
> 첫턴에 (요플래) 공격하기버튼 누르고 청소부턴으로 들어갈때 대사: 청소부: 뭐 뭐라고? 공격을 하라고? / 청소부: 껄껄 난 그런거 잘못한다네 (웃음 안 써도 됨) / 청소부: 이거라도 던져보겠네 허허 → 공격하기 고를 수 있게. 이번전투만 청소부 허약은 데미지 1짜리 공격인데 그냥 지팡이 던지는거임, 전투스프라이트도 다시. 아짐키야 네마리 각각 체력 8씩. 이기면 10원 획득

## 구현

| 원문 | 구현 | 값 |
|---|---|---|
| 풀숲 더 울창하게(정정 “겉에 있는 걸 울창하게, 가운데 공간은 놔둬야지”) | `tiles.js` `"` 타일: rng 풀잎 14~18개 두 겹·variants 3. 공터 둘레 한 칸만 풀숲, 가운데 6×6 은 비움 | |
| 가운데로 가면 브금 끔 → 연출 | 트리거 37~38열×10~11행(once, `pines_center_started`) → `pines_center` 컷신 `{bgm:null}` | |
| ???: ~~.. 디짐 → 느낌표 → 청소부 대사 | `{speaker:'???', voice:'mystery'}` → `{emote:'!'}` → 청소부 원문 | |
| 아짐키야 스프라이트(정정 “3마리로”) | gpt-image-2.5-sunburst 춤 시트(사진의 왼쪽 끝·가운데 후드·오른쪽 끝 세 사람을 씀, 4번 시트는 `assets/source/ajimkiya-v1` 에 보관) → 전투 `assets/enemies/ajimkiyaN-dance.png`(2×2 128 셀), 필드 `assets/props/ajimkiyaN-dance.png`(4×1 128 셀 anim) | |
| 딱 나오면서 “가재맨 애미뒤짐” + 영상 구간(정정 “사람 목소리를 인식하라고”, “점프 먼저 하고 나타난 뒤에 대사”) | 공터 위 두 귀퉁이·아래 가운데에 소품 셋(128px, 요플래의 약 2배)을 숨겨 만들고 → 0.14초 간격으로 보이며 점프(hop 60px) → 그 뒤 `sfx ajimkiya_line` = 음성 인식(whisper)으로 찾은 실제 가창 “가재맨 애미 뒤짐” 4.40~6.80초 + `{speaker:'아짐키야', voice:'none'}` | 인식 결과: 가재맨@4.48 애미@5.72 뒤짐@6.10 |
| 요플래: .. | `N('..')` | |
| 노래 쭉 + 춤 22초(정정 “화면이 도는 게 아니고 아짐키야 애들이 도는 거라고”, “전투 들어갈 때 이펙트·소리”) | `{bgm:'ajimkiya_song'}` → 셋이 제자리에서 회전(`Prop.spinRate 5`)하며 22초 춤(화면은 안 돈다) → `battleEntry`(표준 조우 소리·소용돌이·줌) → 전투. `worldSpin` DSL 은 남겨 두되 안 쓴다 | |
| 전투 | `{battle:{enemies:[아짐키야1~4], bgm:'jjajang_battle', flag:'pines_ajimkiya_won', memberDamage:{janitor:1}, memberIntro:{janitor:[3줄]}}}` | |
| 패턴 셋(정정 “너무 어렵잖아 일반몹이라고”) | `src/battle/ajimkiya-patterns.js`: `ajimkiya_spew`(상자 아래 흰 2톤 네 명이 춤추며 0.55초에 한 글자씩 느리게 위로 뿜음), `ajimkiya_rain`(글자 비 0.36초 간격·느림), `ajimkiya_dance`(1.5초에 한 명씩 느리게 가로지름). `soloPattern`: 말풍선을 띄운 한 명만 탄막 | 글자 = ‘가재맨애미뒤짐’ 한 자씩, 판정 반지름 5 |
| 일반몹 전투 브금(짜장맵부터) | `bgm/jjajang_battle.mp3` = QvoQVCBqegU “Rakuichi Buster”(Toby Fox); `Game.encounterBgm()`: jjajang 맵이면 이 곡 | |
| 공격 대사 + 사운드 | `lines.speak ['가재맨ㅇㅁ뒤짐~','땡개땡개~ ㅇㅁ뒤짐~']`, `voice:'none'`, `speakSfx:'ajimkiya_line'`(말풍선과 함께 재생) | |
| 첫 청소부 턴 대사 | `cfg.memberIntro.janitor` — 청소부 첫 차례에 3줄(C 로 넘김) 뒤 메뉴 | 웃음 없음 |
| 청소부 데미지 1·지팡이 던지기(정정 “달려가서가 아니라 제자리에서”) | `cfg.memberDamage.janitor = 1`, `characters.js janitor.attackMode 'throw'` → 새 공격 모드 `modes/throw.js`(제자리에서 공격 프레임 + 지팡이가 포물선으로 날아가 닿으면 피해). 전투 시트 지팡이판 | |
| 체력 8씩·10원 | `hp: 8`, money 4+3+3 = 10 (`STATE_FROM_FLAGS pines_ajimkiya_won`). 전투 배율 1.05, 셋은 위·아래 왼쪽 열·가운데 오른쪽 열로 엇갈림(정정 “캐릭터 크기 더 키워”) | 피해 5 는 미지정(잠정) |
| 청소부 체력 100(정정 “100으로 하라고 했잖아”) | `characters.js janitor.noHpBonus` — 앞서 얻은 파티 최대 HP 보너스(+60)를 청소부에겐 안 붙임 → 전투 표시 100 | |

QA `jjajang_pines_center`(공터 직전). 검사: `tests/unit/jjajang-pines-center.test.mjs`, `tests/playtest/jjajang-pines-center.mjs`.
