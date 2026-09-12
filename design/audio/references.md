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
- 캐릭터 목소리 `junhee.mp3`: 2026-09-10 사용자 "귀아파" → 합성 콧소리(피크 0dB, 톱니파)를 **델타룬 수지 목소리 `library/sfx/snd_txtsus`** 로 교체(rate 0.92·level 0.85). 옛 콧소리는 `voices/junhee_snort.mp3` 보관. 다른 후보: `snd_txtral`(랄세이, 부드러움) `snd_txtnoe`(노엘) `snd_txtund`(언다인) `snd_dadtxt`.
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
| **박용준** 대사 음색 ('어?') | https://www.youtube.com/shorts/LWx1CyyfvvI | `voices/yongjun.mp3` | **적용됨** 2026-09-11 — 영상 시작 직후의 '어?'(사용자: 0초 바로): 원본 0.34s 부터 0.32s(첫 버스트 0.36~0.64s). 라우드니스 -14 LUFS 정규화 |
| **형섭** 대사 음색 (인트로 맵, 가재맨 톤) | https://www.youtube.com/watch?v=gKmv51EG5co ('넌 나가라') | `voices/hyungsub.mp3` | **적용됨** — 11.36s 의 '넌'(가장 크고 높은 외침, f0≈276Hz) 0.26s, 재생은 어택 0.14s. 다른 '넌' 을 원하면 원본 초 위치만 바꿔 다시 자름 |
| 낙석 맵부터(void5~) 브금 — Scarlet Forest | https://www.youtube.com/watch?v=h2B5F8skpGE | `bgm/scarlet.mp3` | **적용됨** (void5/6/7/8 `bgm`, 문 열림 컷신 `{bgm:'scarlet'}` 0.45) |
| 거대 나무 맵(void11~) 브금 — Lancer (Deltarune) | https://www.youtube.com/watch?v=GAhBQH0Kf1I | `bgm/lancer.mp3` | **적용됨** (void11 `bgm`+`bgmFlag`, 컷신 쥰희 첫 대사 `{bgm:'lancer'}` 0.5, void12). yt-dlp 는 `~/Library/Python/3.x/bin/yt-dlp`(pip --user) 2026-09-10 |
| 청록숲1 브금 — Weird Birds (Deltarune) | https://www.youtube.com/watch?v=YPLn6R2T5Qw | `bgm/weird_birds.mp3` | **적용됨** (teal1 `bgm`) 2026-09-10 |
| 청록숲2~ 브금 — Field of Hopes and Dreams (Deltarune) | https://www.youtube.com/watch?v=ymNgfwgh1TU | `bgm/hopes.mp3` | **적용됨** (teal2·teal3·teal_east `bgm`) 2026-09-10 |
| **전투 시작 징글** (Deltarune Battle Start) | https://www.youtube.com/watch?v=oBn36gfddPQ (사용자 지정) | `sfx/battle_start.mp3` | **적용됨** 2026-09-10 (엔진 리포의 `snd_battleenter` 로 바꿨다가 사용자가 '효과음이 왜 바뀌었냐' → 유튜브판으로 되돌림. 그 파일은 `battleenter_dr.mp3`, 그 전 파일은 `battle_start_prev.mp3` 보관) |
| **전투 공식 효과음** — 베기 `snd_laz_c` / 타격 `snd_damage` / 소울 피격 `snd_hurt1` / 격파 `snd_vaporized` / 승리 **언더테일 `snd_victor`('You Win!' 유튜브 CQjPLr95ZVQ, 사용자 2026-09-10 "이게 아니야, 다른 언더테일 승리 효과음" → 델타룬 `snd_won` 은 `won_dr.mp3` 보관)** (+ `snd_menumove`·`snd_select`·`snd_screenshake`·`snd_defeatrun`·`snd_power`·`snd_hit` 보관) | 위 리포 + fachinformatiker/undertale(vaporized) | `sfx/hit.mp3`, `damage.mp3`, `hurt.mp3`, `vaporized.mp3`, `won.mp3` | **적용됨** 2026-09-10 (사용자 "델타룬 공식 사운드와 똑같은 것") |
| **일반 전투 브금(청록숲)** — Rude Buster (Deltarune) | https://www.youtube.com/watch?v=GPL5Hkl11IQ | `bgm/rude_buster.mp3` | **적용됨** 2026-09-10 (`{battle:{bgm:'rude_buster'}}`) |
- `sfx/jump.mp3` — 델타룬 점프음. 출처 YouTube 8gg5RoLri7Y (0.22~1.32s 구간, 끝 0.2s 페이드). 뗏목 점프뿐 아니라 앞으로 점프 연출 공용. 2026-09-10
| **청록숲9 사이렌 브금**(레드 "침입자 발생" 부터 전투 직전까지) — Rumpus Music, Mario & Luigi: Bowser's Inside Story | https://www.youtube.com/watch?v=Us_1Ky2X-qA (사용자 지정, 재생목록 7번) | `bgm/alarm.mp3` | **적용됨** 2026-09-11 (앞 무음만 잘라냄, `teal9_boss.js`) |
| **청록숲9 보스전 브금**(레드·블루) — Boss: Tough Guy Alert!, Mario & Luigi: Bowser's Inside Story | https://www.youtube.com/watch?v=DW6ECP1doRk (사용자 지정, 재생목록 19번) | `bgm/boss.mp3` | **적용됨** 2026-09-11 (`{battle:{bgm:'boss'}}`) |
| 사이렌 효과음(레드 몸에서 위잉위잉) | 합성(ffmpeg aevalsrc 760Hz 위상변조 1.7Hz, 2.6s) | `sfx/siren.mp3` | **적용됨** 2026-09-11 |
| **물걸음 사운드**(얕은 물 위를 걸을 때 — 옵젝영역) | https://www.youtube.com/watch?v=1jZCrBnRm88 (Deltarune sound effects: walking, 사용자 지정 2026-09-12) — 원본은 걸음이 0.07~0.27초 간격(초당 6번)으로 이어져 울림이 계속 깔리는 소리다. 걸음마다 파일을 따로 트는 방식(잘라 붙이기 3종·렌더링)은 게임 걸음 간격(0.4~0.8초)에서는 전부 "끊긴다" → **물 위를 걷는 동안 영상 구간(걸음 2~31, 4.8초)을 그대로 이어 튼다**: 이음매만 30ms 크로스페이드한 끊김 없는 루프 wav 를 WebAudio 표본 단위 루프로 재생(아무 걸음 직전에서 시작), 멈추면 **시각표의 다음 걸음 8ms 앞에서 끊고** 울림 꼬리 wav(원본 잔향 스펙트럼의 색 입힌 잡음, 걸음 직전 바닥 레벨 -34.7dBFS 에서 -43dB/s 로 -72dBFS 까지 0.9초)를 이어 붙인다 — 마지막 걸음의 에코가 자연스럽게 꺼진다. wav 인 이유: mp3 는 디코더 지연으로 루프 지점·시각표가 20ms 이상 어긋난다. 생성기 `tools/audio/water_steps.py --src <원본 wav>`(루프·꼬리·`src/data/footsteps.js` 시각표를 한 번에). 세기: 루프 피크 -1.5dBFS, 재생 volume 0.75 | `sfx/water_walk_loop.wav`(4.9초) + `sfx/water_walk_tail.wav`(0.9초) + `src/data/footsteps.js WATER_WALK`(생성 파일: 루프 구간·시각표 22개) | **적용됨** 2026-09-12. 걷는 동안 루프, 멈추면 다음 걸음 앞에서 끊고 꼬리(`Sound.walk`). 폐기된 시도: 합성 2종 · splash 자른 것 · 4걸음만 · 한 파일 구간 재생(브라우저가 `currentTime` 무시) · 잔향 없이 다음 걸음 직전에서 끊은 것("끊기는 느낌") · 마지막 걸음 잔향에서 잰 -109dB/s 로 0.4초만 이어 붙인 것("아직 끊기는 기분" — 원본은 걸음 사이 잔향 바닥이 -43dB 로 두 배 넘게 느리게 꺼진다) · 잔향 알갱이를 -43dB/s 로 1.2초 이어 붙인 것 · 걸음마다 첫 찰싹 ⊛ 방 IR 렌더링(원본과 2dB 안이었지만 걸음 간격 자체가 달라 "끊김"은 그대로 → 루프로 교체) |
| 옵젝영역0 브금 — 허공 바람 재사용(사용자 "청록숲0 처럼 휘잉") | (위 `bgm/wind.mp3`) | `obj0.json bgm` | **적용됨** 2026-09-11 |
| **옵젝영역1 연출 브금**(쥰희·용준 대포 밀기 → 만남, "다 닥쳐!!!" 에서 off) — Vs. Lancer (Deltarune) | https://www.youtube.com/watch?v=Ce-gU8G6Vik (사용자 지정, 재생목록 21번) | `bgm/vs_lancer.mp3` | **적용됨** 2026-09-11 (앞 무음만 잘라냄, `obj1_cannon.js`; 정적 개그 구간은 `{bgmPause}`/`{bgmResume}` 로 재생 위치 유지) |
| 대포 밀기 드륵 / 두구두구두구 / 빰빠밤 | 합성(ffmpeg: scrape = 밴드패스 노이즈 두 알갱이 + 72Hz 0.55s / drumroll = 55ms 간격 노이즈 스네어 크레셴도 1.7s / fanfare = C5·E5·G5 배음 3음 + 화음 1.9s) | `sfx/scrape.mp3`, `sfx/drumroll.mp3`, `sfx/fanfare.mp3` | **적용됨** 2026-09-11 (`obj1_cannon.js`) |
| 대포 발사 이벤트: 불씨 타닥(C 연타마다) / 화르르륵(로켓) / 쿠구구궁(3초 뒤) | 합성(ffmpeg: ember = 1.8k 하이패스 노이즈 60ms + 2.4kHz 틱 / rocket = 노이즈 스웰 + 2.5k 크래클 + 55Hz 요동 저음 1.5s / boom = 42→30Hz 사인 + 저역 노이즈 + 에코 2.0s) | `sfx/ember.mp3`, `sfx/rocket.mp3`, `sfx/boom.mp3` | **적용됨** 2026-09-11 (`obj1_cannon.js obj1_push`; 연타 중 브금 Rude Buster, 발사 중 브금 없음) |
| **동상 벽 폭발**(청록숲2 — 미니언이 쥰희 동상 벽을 날려버릴 때) | https://www.youtube.com/watch?v=o84vJH19toI (deltarune explosion greenscreen, 사용자 지정 2026-09-12) — **같은 영상에서 소리와 그림을 같이** 뽑았다: 오디오 0.01~1.96s(앞뒤 짧은 페이드, +1.25배), 그림은 `tools/art/video_to_strip.py --key green` 으로 누끼 31프레임 | `sfx/explosion.mp3`, `assets/fx/explosion.png` | **적용됨** 2026-09-12 (`teal3_toolbox.js` — 전에 쓰던 `pop` 3연타는 폐기) |

