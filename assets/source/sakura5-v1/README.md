# 벚꽃 숲 5 자산 (BUILD271)

- `dohyun-ref.png`: 사용자가 붙인 도현 선화(252×614). `dohyun-raw.png`: gpt-image 4×4 걷기 시트(얇고 길쭉하게).
- `domijorim-ref.png`: 사용자가 붙인 도미조림 사진(1304×1476, 커밋하지 않음 — 얼굴 사진). `domijorim-raw.png`: gpt-image 4×4 걷기 시트.
- `gasuni4/5/6-raw.png`: 가순이 1/2/3 시트를 참조로 옷·머리만 바꾼 4×4 시트.
- `tree-raw.png`: 거대 벚꽃 나무(작은 벚꽃 나무 판을 참조).
- 목소리: `snd_txtal`(델타룬 알피스) → `voices/dohyun.mp3`(1.1배 높임, 사용자 “톤 살짝 올린”), `voices/janitor.mp3`(청소부 = 델타룬 4장 거슨 **말하는 소리** 클립, BUILD227) → `voices/domijorim.mp3`(1.35배 높여 젊게, 사용자 “거슨 목소리 느낌인데 많이 젊어 보이는 느낌으로 재구성”).
- `heumi-raw.wav`: 유튜브 waFEhwjUb3c “천하제일 요리대회”(가재맨) 1:14:05~1:14:25(커밋하지 않음). `sfx/domijorim_heumi.mp3` = 1:14:15.25 부터 1.7초(파형에서 1:14:15쯤 1.N초 발화 구간 — 청취 미확인).

## 추가 (같은 날 사용자 “도미조림은 얼린홍어를 등에 검 장착하듯 … 적군 전투 스프라이트 / 도현이는 그냥 손ㄷ 하나”)

- `domijorim-raw.png` 는 등에 얼린 홍어(검처럼 대각선 끈)를 멘 두 번째 생성(`domijorim-walk2.prompt.txt`). 홍어 없는 첫 시트는 `domijorim-v1-noskate-raw.png`(커밋하지 않음).
- `domijorim-battle-raw.png`(`domijorim-battle.prompt.txt`, 참조 = 걷기 시트 0.5배): 오른손에 꼬리 잡은 얼린 홍어, 왼손 횃불 → `assets/enemies/domijorim-battle.png`(138×149).
- `dohyun-battle-raw.png`(`dohyun-battle.prompt.txt`, 참조 = 걷기 시트): 빈손으로 한 손을 들어 인사하듯(사용자 정정 “걍 손하나 들고있다고 / 안녕하듯”) → `assets/enemies/dohyun-battle.png`(43×152). 손도끼로 잘못 읽은 첫 판은 `dohyun-battle-v1-axe-raw.png`(커밋하지 않음).
- 전투 데이터(체력·패턴)는 브리핑에 없어 `ENEMIES` 에 등록하지 않았다. 축소 배율 `export.py BATTLE_SCALE` 6.5.

## “흐미” 클립 정정 (사용자 “지금 흐미가 아니라 어머니 전라도이신분 이렇게 나오고”)

- 1:14:15.25 구간은 유튜브 자동자막·로컬 음성인식(faster-whisper small) 모두 “옆에 혹시 어머니 전라도 오신 분 / 혹시 통역 좀 가능하나요?” 로 확인 → 폐기.
- 1:13:50~1:14:40 전체를 인식해도 “흐미” 단어는 없음. 에너지 분석에서 우승 발표 “…도미조림입니다 / 축하드려요!”(1:13:47.7) 직후 1:13:48.4~1:13:51.7 에 자막 없는 큰 함성 구간이 있어, 그 시작 1.6초(1:13:48.35~)를 `sfx/domijorim_heumi.mp3` 후보로 잘랐다(`heumi-win.wav` = 1:13:44~1:13:56, 커밋하지 않음). **청취 미확인** — 틀리면 정확한 시:분:초를 받아 다시 자른다.
- (재정정) 사용자 “1:14:44쯤에 있잖아 / 흐미” → 1:14:40~1:14:50(`heumi-4444.wav`, 커밋하지 않음)을 받아 음성인식: 1:14:46.88 “흐미이이이이!” 확인. 그 앞 1:14:45.8~46.6 은 2188Hz 순음(방송 삐- 처리음)이라 제외하고 1:14:46.82 부터 1.05초를 `sfx/domijorim_heumi.mp3` 로 잘랐다(페이드아웃 0.25초, loudnorm -16).

## 2차 재생성 (BUILD272, 사용자 “다시 싹 재배치 … 스프라이트재생성도하고”)

