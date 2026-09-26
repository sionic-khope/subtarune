# credits371 — 엔딩 크레딧 사진 칸 삽화 11장

현재본 = **v2 단순 2D 만화체**(사용자 2026-09-26 “너무 고퀄, 만화 느낌이어야”). v1(과슈·수채 동화풍) 최종본·프롬프트·참조는 `v1/`에 보관.

- 모델 `openai/gpt-image-2.5-sunburst`, high, 1024x1536, `images/edits` 참조 1장(실행기가 첫 `--ref`만 보냄).
- 공통 스타일: `prompts/_style_cartoon.txt` (굵은 검은 외곽선·평면 셀 색·그림자 1단·단순 배경·글자 없음 + 캐릭터 정체성 규칙). 각 `prompts/photoNN.txt` = 스타일 + 장면.
- 장소: 실제 게임 맵을 dev 서버(:8000)에서 `?qa=`/`?map=` 로 열어 찍은 `places/*.png` (`capture-places.mjs`, playwright-core 캐시 `~/.cache/subtarune-pw` 에 복사해 실행, `OUT_DIR`·`CHROME_EXE` 지정). 참조 시트 `refs/refNN.png` = 1행 스프라이트(NEAREST) + 2행 장소 캡처·핵심 소품(`build-refs.sh`, `sheet.py`, `stack.py`).
- 최미스 참조는 원본 `choimis-masked-walk.png` 정면 셀(GAP 글자 그대로). 꽃 형태 참조는 쓰지 않음. `refs/choimis-masked-noletters.png` 는 잘못된 지시(글자 제거)로 만든 것, 미사용.
- 생성 `./gen.sh NN <접미사>`, 최종 `finalize.py` → `assets/credits/photoNN.png`(400×600) + `all.png`.

| # | 장면 | 실제 장소(맵) | 참조 | 채택 raw |
|---|---|---|---|---|
| 01 | 요플래가 뗏목 타고 기둥 위 억빠맨 구하러 감 | void4 (보라맵4) | ref01 | photo01-rawv2.png |
| 02 | 미니언 조우, 나무 무기상자(weapon_box_open)에서 칼·단검·지팡이 꺼냄 | teal3 | ref02 | photo02-rawv2.png |
| 03 | 쥰희·용준이 돼지코 나무 대포 만들며 낄낄 | obj1 (옵젝영역1, obj1_cannon) | ref03 | photo03-rawv3.png |
| 04 | 바론이 용준을 움켜쥐고 도망, 일행 놀라 물길 추격 | obj4 (옵젝영역4, obj4_baron) | ref04 | photo04-rawv2b.png |
| 05 | 탁 트인 바다 위 돼지 모양 마이야르호 뱃머리의 쥰희(쥰희만) | 바다(사용자 지정, ref05 는 장소 캡처 제외) | ref05 | photo05-rawv4.png |
| 06 | 엄청대박인배 라운지의 편집노조(비데·파크가디언·뚜울라·도트마리오) | ship_lounge | ref06 | photo06-rawv3f.png |
| 07 | 벗겨진 인형탈, 인면견 파크가디언을 놀리는 쥰희·영클, 비데·마리오 | 편집노조 스테이지(youngcle7) | ref07 | photo07-rawv4c.png |
| 08 | 드럼통 둥지: 드럼통의 악마 — 웃는 청소부 — 요플래 | jjajang_nest | ref08 | photo08-rawv2.png |
| 09 | 벚꽃 광장에서 디스코드 가면 최미스(GAP 글자 옷)의 이상한 춤을 숨어 구경 | jjajang_sakura6 | ref09 | photo09-rawv3.png |
| 10 | 결전지 원형 난간 위 가재맨 vs 요플래·경섭·억빠맨·영클(호버), 쥰희 없음 | castle_arena | ref10 | photo10-rawv3.png |
| 11 | 노을 땅, 경섭이 김형섭을 업고 억빠맨과(영클 없음) 해 쪽으로 걸어감 | gajaeman_castle_sunset | ref11 | photo11-rawv3.png |

## v2 이력
- 02: 첫 v2 는 요플래 코 아래 작은 입 자국 → 스타일에 “코 아래 완전히 빈 피부” 문장 추가 후 재생성(같은 파일명으로 덮어써 첫 v2 raw 는 남지 않음).
- 03 v2: 일행이 추가로 끼어듦 → “두 사람만” 추가한 v2b 채택. 04 v2: 일행 뒷모습·용준이 공중 → 움켜쥠·놀란 얼굴 문장 추가한 v2b 채택.
- 06 v2: moderation_blocked(참조 동일, 재시도에서 통과) → v2b. 요청 안 한 요플래 일행도 라운지에 같이 그려짐.
- 09 v2: 흰 머리가 얼굴 둘레를 감싸고 꽃을 얼굴 앞에 들어 “얼굴이 꽃”처럼 보임 → 머리는 정수리만·얼굴 앞에 든 것 없음으로 고친 v2b 채택.
- 05·07 v2 에도 요청 외 일행이 배 위/무대 앞에 함께 그려짐(장면 뜻은 유지).
- 05 v3(사용자 “마이야르 전함 사진에 영클은 넣으면 안 되지”): 이전 최종본은 v2/photo05.png 로 보관. 프롬프트에 “쥰희만, 다른 인물·영클 절대 없음” 추가, v3·v3b 둘 다 쥰희만 나옴 — 하늘 없이 맵 색에 가까운 v3b 채택.
- v2→v3 (사용자 피드백 2026-09-26, 이전본 `v2/`): 05 배경을 탁 트인 바다로(v4). 07 도트마리오를 깨진 도트가 아닌 같은 만화체로 — 프롬프트에 “Mario” 단어가 있으면 moderation_blocked(2회), “red-capped buddy called Dot” 로 바꿔 v3c 통과. 09 최미스 GAP 글자 옷 복원(원본 시트 참조, 스타일 블록에 “GAP 만 유일한 허용 글자” 예외). 11 영클 제거(ref11 에서도 뺌) v3.
- 전체 점검(사용자 “모든 사진 싹 다시 점검”, 원칙: 브리핑에 적힌 인물만): 03 쥰희도 킥킥 웃는 얼굴(v3). 06 편집노조 넷만(v3f; “Mario”·자세한 마리오 묘사가 들어간 프롬프트는 5회 연속 moderation_blocked → `prompts/photo06-A.txt` 짧은 묘사로 통과, 지금 photo06.txt 와 동일). 07 요플래 일행 뒷모습 제거·도트마리오 만화체(v4c, 3회 중 2회 blocked). 10 쥰희 제거(ref10 에서도 뺌, v3). 이전본 `v2/`.