## 바론 둥지 첫 만남 (2026-09-12)

| 용도 | 출처·제작 | 파일 / 통합 이름 | 길이·검증 |
|---|---|---|---|
| 바론이 솟아오를 때 BGM | 사용자 지정 https://www.youtube.com/watch?v=OX5iGh2pgxk — **7. The Chase (DELTARUNE Chapter 1 Soundtrack) - Toby Fox**, 업로더 Toby Fox. yt-dlp로 영상 ID·제목·38초 메타데이터 확인 후 원본 오디오 포맷 251 추출 | `assets/audio/bgm/baron_intro.mp3` / `baron_intro` | 48kHz 스테레오, **34.068초**. 원본 38.220초에서 33.941초 이후 -50dB 이하인 끝 무음만 제거(34.05초에서 MP3 프레임 단위 stream copy). 시작·음높이·음량·음악 내용 보존. 디코드 성공, peak 약 0dBFS |
| 용준이 처음 말할 때 BGM | 앞서 사용자가 고른 Vs. Lancer, https://www.youtube.com/watch?v=Ce-gU8G6Vik | 기존 `assets/audio/bgm/vs_lancer.mp3` / `vs_lancer` 재사용 | 기존 파일 변경 없음 |
| 바론 포효 모션에 겹치는 낮은 괴수음 | 새 합성 효과음: ffmpeg aevalsrc 105→44Hz 하강 기본음과 2·3배음, 29Hz 떨림 + 브라운 노이즈(seed 61, 90~1800Hz), 100ms 어택·850ms 감쇠·70ms 에코. 게임 원본 포효 복제나 합성 대사가 아님 | `assets/audio/sfx/baron_roar.mp3` / `baron_roar` | 44.1kHz 모노, **1.77초**, peak -6.0dBFS |
| 대포 발사 직전 에너지 충전 | 새 합성 효과음: ffmpeg aevalsrc 72→322Hz 상승 기본음·2배음, 11Hz 떨림 + 핑크 노이즈(seed 42, 300~3600Hz) 크레셴도. 기존 `rocket`은 발사음이라 충전 전용 파일을 분리 | `assets/audio/sfx/cannon_charge.mp3` / `cannon_charge` | 44.1kHz 모노, **1.60초**, peak -12.3dBFS. 충전 완료 뒤 작은 바람을 재생 |
| 충전 뒤 허무하게 나오는 작은 바람 | 새 합성 효과음: ffmpeg 핑크 노이즈(seed 23, amplitude 0.42), highpass 220Hz·lowpass 2600Hz, 8ms 어택·268ms 감쇠, volume 1.8 | `assets/audio/sfx/cannon_puff.mp3` / `cannon_puff` | 44.1kHz 모노, **0.28초**, peak -14.1dBFS. 충전보다 평균 4.6dB 작고 짧음 |

