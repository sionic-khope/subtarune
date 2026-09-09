# 오디오 레퍼런스 (사용자 지정)

비수익 팬게임 용도. 유튜브에서 받아(yt-dlp) 아래 경로에 넣었다. 원본 풀 클립은 커밋하지 않고 잘라낸 결과만 둔다.
- 효과음: `assets/audio/sfx/<이름>.mp3` 가 있으면 합성음 대신 파일 재생 (`loadSfxFiles`)
- **대사 글자 소리**: `assets/audio/voices/<voice>.mp3` — 블립 **한 샘플**만 넣으면 글자마다 0.1초로 잘라 재생. 톤다운은 `VOICES.<voice>.rate` (1보다 작으면 낮아짐) (`loadVoiceFiles`)

| 용도 | 레퍼런스 | 넣을 경로 | 상태 |
|---|---|---|---|
| 타이틀 로고 인트로 | https://www.youtube.com/watch?v=Bkd3lU4-y0M | `assets/audio/intro.mp3` | **적용됨**. 첫 '쾅' 2.1s 에 로고 박힘 (`title.js ZOOM_DURATION`) |
| 타이틀 대기 BGM (시작브금) | https://www.youtube.com/watch?v=p8jCS2nSMmI | `assets/audio/bgm/title.mp3` | **적용됨**. 로고 박힌 뒤 루프 |
| 오프닝 나레이션 BGM | https://www.youtube.com/watch?v=XEdoMoV4D6k | `assets/audio/bgm/opening.mp3` | **적용됨**. 나레이션 내내, 하얘질 때 페이드 |
| (이전 오프닝 후보) | https://www.youtube.com/watch?v=N-9A5952ZvM | `assets/audio/bgm/opening_prev.mp3` | 보관 |
| 방(우이동) BGM | https://www.youtube.com/watch?v=mANXrxS5SPg | `assets/audio/bgm/room.mp3` | **적용됨**. 방이 드러날 때부터 루프 |
| 흰색으로 감싸질 때 | https://www.youtube.com/watch?v=DiJcJiWiwyQ | `assets/audio/sfx/white.mp3` | **적용됨** |
| X(취소/뒤로가기) 효과음 | (언더테일 원본 `snd_squeak`) | `assets/audio/sfx/cancel.mp3` | 유튜브판(GPZni8sCraY)은 `cancel_yt.mp3` 보관, 사용자가 '공식 느낌 아님' |
| 전투 진입 사운드 | https://www.youtube.com/watch?v=u-f_zuHgxmM | `assets/audio/sfx/battle_start.mp3` | **파일 있음**, 전투 시스템 대기 |
| 전투 완료 사운드 | https://www.youtube.com/watch?v=J2ZZCJNX5YI | `assets/audio/sfx/battle_end.mp3` | **파일 있음** |
| 빠맨 대사 음색 (초반 '띠링'을 톤다운) | https://www.youtube.com/watch?v=4wSPkpzSQQE | `assets/audio/voices/ppaman.mp3` (0.1초 한 샘플) | **적용됨** (첫 띠링 0.17s). 톤다운 `rate 0.9` |
| **나레이션** 음색 (이름 없는 `* ~가 있다` 대사) | https://www.youtube.com/watch?v=-XAY6fHBTpI | `assets/audio/voices/narrator.mp3` (0.1초 한 샘플) | **적용됨** (첫 블립 0.12s) |
| **경섭** 대사 음색 (살짝 톤다운) | https://www.youtube.com/watch?v=SyrceIAQJf0 | `assets/audio/voices/gyeongsub.mp3` | **적용됨** (영상 첫 소리의 어택 0.150~0.300s). 원본은 1.2초 지속음이라 앞부분만 사용. `rate 0.9` 톤다운. 2026-09-09: 클립 앞 무음 62ms 를 잘라냄(무음 때문에 `cut` 길이 안에서 거의 안 들렸음) → 0.088s, `level 1.0` |
| **쥰희** 캐릭터 웃음소리 | https://www.youtube.com/watch?v=5z7ugBaZsp8 | `assets/audio/sfx/laugh_junhee.mp3` | **적용됨**. 테스트룸 쥰희 대사에서 재생 |

메모: 쥰희 = 웃음소리가 있는 캐릭터 (아직 스프라이트/대사 없음).


## 배경 그림
- `assets/maps/room.png`: 델타룬 실제 방(토리엘 집 2층, 팬위키 맵 이미지 크롭). 원본 `assets/source/deltarune_toriel_house_top.webp`. 비수익 팬게임 용도.
- 캐릭터 목소리 `junhee.mp3` 는 합성(꿀꿀 콧소리). 유튜브 레퍼런스 주시면 교체.
- 대화창 열림/닫힘 효과음은 **없음**(언더테일 동일). 글자 속도 기본 33ms.

## 언더테일/델타룬 원본 효과음 (GitHub 엔진 리포에서 수집 → `assets/library/sfx/`)
| 용도 | 원본 | 적용 경로 |
|---|---|---|
| **나레이션 텍스트음** (언더테일 기본 `snd_txt1`) | `library/sfx/snd_txt1.mp3` | `voices/narrator.mp3` (이전 유튜브판 `voices/narrator_yt.mp3` 보관) |
| 확인/상호작용 `snd_select` | `library/sfx/snd_select.mp3` | `sfx/confirm.mp3` |
| 커서 이동 `snd_squeak` | `library/sfx/snd_squeak.mp3` | `sfx/menu.mp3` |
| 문 `snd_dooropen` / 아이템 `snd_item` | | `sfx/door.mp3`, `sfx/item.mp3` |
| 보관 (미사용, 캐릭터 목소리 후보) | `snd_text`, `snd_txtsus/ral/noe/sans/tor/und`, `snd_dadtxt`, `snd_menumove`, `snd_wing`, `snd_bump`, `snd_save`, `snd_step1/2`, `snd_phone`, `snd_error`, `snd_coin`, `snd_locker`, `snd_knock`, `snd_equip`, `snd_cantselect`, `snd_shineselect`, `snd_doorclose` | `voices/<voice>.mp3` 로 복사하면 바로 적용 |
| 허공(void) 배경 — 잔잔한 바람 | (합성: 브라운 노이즈 lowpass 420 + 핑크 노이즈 bandpass 1400, 느린 트레몰로, 32s 루프) | `bgm/wind.mp3` | **적용됨** (`void.json bgm`, `pc_stream` 도착 시 0.28) |
| **형섭** 대사 음색 (인트로 맵, 가재맨 톤) | https://www.youtube.com/watch?v=gKmv51EG5co ('넌 나가라') | `voices/hyungsub.mp3` | **적용됨** — 11.36s 의 '넌'(가장 크고 높은 외침, f0≈276Hz) 0.26s, 재생은 어택 0.14s. 다른 '넌' 을 원하면 원본 초 위치만 바꿔 다시 자름 |