- `tree2-raw.png`(`tree2.prompt.txt`): 수관 80%·밑동 짧은 거대 벚꽃 나무 → `assets/props/sakura_giant_tree.png` 768×762(0.75배, 색키). 밑동+뿌리 약 174px, 밑동 폭 127.
- `domijorim-chibi2-raw.png`(`domijorim-chibi2.prompt.txt`, 참조 = 최미스 시트+사진 합성): 2등신·사진 얼굴(넓은 볼·작은 눈 뜸·뾰족 입술)·황갈 피부·등에 홍어 → `domijorim-raw.png` 로 채택(1차 `domijorim-chibi-raw.png` 는 눈 감김·피부 연함, 커밋하지 않음). 시트 정면 키 88px.
- `dohyun2-raw.png`(`dohyun2.prompt.txt`): 선화 얼굴을 살린 걷기 시트 → `dohyun-raw.png` 로 채택, fit 0.74(키 20% 축소, 정면 키 78px).
- 자세 그리드(2×2, 참조 = 채택 시트 0.5배): `domijorim-heumi`(웅크림→두 팔 번쩍 외침→유지→복귀), `domijorim-leap`(웅크림→공중 홍어 뽑음→착지 횃불→전투 자세), `dohyun-wave`(손 들어 인사), `dohyun-leap`(웅크림→공중→착지 손 듦→자세). `poses_export.py` 가 128 칸 4프레임 띠(`assets/sprites/<name>-<motion>.png`, 발 [64,120])로 만든다 — 배율은 그리드의 서 있는 칸 키 = 걷기 키 × 보정(팔 든 자세 1.02~1.18)으로 네 칸 공통.
- 전투 그림 2차: `domijorim-battle2-raw.png`(2등신, 왼쪽 아래 3/4, 홍어+횃불) → `assets/enemies/domijorim-battle.png` 150×143, `dohyun-battle2-raw.png`(손 든 3/4) → `dohyun-battle.png` 50×149(def scale 0.72).
- 목소리 재조정: `voices/dohyun.mp3` = snd_txtal 1.1배 + lowpass 3.2kHz + 페이드(loudnorm 제거 — “지지직”), `voices/domijorim.mp3` = janitor 0.92배 + bass +7dB + lowpass 2.2kHz(“더 굵게 낮게”).
- (3차, 사용자 “44초에 소리라고”) 1:14:43.20 부터 1.25초로 재절단(음성인식이 ‘아워’로 적은 1:14:42.9~44.06 발성 구간 = 흐미~). 1:14:46.8 절단은 폐기.
- (4차, 사용자 “도트풍 퀄리티 기존 섭타룬 애들 참고 안 하나, 1등신으로”) `domijorim-chibi4-raw.png`(`domijorim-chibi4.prompt.txt`, 참조 = `domijorim-style-ref.png` — 형섭 런타임 시트(스타일·1등신 비율) + 사진(얼굴)): 형섭과 같은 도트 밀도·굵은 윤곽·1등신, 사진의 웨이브 머리·얼굴, 등에 얼린 홍어. `domijorim-raw.png` 로 채택, 자세·전투·전투 대기도 이 시트 참조로 재생성. 3차 시트는 `domijorim-v4-chibi3-raw.png`(커밋하지 않음). 모델은 전부 `openai/gpt-image-2.5-sunburst`(meta.json).
- (4차, 사용자 “45초쯤 소리라고”) 1:14:44.50 부터 1.2초로 재절단(1:14:44.55~45.6 발성 구간). 43.2 절단은 폐기.
- (5차, 사용자 “1등신이냐 저게?”) `domijorim-chibi5-raw.png`(`domijorim-chibi5.prompt.txt`, 참조 = `hero-sheet-ref.png` = 형섭 런타임 시트를 마젠타에 얹어 1024 로): “형섭 시트를 그대로 다시 그리되 얼굴·머리·옷·홍어만 바꿔라” — 머리 2/3·같은 픽셀 크기·같은 걷기 포즈·행 순서(down/up/left/right, `export.py RAW_ROWS_BY`). `domijorim-raw.png` 로 채택, 자세·전투·전투 대기 재생성. 4차 시트는 `domijorim-v5-chibi4-raw.png`(커밋하지 않음).
- (6차, 사용자 “[사진 #121] 얼굴 똑바로 똑같이 / 도트화만 하고”) `domijorim-face2-ref.png`(붙여넣은 사진, otty-paste 에서 복사) + 형섭 시트(작게) 합성 `domijorim-face2-composed.png` 를 참조로 `domijorim-chibi6-raw.png`(`domijorim-chibi6.prompt.txt`: “이 얼굴을 그대로 도트화”) → `domijorim-raw.png` 채택(fit 0.98 = 형섭과 같은 크기), 자세·전투·대기 재생성. 5차는 `domijorim-v6-chibi5-raw.png`(커밋하지 않음).
- (7차, 사용자 “그냥 사진 그대로에서 도트풍만 바꾸고 얼굴 기괴하게 박아두라니까 / 몸통은 있어도”) `domijorim-chibi7-raw.png`(`domijorim-chibi7.prompt.txt`, 참조 = `domijorim-face2-composed.png`): 사진 얼굴을 그대로 픽셀로 낮춘 머리(만화 재해석 금지) + 형섭식 작은 몸. `domijorim-raw.png` 로 채택. 자세(heumi·leap)·전투 그림(`domijorim-battle3.prompt.txt`)·전투 대기도 이 머리로 재생성. 6차는 `domijorim-v7-chibi6-raw.png`(커밋하지 않음).
- `sfx/kakao.mp3`: 카톡 말풍선 알림음(사용자 “똑똑똑 효과음은 왜 쓴 거야”) — `kakao-sounds.wav`(sAcHTjAH7Co “카카오톡 사운드 모음”, 커밋하지 않음) 7.50~8.30초, 목소리 구간으로 추정(청취 미확인).