세 효과음은 ffmpeg 전체 디코드 및 volumedetect로 길이·비무음·클리핑 없음 확인. 권장 시작 음량은 포효 1.0, 충전 1.0, 바람 0.8이며 실제 컷신의 BGM·대사와 함께 최종 청취한다. 새 SFX 세 이름은 `loadSfxFiles` 목록에 등록해야 한다. 기존 사용자 지정 음원은 교체하지 않았다.

### 바론 등장·육중한 공격 전용 효과음 (2026-09-12)

사용자 지정: 바론 공격은 파티원·칼 공격 소리를 쓰지 않는다. 다음 두 소리는 기존 샘플을 재사용하지 않고 ffmpeg로 새로 합성했다.

| 용도 | 제작·출처 | 파일 / 통합 이름 | 검증 |
|---|---|---|---|
| 육중한 몸통 타격 | 110→42Hz로 빠르게 내려가는 감쇠 저음 + 112Hz 몸통 공명, 브라운 노이즈(seed 87, 45~700Hz) 지면 충격 + 핑크 노이즈(seed 88, 160~2100Hz) 232ms 공기 충격. 3ms 어택, 마지막 200ms 감쇠, limiter 0.76. 금속·칼 샘플 없음 | `assets/audio/sfx/baron_slam.mp3` / `baron_slam` | 44.1kHz 모노, **0.700초**, 평균 -15.5dBFS / peak -2.4dBFS |
| 보라 바람과 함께 한 번에 솟는 팡! | 105→36Hz 감쇠 저음 + 96Hz 충격 공명, 브라운 노이즈(seed 90, 35~650Hz) 지면 폭발 + 핑크 노이즈(seed 91, 240~3400Hz) 25ms 상승·960ms 감쇠 바람. 3ms 어택, limiter 0.78. 단일 충격이며 칼 샘플 없음 | `assets/audio/sfx/baron_eruption.mp3` / `baron_eruption` | 44.1kHz 모노, **1.050초**, 평균 -15.8dBFS / peak -2.2dBFS |

각 파일 전체를 한 번 디코드하여 비무음·클리핑 없음과 길이를 확인했다. 런타임은 두 이름을 SFX 로드 목록에 등록하고 공격/분출 시작 프레임에 각각 한 번 재생한다.
