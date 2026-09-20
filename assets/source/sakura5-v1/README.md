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
