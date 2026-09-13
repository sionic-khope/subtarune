# 오디오 레퍼런스 (사용자 지정)

## 선장실 과거 기억 네 장면 (2026-09-13, BUILD131)

사용자 지정 [Empty Town — Toby Fox](https://www.youtube.com/watch?v=p8jCS2nSMmI&list=PLwjEXrvFo-2B7iCX61eOThc_oGihi84l9&index=11), 영상 ID `p8jCS2nSMmI`의 포맷251 오디오 전체를 `assets/audio/bgm/captain_memories.mp3`로 변환했다. yt-dlp 메타데이터에서 제목 `Empty Town`, 업로더/채널 `Toby Fox`, 업로드2018-11-17, 표시 길이83초를 확인했다. 출력은 **83.478271초,48kHz 스테레오,1,211,180바이트**, 전체 디코드 평균−17.0dBFS/peak−4.8dBFS다. 트리밍·속도·음높이·페이드·음량 변경 없이 전체 원본을 사용한다. 원본 WebM 컨테이너 길이는83.501초이며 MP3 패딩/코덱 차이 외 시간 편집은 없다.

통합 이름은 `captain_memories`다. 기존 `Sound.preloadBgm`/`playBgm`이 이름으로 MP3 경로를 직접 읽으므로 별도 BGM 등록 목록은 없다. 네 장의 기억 카드에서 같은 곡을 이어 쓰며 최초 시작은0초다. 파일 전체 디코드와 오디오 자산 단위 테스트6개를 통과했다. 주관적 청취 평가와 컷신의 실제 재생 연결 검증은 별도다. 원본 권리는 원 권리자에게 있으며 출처 확인은 별도 이용허락을 뜻하지 않는다.

- MP3 SHA256: `dc0f89fd8c6de6f5d70ed6a06808f73abc5c5476f843603385aa09810f1da770`
- 원본 WebM SHA256: `151da5d9011cf5baf6169c28aca5ab79b811104016f7b708707de63e4dedecef`
- 다운로드한 원본/메타데이터: 임시 `/tmp/subtarune-captain131-audio.nymhYO/`(배포에는 MP3만 포함).

```sh
python3 -m yt_dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-captain131-audio.nymhYO/captain-memories-source.%(ext)s' 'https://www.youtube.com/watch?v=p8jCS2nSMmI&list=PLwjEXrvFo-2B7iCX61eOThc_oGihi84l9&index=11'
ffmpeg -hide_banner -loglevel error -i /tmp/subtarune-captain131-audio.nymhYO/captain-memories-source.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/captain_memories.mp3
```

BUILD127 공격음 확정: 사용자 ‘기존사운드 활용해도됨’에 따라 분신은 `mankatsuki_clone`, 표창 묶음은 `whoosh`, 돼지 낙하는 기존 묵직한 지면 충격 `baron_slam`(0.7초), 팬 분사는 `rocket`, 주가 레이저 활성화는 공식 `snd_laz_c` 기반 `hit`를 재사용한다. 예고 종료/실제 공격 시작에 동작당1회이며 개별 탄마다 겹쳐 울리지 않는다. 파일 변경·새 합성은 없고 원본 출처는 아래 기록을 따른다.

## 만카츠키 전투 (2026-09-13, BUILD126)

사용자 지정 [THE WORLD REVOLVING — Toby Fox](https://www.youtube.com/watch?v=Z01Tsgwe2dQ), 영상ID `Z01Tsgwe2dQ`의 오디오 포맷251 전체를 `assets/audio/bgm/mankatsuki_battle.mp3`로 변환했다. yt-dlp 메타데이터 제목·업로더·2018-11-17 업로드·101초를 확인했다. 출력은 **101.052646초,48kHz 스테레오,2,520,140바이트**, 평균−13.3dBFS/peak0.0dBFS다. 잘라내기·속도·피치·페이드·음량 변경 없이 원본 전체를 사용하며 전투에서0초부터 재생한다.

분신 이동 `assets/audio/sfx/mankatsuki_clone.mp3`는 기존 DELTARUNE `snd_bomb` 가공본 `pop.mp3`의 첫0.36초(gain0.5,끝0.2초페이드)와 기존 합성 바람 `cannon_puff.mp3`0.28초(gain1.2)를 합친 짧은 연기 충격이다. **0.360000초,44.1kHz 모노,5,078바이트**, 평균−18.9dBFS/peak−4.1dBFS. 나루토 분신 연기의 짧은 ‘퐁’ 연출을 위한 기존 자산 조합이며 나루토 원본 녹음이나 음성은 사용하지 않았다. `loadSfxFiles`에 `mankatsuki_clone`을 등록하고 분신 출현/소멸 때 한 번 재생한다.

수리검은 기존 `whoosh`(1.6초,합성 공기음)를 부채꼴 발사 묶음마다 낮은 음량으로 한 번, 화염 공격은 기존 `rocket`(1.5초,노이즈 스웰·크래클·저음)을 분사 시작마다 한 번 재사용할 수 있다. 둘은 이미 등록되어 있고 파일 수정은 없다. 기존 소스의 상세 제작법은 아래 옵젝영역1·오프닝 효과음 기록을 따른다. 모든 신규 파일 전체 디코드/규격 검사를 통과했으며 실제 전투 재생 연결과 주관적 청취 평가는 별도다. 출처·체크섬·재현 명령은 `assets/source/mankatsuki126/audio/README.md`에 보관한다.

## 선장실 컴퓨터 공개·만카츠키 (2026-09-13, BUILD125)

사용자 지정 두 영상의 ID·제목·업로더를 yt-dlp 메타데이터로 확인하고 포맷251 오디오 전체를 받았다. `captain_reveal`은 [ANOTHER HIM — Toby Fox](https://www.youtube.com/watch?v=XEdoMoV4D6k), `captain_mankatsuki`는 [I'm Very Bad — Toby Fox](https://www.youtube.com/watch?v=_km4FuXOCbs)다. 둘 다2018-11-17 업로드 메타데이터이며 표시 길이는48초/14초다. 전체를 `ffmpeg -i <source.webm> -map_metadata -1 -c:a libmp3lame -q:a 2 <output.mp3>`로 변환했다. 잘라내기·피치·속도·페이드·음량 변경 없이0초부터 재생한다.

| 통합 이름 / 경로 | 디코드 길이·규격 | 평균 / peak |
|---|---|---|
| `captain_reveal` / `assets/audio/bgm/captain_reveal.mp3` |48.000000초,48kHz 스테레오,1,061,996바이트|−17.7 / 0.0dBFS|
| `captain_mankatsuki` / `assets/audio/bgm/captain_mankatsuki.mp3` |13.714292초,48kHz 스테레오,273,932바이트|−22.4 / −5.5dBFS|
| `captain_thunder` / `assets/audio/sfx/captain_thunder.mp3` |1.772018초,44.1kHz 모노|−20.8 / −5.3dBFS|
| `captain_transform` / `assets/audio/sfx/captain_transform.mp3` |3.000000초,44.1kHz 스테레오|−22.0 / −4.2dBFS|

천둥 충격은 DELTARUNE [snd_punchheavythunder](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_punchheavythunder/snd_punchheavythunder), 변신은 같은 리비전의 룰스 등장 효과음 [snd_rurus_appear](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_rurus_appear/snd_rurus_appear.ogg)를 전체 길이·원래 높이/속도/게인으로 MP3 변환했다. 게임 원본 샘플 보관 저장소이며 배급사 공식 다운로드 페이지는 아니다. 원본은 `assets/source/captain125/audio/`에 보존한다. `snd_punchheavythunder`는 기존 대포 발사 원본 `snd_chargeshot_fire`와 바이트가 동일하지만 이번 파일에는 대포용 음높이·잔향·시간 가공을 적용하지 않았다. SFX 두 이름을 로더에 등록하여 해당 장면 시작에서 한 번 재생한다. 날아가는 형섭의 몸 충격에는 기존 `baron_slam`을 재사용한다(위 바론 육중한 공격 출처). 파티 검 타격음은 사용하지 않는다.

검은 그림자 목소리 `assets/audio/voices/gajaeman_shadow.mp3`는 기존 `hyungsub.mp3`의 바이트 그대로 복사본이다. 기존 사용자 지정 [가재맨 ‘넌 나가라’](https://www.youtube.com/watch?v=gKmv51EG5co)11.36초의0.26초 게임 블립을 재사용하며 새 대사나 실존인물 음성을 합성하지 않는다. 기존 형섭의rate0.92보다 살짝 낮은 `VOICES.gajaeman_shadow.rate:0.86`, `level:0.72`, `cut:true`, `minGap:0.07`로 연결한다. 원본 파일 peak0dBFS는 보존하고 런타임 레벨로 낮춘다.

모든 새 실행 파일 ffprobe 규격·길이 확인과 ffmpeg 전체 디코드 검사를 통과했다. 실제 게임 재생 연결 검증·주관적 청취 평가는 이 파일 검증과 구분한다. 체크섬·재현 명령은 `assets/source/captain125/audio/README.md`에 기록한다.

## 강퇴폐기창고 인물·쇼·전투 (2026-09-13, BUILD119)

지정한 두 영상의 전체 음원을 사용한다. `bgm/storage_show.mp3`는 [Queen — Toby Fox](https://www.youtube.com/watch?v=6XQv5CHmITA)(56.749896초), `bgm/storage_battle.mp3`는 [Cyber Battle (Solo) — Toby Fox](https://www.youtube.com/watch?v=10yw5Q0mPPw)(107.52초)다. `yt-dlp --no-playlist -f '251/bestaudio' --write-info-json`으로 영상 ID/제목/업로더를 확인하고 오디오 전용 원본을 받았다. `ffmpeg -i <source.webm> -map_metadata -1 -c:a libmp3lame -q:a 2 <output.mp3>`로 전체를 변환했으며 잘라내기·피치·속도·페이드·음량 변경은 없다. 전투곡은 기존 전투 규칙대로0초·페이드인 없이 시작한다. 박수는 기존 `maillard_applause`를 재사용한다.

사용자 “굵은 목소리…라디오…테나…직접 써서 톤조정”에 따라 `voices/expelled_viewer.mp3`는 실제 DELTARUNE 테나 대화 블립 `snd_tv_voice_short_0@3-1.15.wav`의 짧은 게임 샘플이다. [출처 고정 리비전](https://github.com/PastelPigeon/drda_generator/blob/8af83474dfbdc1dcc5e74ba294841f3b47a67a15/assets/character_sounds/tenna/snd_tv_voice_short_0%403-1.15.wav)은 배급사 공식 다운로드가 아닌 게임 음원 보관본이다. 원본0.115986초를0.86배 높이/속도로 낮춰0.134875초로 만들고140~2800Hz의 약한 라디오 대역 제한, 시작4ms/끝20ms 페이드, 음량0.65배만 적용했다. 별도 잡음·대사 합성·사람 목소리 복제는 없다.

재현 필터는 `asetrate=37926,aresample=44100,highpass=f=140,lowpass=f=2800,afade=t=in:d=0.004,afade=t=out:st=0.115:d=0.020,volume=0.65`이며 모노44.1kHz·libmp3lame quality2로 저장한다. `VOICES.expelled_viewer`는 `rate:1, level:0.8, cut:false, minGap:0.15`로 전체 샘플이 끝난 뒤 다음 블립을 시작한다. 기존 `Object.keys(VOICES)` 로더가 읽으므로 별도main 로드 목록은 필요 없다. 세 파일 ffprobe/ffmpeg 전체 디코드, 블립 평균-17.2dBFS·최대-5.2dBFS를 확인했다. 청취 도구가 없어 주관적 음색 평가 완료로 기록하지 않는다. 자세한 메타데이터·해시·권리는 `assets/audio/storage-credits.json`에 둔다.

## 상점 구매음 (2026-09-13, BUILD118)

사용자 “산다…언더테일이나 델타룬 공식사운드랑 똑같이” 요청으로 구매 성공에 `shop_buy.mp3`를 사용한다. 원본은 UNDERTALE `snd_buyitem.wav`: [보관 저장소 고정 리비전](https://github.com/znm2500/Undertale-Engine-Ultra/blob/a0d77e3c57ef8c15aa12597893dec28d174021ae/sounds/snd_buyitem/snd_buyitem.wav). 배급사 공식 다운로드가 아닌 게임 음원 보관본이다. 잘라내기·합성·피치 변경 없이 `ffmpeg -i snd_buyitem.wav -codec:a libmp3lame -q:a 2 shop_buy.mp3`로 변환했다(약0.646초). `src/main.js loadSfxFiles` 등록, `Shop._feedback`의 구매 성공만 재생. 판매는 기존 `item`, 실패는 `cancel` 유지.

## 마이야르호 라운지 NPC 목소리 (2026-09-13)

사용자가 새로 만들도록 요청한 야꿀벌·마뱀이·박원숭은 실제 사람 녹음이나 음성 모델을 사용하지 않은 원본 비언어 캐릭터 블립이다. 생성기 `tools/audio/lounge_npc_voices.mjs`는 14개 사인 배음에 두 공명 대역을 입히고 음높이 변화·떨림을 더한다. 각 샘플은 6ms 어택·25ms 릴리스이며 44.1kHz 모노 PCM을 ffmpeg/libmp3lame quality 2로 변환한다. 재현은 `node tools/audio/lounge_npc_voices.mjs`.

| 화자 / 파일 | 음색 설계 | 실제 길이 / 평균·피크(dBFS) |
|---|---|---|
| 야꿀벌 `voices/yakulbeol.mp3` | 425Hz에서 살짝 올라가는 밝은 높은 소리, 115Hz 약한 진폭 변조로 벌의 윙윙 느낌 | 0.17초 / -20.4·-11.7 |
| 마뱀이 `voices/mabaem.mp3` | 175Hz에서 살짝 내려가는 둥글고 엉뚱한 만화 발성, 470/1050Hz 공명. 특정 사람 모사 없음 | 0.18초 / -21.4·-10.9 |
| 박원숭 `voices/parkwonsung.mp3` | 310→510Hz의 짧게 치솟는 ‘우끼’ 느낌, 620/2300Hz 공명 | 0.16초 / -19.1·-11.9 |
| 예림 `voices/yerim.mp3` | 아래 사용자 지정 영상 마지막 발화의 짧은 모음. 새 대사 합성이나 목소리 복제 없음 | 0.13초 / -19.8·-9.3 |

예림 출처는 사용자 지정 [롯데 16실점 정병 ON!](https://www.youtube.com/shorts/HvPi7NAC7RE), 영상 ID `HvPi7NAC7RE`, 업로더 **김예림**. yt-dlp 메타데이터 길이는 40초, 받은 포맷251 오디오의 길이는 39.66초다. BUILD118에서 사용자 “목소리가 살짝 이상하다” 피드백에 따라 같은 원본의 **38.32~38.45초**로 교체했다. 마지막 발화 중 모음에 해당하는0.13초이며 시작6ms·끝22ms 페이드, 음량0.85배, 모노44.1kHz 변환만 적용했다. 음높이·속도 변경은 없다. 영상34~39.5초의 프레임에서 아바타의 발화를 확인했고 로컬 Whisper가 검출한 마지막38.18~38.50초 음절 안에서 골랐다. 자동 전사는 정확한 전체 대사 인용에 쓰지 않았다. 같은0.13초 분석 창의 정규화 자기상관 최고값은 이전3.40초0.565→새38.32초0.760으로, 새 구간의 주기적 발성이 더 뚜렷하다(16kHz 모노,160~450Hz 지연 탐색). 이는 청취나 완전한 음원 분리의 증거는 아니다. 원본의 야구 중계 배경음은 별도 분리하지 않았다. 이 환경은 오디오 입력 청취를 지원하지 않아 주관적 음색 청취 완료로 기록하지 않는다.

이전 BUILD117 샘플은3.40~3.58초0.18초였으나 재생 시0.12초로 자르고 최소간격0.08초마다 앞 블립을 다시 끊었다. BUILD118은 원본 모음0.13초 전체를 재생(`cut:false`)하고 최소간격0.14초를 둬 샘플이 끝난 뒤 다음 블립이 시작되게 했다. `rate:1`은 유지하고 재생level은0.80→0.75로 낮췄다. 기존 샘플은 배경음/짧은 어택이 섞인 구간이고 반복 중 잘렸다는 관찰에 근거한 수정이며, 사용자 피드백의 유일한 원인이었다고 단정하지 않는다.

```sh
python3 -m yt_dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-npcs117-audio.cQoJSF/yerim-source.%(ext)s' 'https://www.youtube.com/shorts/HvPi7NAC7RE'
ffmpeg -hide_banner -loglevel error -ss 38.32 -i /tmp/subtarune-npcs117-audio.cQoJSF/yerim-source.webm -t 0.13 -ac 1 -ar 44100 -af 'afade=t=in:d=0.006,afade=t=out:st=0.108:d=0.022,volume=0.85' -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/voices/yerim.mp3
```

`VOICES`에 `yakulbeol`, `mabaem`, `parkwonsung`, `yerim`을 등록했다. 기존 `Object.keys(VOICES)` 로더로 파일을 받아 재생한다. 합성3종은 rate1·cut0.12초·최소간격0.08초(박원숭0.09초)·level0.85를 유지한다. 예림의 최신 값은 위 BUILD118 기록을 따른다. 네 파일 ffprobe 길이·포맷과 ffmpeg 전체 디코드/비무음/무클리핑, 오디오 자산 단위 테스트5개를 확인했다. 예림 외 사용자 지정 음원은 변경하지 않았다. 예림 원본 녹음 권리는 원 권리자에게 있으며 출처 확인이 별도 이용허락을 뜻하지 않는다. 전체 원본과 확인용 영상은 임시 폴더에만 두고 배포 자산에는 예림0.13초 결과만 포함한다.

## 마이야르호 선내 라운지 (2026-09-12)

사용자 지정 [영상 -hxMwv7iksk](https://www.youtube.com/watch?v=-hxMwv7iksk&list=PLKXdyINOQYsbqGQp08A83PtAWNBrY1FXP&index=25)의 yt-dlp 메타데이터 제목은 **25. Thousand Cafe Zukan (DELTARUNE Chapter 5 Soundtrack) - Toby Fox**, 업로더는 **Toby Fox**, 영상 길이는 89초다. `--no-playlist`로 지정 영상의 오디오 포맷 251만 받아 전체를 libmp3lame quality 2로 변환했다. `assets/audio/bgm/maillard_lounge.mp3`는 **89.327167초, 48kHz 스테레오, 1,897,772바이트**, SHA256 `12aaa7e4f01167853e929756b6b826991cd3a8866d4aff61448c5def7ff9e739`이며, 트리밍·페이드·음량·음높이·속도 변경 없이 0초부터 전체 파일을 반복 재생하는 용도다. ffprobe 규격·길이와 ffmpeg 전체 디코드 검사를 통과했고 평균 -18.7dBFS / peak -0.7dBFS를 확인했다. 파일 검증이며 사람의 청취 평가나 게임 안 재생 확인과 구분한다. 출처·변환·검증 기록은 배포용 `assets/audio/maillard-lounge-credits.json`에 보관한다. 원본 권리는 원 권리자에게 있으며 메타데이터는 이용허락을 뜻하지 않는다. 임시 오디오·메타데이터 폴더 `/tmp/subtarune-lounge113-audio.4tXlqs`는 결과 이동 후 제거했고 전체 영상은 다운로드하지 않았다.

재현: `python3 -m yt_dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 --ffmpeg-location /opt/homebrew/bin --output 'assets/audio/bgm/maillard_lounge.%(ext)s' 'https://www.youtube.com/watch?v=-hxMwv7iksk'`.

## 마이야르호 카트·노을 (2026-09-12)

- 사용자 지정 [영상 _Q6S2XgQJ8c](https://www.youtube.com/watch?v=_Q6S2XgQJ8c), 메타데이터 제목 **19. Sunset of Seven Suns (DELTARUNE Chapter 5 Soundtrack) - Toby Fox**, 업로더 Toby Fox. 메타데이터 확인은 별도 이용허락을 뜻하지 않는다.
- `assets/audio/bgm/maillard_sunrise.mp3`: 전체96.002917초,48kHz stereo,2,449,196바이트. YouTube251→libmp3lame quality2; 트리밍·페이드·음높이·속도·음량 변경 없음. SHA256 `8612424d417439d2ccdf774cdd6b328c5f01d599daf81c118221bb1740421112`.
- 카트 출발에서0초부터 재생, 실제 재생시각14초에 해 상승 시작. 전체 파일을 재생하며 MP3 구간 잘라재생 방식은 사용하지 않는다. decode검사 통과; 사람의 주관적 청취 평가와 구분한다. 배포용 출처는 `assets/audio/maillard-credits.json`에도 기록했다.
- 재현: `yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 --output 'assets/audio/bgm/maillard_sunrise.%(ext)s' 'https://www.youtube.com/watch?v=_Q6S2XgQJ8c'`.

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

### 바론 전투 BGM (2026-09-12)

- 사용자 지정 원본: https://www.youtube.com/watch?v=B8Us0DZgexw — **30. Black Knife (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox**, 업로더 Toby Fox. yt-dlp 메타데이터에서 ID `B8Us0DZgexw`·제목·122초를 확인했다. 재생목록의 다른 곡은 받지 않았다(`--no-playlist`).
- 파일: `assets/audio/bgm/baron_battle.mp3`, 통합 이름 `baron_battle`. YouTube 오디오 포맷 251을 ffmpeg/libmp3lame 품질 2로 MP3 변환. **48kHz 스테레오, 121.928초, 2,909,612바이트**.
- 음악 시작부터 끝까지 그대로 변환했으며 트리밍·음높이/속도/음량 변경·합성 대체 없음. MP3 변환에 따른 손실 압축만 있다. ffprobe 규격·길이 확인과 ffmpeg 전체 디코드가 오류 없이 완료됐다.
- 이 파일은 전투용이다. 기존 등장 컷신용 `baron_intro.mp3`(The Chase)는 변경하지 않았다.

### 악질맨 레그레이즈 음악 큐 (BUILD120, 2026-09-13)

- 사용자 지정 [원본 영상](https://www.youtube.com/watch?v=Ybq68oZwFAk): **(복원)MC형섭-유미시티**, 업로더 **누당근**, 게시2026-01-10. yt-dlp로 영상 ID·제목·업로더·89초 원본 메타데이터를 확인했다.
- **51.000~58.000초만 정확히 추출**했다. `assets/audio/sfx/storage_legraise.wav`: **7.000000초, 48kHz 스테레오, PCM16, 336,000샘플 프레임**. 음높이·속도·원본 게인을 그대로 두었고 페이드·정규화·루프·대체음은 없다. 압축 원본을 디코딩한 뒤 WAV로 저장했다.
- WebAudio로 전체 파일을0초부터 한 번 재생하고 카메라도 같은 AudioContext 재생 시계를 사용한다. 기존 Queen은 `pauseBgm(0)`/`resumeBgm(0)`으로 위치를 유지한다. Esc 등 장면 취소는 재생 중인 소스를 정지해야 한다. 기존 `Sound.sfx` 복제 Audio는 취소 핸들이 없으므로 이 정밀 큐에는 사용하지 않는다.
- 카메라 박자는 실제 파형에서 측정했다. 분석용 모노12kHz·180Hz 저역통과본의10ms RMS에서30ms 양의 에너지 증가를 추출했다. 강한 규칙적 킥 시작은 **클립3.50,3.95,4.43,4.89,5.34,5.80,6.27,6.73초**(원본54.50~57.73초), 약0.46초 간격이다. 첫3.5초는 상대적으로 약하고 불규칙한 변화이므로 이 템포를 전구간으로 추정하지 않는다. 분석 필터는 배포 WAV에 적용하지 않았다.
- 전체 디코드·길이·샘플 수 통과, 평균−15.1dBFS/peak−0.7dBFS. 실제 청취 평가를 했다고 주장하지 않는다. 출처·체크섬·측정법은 배포용 `assets/audio/storage-legraise-credits.json`에 함께 둔다. 원본 저작권은 권리자에게 있으며 공개 영상이라는 사실이 별도 이용 허락을 의미하지는 않는다.

```sh
yt-dlp --no-playlist -f '251/bestaudio' --write-info-json -o '/tmp/storage120-audio-source.%(ext)s' 'https://www.youtube.com/watch?v=Ybq68oZwFAk'
ffmpeg -i /tmp/storage120-audio-source.webm -af 'atrim=start=51:end=58,asetpts=PTS-STARTPTS' -ar 48000 -ac 2 -c:a pcm_s16le assets/audio/sfx/storage_legraise.wav
```

### 바론 대포 브레스·방어 피드백 (BUILD98, 2026-09-12)

사용자 "막을때 효과음", "브레스 쏴질때도 소리" 요청. 새 파일만 추가하며 기존 음악·충전·발사·충돌음은 유지한다.

- 방어 성공 `cannon_guard_block.mp3`: [Deltarune snd_metalhit](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_metalhit/snd_metalhit), 게임 디컴파일 자료(공식 배포처 아님). 원본 `assets/source/cannon-feedback-v1/audio/snd_metalhit.wav`, SHA256 `4bee3b1f7c08d10fc54f7f72a7f60f64e73d1e6a4df56826aa0ad5bb1aeaaaf4`. 첫0.28초, gain1.1, 끝0.12초 감쇠.
- 브레스 분사 `cannon_guard_breath.mp3`: 기존 합성 `whoosh.mp3`의 첫0.65초와 기존 `baron_roar.mp3`(위 출처)의0.15~0.8초를 합친 별도0.65초 가공본. 매 브레스 예고 종료/실제 발사 때1회. 방어 성공 때만 타격음1회. 런타임 seek/루프 없음.
- 두 파일은44.1kHz 모노 MP3, 전체 디코드 및 비무음·무클리핑 확인. 사람의 음색 청취 평가와는 구분한다.

```sh
ffmpeg -i assets/source/cannon-feedback-v1/audio/snd_metalhit.wav -af 'atrim=duration=0.28,asetpts=PTS-STARTPTS,volume=1.1,afade=t=out:st=0.16:d=0.12' -ar 44100 -ac 1 -codec:a libmp3lame -q:a 2 assets/audio/sfx/cannon_guard_block.mp3
ffmpeg -i assets/audio/sfx/whoosh.mp3 -i assets/audio/sfx/baron_roar.mp3 -filter_complex '[0:a]atrim=duration=0.65,asetpts=PTS-STARTPTS,volume=0.8[a];[1:a]atrim=start=0.15:duration=0.65,asetpts=PTS-STARTPTS,lowpass=f=1200,volume=0.75[b];[a][b]amix=inputs=2:normalize=0,alimiter=limit=0.75:level=false,afade=t=in:st=0:d=0.015,afade=t=out:st=0.4:d=0.25[out]' -map '[out]' -ar 44100 -ac 1 -codec:a libmp3lame -q:a 2 assets/audio/sfx/cannon_guard_breath.mp3
```

### 바론 대포 방어 기믹 충전·발사 (2026-09-12)

사용자 요청: "델타룬 차징 이펙트", 3초 충전 뒤 웅장한 약 3초 발사음. 새 합성음이나 파티원 검 소리 대신 아래 **Deltarune charge-shot 샘플의 가공본**을 사용한다. 원본 권리는 원 제작자에게 있으며, 아래 저장소는 공식 배포처가 아닌 게임 디컴파일 자료다. 사용자가 직접 지정한 기존 BGM·SFX는 변경하지 않았다.

- 고정 출처 커밋: `TeamBlossomDevs/DeltaruneDecomp_beta`의 `154f9a97b8f18fa6974e917c4c4e774bde6b7eba` (chapter2).
- 충전 원본: [snd_chargeshot_charge](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_chargeshot_charge/snd_chargeshot_charge), 1.309320초. 원본 보관 `assets/source/cannon-guard-v1/audio/snd_chargeshot_charge.wav`, SHA256 `bbbe8f9183877d5bf99bdd2fdf54bc1ccd9e3ccb1e7e71cb25c3b144aa535c04`.
- 발사 원본: [snd_chargeshot_fire](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_chargeshot_fire/snd_chargeshot_fire), 1.772018초. 원본 보관 `assets/source/cannon-guard-v1/audio/snd_chargeshot_fire.wav`, SHA256 `59acdd7fdb558333a25be9cb50fdac490c5b6b2e1f99a9f8ce7cb1079c90c7e6`.

| 통합 이름 / 파일 | 가공 | 검증 |
|---|---|---|
| `cannon_guard_charge` / `assets/audio/sfx/cannon_guard_charge.mp3` | 음높이를 유지한 시간 확장(`atempo=0.5,atempo=0.86`), 3초로 자르기, gain 1.3, 처음 40ms·끝 30ms 페이드 | 44.1kHz 모노, **3.000초**, 평균 -15.9dBFS, peak -4.6dBFS |
| `cannon_guard_fire` / `assets/audio/sfx/cannon_guard_fire.mp3` | 원본을 0.75배 속도·음높이로 낮춰 무게를 주고 240/510ms 잔향 추가, gain 1.8·limiter 0.85, 3초 길이·끝 350ms 페이드 | 44.1kHz 모노, **3.000초**, 평균 -18.9dBFS, peak -2.8dBFS |

재현: 아래 명령을 저장소 루트에서 실행한다. 두 출력은 전체 파일을 한 번 재생하며, MP3 `currentTime` 구간 재생이나 런타임 루프를 사용하지 않는다. `loadSfxFiles`에 두 이름 등록 후 충전 시작과 발사 시작에서 각각 한 번 재생한다.

```sh
ffmpeg -i assets/source/cannon-guard-v1/audio/snd_chargeshot_charge.wav -af 'atempo=0.5,atempo=0.86,apad,atrim=duration=3,volume=1.3,afade=t=in:st=0:d=0.04,afade=t=out:st=2.97:d=0.03' -ar 44100 -ac 1 -codec:a libmp3lame -q:a 2 assets/audio/sfx/cannon_guard_charge.mp3
ffmpeg -i assets/source/cannon-guard-v1/audio/snd_chargeshot_fire.wav -af 'asetrate=33075,aresample=44100,aecho=0.9:0.8:240|510:0.32|0.18,volume=1.8,alimiter=limit=0.85:level=false,apad,atrim=duration=3,afade=t=out:st=2.65:d=0.35' -ar 44100 -ac 1 -codec:a libmp3lame -q:a 2 assets/audio/sfx/cannon_guard_fire.mp3
```

검증 범위: ffprobe 길이, ffmpeg 전체 디코드·volumedetect, 3초 파형 시각 확인(충전은 연속, 발사는 첫 타격 뒤 잔향 감쇠). 청취로 음색을 검증했다고 주장하지 않는다. 기존 바론 포효·돌출·타격 파일과 오발 대포 소리는 그대로 둔다.

### 바론 바다 추격전 BGM (2026-09-12)

- 사용자 지정 원본: https://www.youtube.com/watch?v=QvoQVCBqegU — **Rakuichi Buster**, 업로더 **Toby Fox**. 기존 yt-dlp로 영상 ID `QvoQVCBqegU`·제목·110초 메타데이터를 확인했다.
- 파일: `assets/audio/bgm/baron_sea_battle.mp3`, 통합 이름 `baron_sea_battle`. YouTube 오디오 포맷 251 전체를 ffmpeg/libmp3lame 품질 2로 MP3 변환했다. **48kHz 스테레오, 109.714292초, 2,788,892바이트**.
- 시작부터 끝까지 보존하고 트리밍·페이드·음량·음높이·속도 변경을 하지 않았다. 첫 박을 유지하도록 런타임에서도 0초부터 즉시 재생한다. 압축 변환 외 음악 내용은 가공하지 않았다.
- 검증: ffprobe 규격·길이 확인 및 ffmpeg 전체 디코드 성공, 평균 -14.8dBFS / peak 0.0dBFS. 이는 파일 디코드 검증이며 사람의 청취 평가나 게임 안 재생 확인을 뜻하지 않는다.

```sh
yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 --ffmpeg-location /opt/homebrew/bin --output 'assets/audio/bgm/baron_sea_battle.%(ext)s' 'https://www.youtube.com/watch?v=QvoQVCBqegU'
```

### 마이야르호 등장·관객 박수 (2026-09-12)

- 갑판 위믹스 `wemix_remix`(BUILD111): 사용자 지정 [True Damage 에코 스킬 대사 #shorts](https://www.youtube.com/shorts/uLWnUnSWbGU), 리아리토,2021-12-30. 원본 자막 `리믹스!` 구간30.720~32.800초만 추출해 다음 `리플레이!`를 제외했다. MP3/44.1kHz/stereo/2.08초, 시작10ms·끝80ms페이드 외 음높이·속도·게인 변경 없음. ffprobe/전체디코드 통과; 직접 청취 기능은 제공되지 않아 청취했다고 주장하지 않는다. 출처는 배포용 `assets/audio/deck-npcs-credits.json`, 상세 `assets/source/deck-npcs-v1/audio-provenance.md`.

- 승선 물 끌어올림 `maillard_water_lift` (BUILD104): 아래 Alexander / Orange Free Sounds의 CC BY-NC 4.0 물 충돌 원본 중0.45~2.8초를 역재생하고0.85배 템포·페이드로 물이 차오르는2.742698초 소리를 만들었다. 원본 충돌음/사용자 선택곡은 그대로 보존한다. `sfx/maillard_water_lift.mp3`, `assets/audio/maillard-credits.json`에 출처·변경사항을 함께 기록한다. "... 어" 뒤 흰 페이드 시작에서 한 번 재생한다. 재현: `ffmpeg -i assets/audio/sfx/maillard_splash.mp3 -af 'atrim=start=0.45:end=2.8,areverse,atempo=0.85,afade=t=in:st=0:d=1.35,afade=t=out:st=2.3:d=0.45,alimiter=limit=0.85' -c:a libmp3lame -q:a 2 assets/audio/sfx/maillard_water_lift.mp3`.

- 등장곡 `maillard_reveal`: 사용자 지정 [Rouxls Kaard — Toby Fox](https://www.youtube.com/watch?v=yfC8OU2YtNo), 영상 ID `yfC8OU2YtNo`. yt-dlp에서 제목·업로더·19초 메타데이터 확인 후 오디오 포맷 251 전체를 MP3 품질 2로 변환했다. `assets/audio/bgm/maillard_reveal.mp3`: **19.009917초, 48kHz 스테레오, 489,068바이트**. 트리밍·페이드·음높이·속도·음량 변경 없음. BGM은 파일 이름으로 자동 연결되며 전환 전에 `preloadBgm('maillard_reveal')`, 등장 시 `fadeIn:0`으로 첫 박부터 재생한다.
- 거대한 물 충돌 `maillard_splash`: Alexander / Orange Free Sounds, [Large Water Splash With Heavy Surface Impact – Realistic Splash Sound Effect](https://orangefreesounds.com/large-water-splash-with-heavy-surface-impact-realistic-splash-sound-effect/), [원본 MP3](https://orangefreesounds.com/wp-content/uploads/2026/02/Large-water-splash-with-heavy-surface-impact-realistic-splash-sound-effect.mp3). [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)로 제공되며 이 프로젝트의 비수익 팬게임 용도에 사용한다. `assets/audio/sfx/maillard_splash.mp3`: **8.254667초, 44.1kHz 스테레오, 198,112바이트**. 다운로드한 파일 그대로 보존했다. 첫 0.144초는 -35dBFS 이하이며 이후 수면 충돌·물 잔향이 이어진다. 기존 뗏목용 `splash`(0.87초 합성 첨벙)는 별도 유지한다.
- 관객 박수 `maillard_applause`: Alexander / Orange Free Sounds, [Large Crowd Applause Sound Effect](https://orangefreesounds.com/large-crowd-applause-sound-effect/), [원본 MP3](https://www.orangefreesounds.com/wp-content/uploads/2016/11/Large-crowd-applause-sound-effect.mp3). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). `assets/audio/sfx/maillard_applause.mp3`: **9.116688초, 44.1kHz 스테레오, 145,867바이트**. 다운로드한 파일 그대로 보존했다. 첫 박수는 약 0.20초부터 시작하고 초반 0.55초에 걸쳐 밀도가 올라간다. 웃음은 기존 사용자 지정 `laugh_junhee`를 재사용한다.
- 두 SFX를 `src/main.js`의 `loadSfxFiles`에 등록했다. 전체 파일을 한 번 재생하며 런타임 구간 루프나 새 합성 대체음을 추가하지 않는다. 이 출처·저작자·라이선스 기록은 배포되는 프로젝트와 함께 유지한다.
- 파일 검증: 세 파일의 ffprobe 규격·길이 확인 및 ffmpeg 전체 디코드 성공. 평균/peak: 등장곡 -14.0/-1.3dBFS, 물 충돌 -21.2/-0.1dBFS, 박수 -22.7/-1.0dBFS. 파일 검증이며 실제 게임 청취 평가는 별도다.

```sh
yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 --ffmpeg-location /opt/homebrew/bin --output 'assets/audio/bgm/maillard_reveal.%(ext)s' 'https://www.youtube.com/watch?v=yfC8OU2YtNo'
```
# 영클 전함 습격 (2026-09-13)

BUILD137 사용자 ‘철다리 하면 캥 캥 하고 울리는’ 피드백: 이전136의 저음 킥/짧은 둔탁한 소리는 반려됐다. 같은 생성기/파일명으로 저역을 제거하고571/887/1321/1837/2473/3299/4217Hz의 비정수배 공명과 미세한 분리 진동, 밝은 접촉 잡음으로 재제작했다. 소스0.62초, 두 번째 피치+2.3%, 끝90ms 페이드. 디코드 피크−2.12/−1.65dBFS, 클리핑0. 0.45~0.55초 잔향RMS−35.84/−37.41dBFS이며 재생 볼륨0.35는 유지한다. 실제6걸음/초 혼합도 피크−10.35dBFS로 포화하지 않는다. 외부 녹음/음성 없이 만든 효과음이고 주관적 청취 판정을 자동 측정으로 대신하지 않는다.

BUILD136 추가 사용자 ‘철갑판 걷는발소리 생성’ 요청: `tools/audio/iron_steps.mjs`에서 외부 샘플 없이 낮은 발뒤꿈치 충격, 짧은 고역 접촉음, 460/713/1127/1631Hz 감쇠 금속 공명을 합성했다. `iron_step_1.mp3`와 약8% 낮은2번을 실제 철판 보행에서 번갈아 재생한다. 각 원본 신호0.23초, mono44100Hz, 시작1.5ms/끝30ms 페이드, 전체 파일 재생이다. 물걸음 원본 루프·나무바닥은 변경하지 않는다. 합성 효과음이며 실제 철갑판 녹음이라고 주장하지 않는다.

BUILD138 후속 ‘너무 하이톤…발소리같지않다’: 같은 오리지널 합성 생성기를 낮은 발뒤꿈치/밑창 접촉과223/359/587/941/1399Hz의 짧은 공명으로 조정했다. 길이0.38초, 높은 지속음을 줄이고150ms 이후 꼬리 에너지는0.18~0.22%로 낮췄다. 두 파일의 음량은 비슷하게 유지하며 게임volume0.35/접촉 간격/물·나무 발소리는 바꾸지 않는다. 만카츠키는 패턴 호출에만volume0.72를 전달하며 원본 공용 파일이나 피격 에코를 수정하지 않는다.

사용자 지정 [The Chase · Toby Fox](https://www.youtube.com/watch?v=hWWVWfQW1H4)를 `assets/audio/bgm/youngcle_assault.mp3`로 사용한다. `yt-dlp --no-playlist -f bestaudio -x --audio-format mp3 --audio-quality 3`으로 받은 전체33.882375초를 자르거나 피치 변경하지 않고 반복 재생한다. 용준이 선장실로 올라와 경고하는 시점에 시작하고, 바다 전함 공개·선장실 복귀·문 공사·오른쪽 갑판까지 같은 재생을 유지한다. 새 합성 대체곡은 쓰지 않는다. 생성 이미지와 함께 `assets/source/youngcle134/`에 출처를 연결한다.

# 만카츠키 피격 목소리 (2026-09-13)

사용자 ‘특유의 쥰희 목소리 어두운버전으로 에코음…맞았을때’ 요청. 기존 `assets/audio/voices/junhee.mp3`(위 기록의 Deltarune 수지 snd_txtsus)를 원본 그대로 낮춰 가공한 `assets/audio/sfx/mankatsuki_hurt.mp3`, mono44100Hz/0.392902초. BUILD130 ‘기본 공격사운드도 같이’, ‘특유사운드 더 커야해’에 따라 기본 hit/damage를 유지하며 별도로 한 번 겹쳐 재생하고, 음성 게인을0.8→1.6(+6dB)로 올렸다. 필터는 `asetrate=33075,aresample=44100,aecho=0.8:0.8:110|220:0.35|0.18,volume=1.6,afade=t=out:st=0.29:d=0.09`. 다른 캐릭터 음성이나 원본을 교체하지 않는다. 실제 양수 피해당 한 번이며 주관적 청취 평가는 별도다.

# 김은별컴퍼니 여성 게임 블립 (2026-09-13)

사용자 ‘바보같은 목소리로…여자’ 요청. macOS 기본 한국어 여성 TTS Yuna로 ‘냐’ 한 음절을 `say -v Yuna -r 160`으로 생성했다. 실존 인물이나 사용자 제공 영상의 음성을 복제하지 않는다. 원본은 `assets/source/captain122/voice/yuna-nya.aiff`(22050Hz), 실행 파일은 `assets/audio/voices/eunbyeol.mp3`다. 첫 무음을 -38dB 기준으로 제거한 뒤1.12배 피치,44100Hz,0.17초,시작8ms/끝35ms 페이드,볼륨0.8로 가공했다. VOICES.eunbyeol은 rate1/level0.85/cut:false/minGap0.12로 전체 짧은 샘플을 재생한다. 밝고 둥글게 튀는 여성 블립 의도이며 말 전체를 읽는 TTS는 아니다. ffmpeg 디코드/peak -7.6dBFS 확인, 실제 대화의 AudioBuffer 로드·재생 연결을 확인했다. 주관적 목소리 인상은 사용자의 청취 피드백으로 조정한다.

# 영클 TV 음성·전원 효과음 (BUILD139, 2026-09-13)

- 사용자 지정 [Deltarune Voices SFX](https://www.youtube.com/watch?v=4wSPkpzSQQE), 업로더 Bailey,2022-05-21,메타데이터61초. 지정한38초의 영상 프레임에는 `QUEEN`이 표시된다. 실제 사람의 새 대사나 복제 음성이 아니라 영상에 실린 게임 음성 샘플이다.
- `assets/audio/voices/youngcle.mp3`: 원본 포맷251에서 **38.10~38.26초(0.16초)**를 추출했다.36~42초 스펙트럼과 무음 검출에서38.098초 부근 발성 시작을 확인했다. mono44100Hz, 시작5ms/끝25ms페이드 외 원본 음량·스펙트럼 가공은 없다. 재생 시 `VOICES.youngcle.rate=0.96`으로 약0.71반음만 낮춘다. `cut:false`, `minGap:0.17`, `level:1`이며 기존 `Object.keys(VOICES)` 로더로 파일을 받아 대사 블립으로 쓴다. 긴 MP3 안에서 `currentTime`으로 찾지 않는다. 전체 새 문장을 말하게 만들거나 음성을 학습하지 않는다.
- `assets/audio/sfx/youngcle_tv_on.mp3`: 외부 녹음 없이 ffmpeg로 만든 **0.78초** TV 전원음. 짧은 접점 클릭, 650~3600Hz로 제한한 낮은 잡음,210→506Hz로 올라가는 낮은 정현파를 합쳤다. 긴 고음 삐 소리를 넣지 않았다. `loadSfxFiles`에 등록하며 TV 켜짐 때 파일 전체를 한 번 재생한다. TV 꺼짐 소리나 BGM 파일은 추가하지 않았다.
- 검증: 두 파일 mono44100Hz 전체 디코드 통과. 디코드 표본7056/34398개(0.16/0.78초), 평균/peak 음량은 영클−23.7/−15.7dBFS, TV−27.5/−7.9dBFS. 클리핑 없음. 음성 소스 선택은 영상 라벨·파형에 근거하며 주관적 청취 완료로 기록하지 않는다. 전체 원본 영상/오디오는 `/tmp/subtarune-youngcle139-*`에만 두며 배포물에는 짧은 가공본만 포함한다. 원본 게임 음성과 영상 권리는 각 권리자에게 있다.
- SHA256: 영클 `a1611279df577d30cd94e4724fbc70523fbddcbe519421854919effdc74a05f1`, TV `30ac29325efffe6baa2bc99d7d02ead8a7856c108c8c00e77942fab5316f32c6`, 원본 webm `f2bc76d04e607b9d5d353868b4f0c3e6958e072653abcfe11ec35ae8f5d4111a`.

재현 명령(출력 파일이 없는 상태에서 실행):

```sh
uvx --from yt-dlp yt-dlp --no-playlist -f bestaudio --write-info-json --output '/tmp/subtarune-youngcle139-source.%(ext)s' 'https://www.youtube.com/watch?v=4wSPkpzSQQE'
ffmpeg -ss 38.10 -i /tmp/subtarune-youngcle139-source.webm -t 0.16 -ac 1 -ar 44100 -af 'afade=t=in:st=0:d=0.005,afade=t=out:st=0.135:d=0.025' -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/voices/youngcle.mp3
ffmpeg -f lavfi -i 'anoisesrc=color=brown:amplitude=0.45:duration=0.78:sample_rate=44100:seed=139' -f lavfi -i 'aevalsrc=0.075*sin(2*PI*(210*t+190*t*t))*sin(PI*t/0.78)^2:s=44100:d=0.78' -filter_complex '[0:a]asplit=2[c][s];[c]atrim=duration=0.045,highpass=f=180,lowpass=f=2400,afade=t=out:st=0.005:d=0.04,volume=2.4,apad=whole_dur=0.78[click];[s]highpass=f=650,lowpass=f=3600,volume=0.9,afade=t=in:st=0.07:d=0.06,afade=t=out:st=0.22:d=0.56[static];[click][static][1:a]amix=inputs=3:normalize=0,afade=t=in:st=0:d=0.001,afade=t=out:st=0.69:d=0.09,alimiter=limit=0.7:level=false[out]' -map '[out]' -t 0.78 -ac 1 -ar 44100 -c:a libmp3lame -q:a 2 assets/audio/sfx/youngcle_tv_on.mp3
```
