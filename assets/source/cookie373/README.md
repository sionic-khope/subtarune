# cookie373 — 엔딩 쿠키 기념 단체 사진

현재본 = **v2 단순 만화체**. v1(과슈풍, raw·프롬프트·참조·최종본)은 `group-raw*.png`, `v1/` 에 보관.

- 최종: `assets/credits/group_photo.png` (900×600, LANCZOS, optimize 735KB). 채택 raw: `group-v3-raw16.png` (v2 채택본 group-v2-raw2 와 이전 최종본은 `v2/`).
- 모델 `openai/gpt-image-2.5-sunburst`, high, 1536x1024, 참조 `ref.png`(refs/row1~3 세로 결합: 16명 스프라이트 + 실제 라운지 캡처 `credits371/places/lounge.png`·문·작별 장면 스크린샷). 최미스는 `refs/choimis-noletters.png`(기본 시트 정면, GAP 글자 칠함) — 가면 없이 보통 얼굴. 뚜울라는 참조 없이 글 묘사만.
- 프롬프트: `prompt.txt` = credits371 `_style_cartoon.txt`(가로 3:2) + 추가 인물 규칙 + 장면·17명 중복 금지.
- 이력: v2-raw1 은 17명·배치는 맞지만 요플래에 웃는 입 → 반려. v2-raw2 채택(17명 각 1회, 요플래 앞줄 가운데 브이·입 없음, 영클 왼쪽 끝 떨어져 섬).
- v3 (최미스 GAP 글자 복원): ref row2 를 원본 `choimis.png` 정면 셀로, 프롬프트에 GAP 허용 예외·도트마리오 만화체·경섭/은별 필수 문장. 16회 중 moderation_blocked 9회(GAP/마리오 관련으로 추정, 같은 입력도 통과·거부가 섞임). raw1 경섭 누락, raw6 17명 맞지만 도트마리오가 블록 도트(`prompt-v3-blockymario.txt`), raw8·9 은별 누락, raw15 요플래가 가운데에서 한 칸 왼쪽, raw16 채택(17명 각 1회, 요플래 앞줄 가운데 부근 브이·입 없음, 영클 왼쪽 끝, 최미스 GAP 옷·보통 얼굴).

## v4 — 난장판 단체샷(사용자 2026-09-26 “최미스 묶여서 구석, 청소부 숨어, 퀄리티, 가재맨, 자유 포즈, 캐릭터 추가”)
- 이전 최종본·프롬프트·참조 `v3/`. 현재본 = `group-v4-raw6.png` → `assets/credits/group_photo.png`(900×600, 268KB).
- 모델 `openai/gpt-image-2.5-sunburst`, quality high, 1536x1024 (각 `group-v4-raw*.meta.json` 에 기록).
- 참조 `ref4.png`(`refs4/r1~r5`): 34명 스프라이트(가재맨 정면·오라 비행 포함, 가순이 1~6·도현·도미조림·럭키가이·야꿀벌·마뱀이·박원숭·착검·위믹스·파랑이·노랑이 추가) + 라운지 캡처·문. 뚜울라는 참조 없이 글. 프롬프트 `prompt4.txt`.
- 8장 생성: raw1 럭키가이 중복·요플래 입, raw2 요플래 없음·도현 중복, raw3 도트마리오 없음·요플래 입, raw4 가순이 7명·요플래 입, raw5 억빠맨 중복, raw7·raw8 가순이 7명 → 반려. raw6 채택(각 1회, 요플래 가운데 브이·입 없음, 영클 왼쪽 끝, 최미스 밧줄 묶여 왼쪽 아래 구석·GAP, 청소부 오른쪽 콘솔 뒤 빼꼼, 가재맨 보라 오라로 팔짱 떠 있음).

- 최종 채택 px03(사용자 선택, BUILD381). 후보·설명은 candidates/README.md.
