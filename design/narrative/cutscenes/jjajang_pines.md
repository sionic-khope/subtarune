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
| 풀숲 더 울창하게 | `tiles.js` `"` 타일: rng 풀잎 14~18개 두 겹·variants 3, 공터 8×8 전체 풀숲(가운데 길도 덮임) | |
| 가운데로 가면 브금 끔 → 연출 | 트리거 37~38열×10~11행(once, `pines_center_started`) → `pines_center` 컷신 `{bgm:null}` | |
| ???: ~~.. 디짐 → 느낌표 → 청소부 대사 | `{speaker:'???', voice:'mystery'}` → `{emote:'!'}` → 청소부 원문 | |
| 아짐키야 1~4 스프라이트 | gpt-image-2.5-sunburst 춤 시트 4장(사진의 왼쪽 끝·가운데 후드·오른쪽 끝·오른쪽 둘째, `assets/source/ajimkiya-v1`) → 전투 `assets/enemies/ajimkiyaN-dance.png`(2×2 128 셀), 필드 `assets/props/ajimkiyaN-dance.png`(4×1 64 셀 anim) | |
| 딱 나오면서 “가재맨 애미뒤짐” + 영상 구간 | 공터 네 귀퉁이에 소품 넷 spawn → `sfx ajimkiya_line`(영상 0.0~2.6초, 잠정 구간) + `{speaker:'아짐키야', voice:'none'}` | 구간이 다르면 초만 알려 주면 다시 자름 |
| 요플래: .. | `N('..')` | |
| 노래 쭉 + 맵 빙글빙글 + 춤 22초 | `{bgm:'ajimkiya_song'}`(영상 전체 71초) → 새 DSL `{worldSpin:0.9}`(맵 전체가 화면 가운데 축으로 회전, `main.js`) → `{wait:22}` → `{worldSpin:0}` → 전투 | 춤은 소품 anim(6fps) |
| 전투 | `{battle:{enemies:[아짐키야1~4], bgm:'jjajang_battle', flag:'pines_ajimkiya_won', memberDamage:{janitor:1}, memberIntro:{janitor:[3줄]}}}` | |
| 패턴 셋 | `src/battle/ajimkiya-patterns.js`: `ajimkiya_spew`(상자 아래 흰 2톤 네 명이 춤추며 글자를 위로 뿜음), `ajimkiya_rain`(글자 비), `ajimkiya_dance`(흰 2톤 무용수가 상자 안을 출렁이며 가로지름, 몸에 닿으면 피해) | 글자 = ‘가재맨애미뒤짐’ 한 자씩 |
| 일반몹 전투 브금(짜장맵부터) | `bgm/jjajang_battle.mp3` = QvoQVCBqegU “Rakuichi Buster”(Toby Fox); `Game.encounterBgm()`: jjajang 맵이면 이 곡 | |
| 공격 대사 + 사운드 | `lines.speak ['가재맨ㅇㅁ뒤짐~','땡개땡개~ ㅇㅁ뒤짐~']`, `voice:'none'`, `speakSfx:'ajimkiya_line'`(말풍선과 함께 재생) | |
| 첫 청소부 턴 대사 | `cfg.memberIntro.janitor` — 청소부 첫 차례에 3줄(C 로 넘김) 뒤 메뉴 | 웃음 없음 |
| 청소부 데미지 1·지팡이 던지기 | `cfg.memberDamage.janitor = 1`, 전투 시트 지팡이판(대기·달리기·지팡이 던지기 공격) 재생성 | |
| 체력 8씩·10원 | `hp: 8`, money 4+2+2+2 = 10 (`STATE_FROM_FLAGS pines_ajimkiya_won`) | 피해 5 는 미지정(잠정) |

QA `jjajang_pines_center`(공터 직전). 검사: `tests/unit/jjajang-pines-center.test.mjs`, `tests/playtest/jjajang-pines-center.mjs`.
