# 오디오 레퍼런스 (사용자 지정)

## 침몰 기억·짜장숲 해변 (2026-09-18)

- `bgm/ship_sinking.mp3`: 사용자 지정 [P89rxnT7lKw](https://www.youtube.com/watch?v=P89rxnT7lKw), yt-dlp 조회 `Lost Girl`, 업로더 Toby Fox, 업로드20211004. 포맷251 전체를 MP3 q2로 변환(80.000000초, 48kHz stereo), 트리밍·속도·피치·음량 변경 없음.
- `bgm/jjajang_shore.mp3`: **Waves Sound Effect — Alexander / Orange Free Sounds**, [원본 페이지](https://orangefreesounds.com/waves-sound-effect/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 사용자 ‘파도만’ 요청에 맞춰 loopable 파도 효과음 원본 MP3 그대로 사용(83.252188초, 44.1kHz stereo), 새 멜로디·합성·편집 없음. 저자·제목·라이선스·변경 없음 표시를 배포 출처에 유지한다.
- 두 파일의 전체 디코드 검사 통과. 재현·체크섬·기존 물소리 재사용 판단은 `assets/source/ship-memory/audio/README.md`. 소스 검사와 게임 큐·청감 검증은 구분한다.

## 엄청대박인배 납치·성 출현 연출 (2026-09-18)

- `bgm/ship_castle.mp3`: 사용자 지정 [TBVteb9Z6ps](https://www.youtube.com/watch?v=TBVteb9Z6ps), 조회 제목 `38. BURNING EYES (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`, 업로더 표시명 Toby Fox, 업로드20250604. 포맷251 전체를 MP3 q2로 변환했다(69.334792초, 48kHz stereo, 1,649,084바이트). 구간 편집·피치·속도·음량·새 페이드 가공 없음. 전체 디코드 검사 통과; 재현 명령·SHA-256은 `assets/source/ship-castle/audio/README.md`. 출처 기록이 이용허락 확인을 뜻하지 않는다.

## 엄청대박인배 라운지 (2026-09-18)

- `bgm/ship_lounge.mp3`: 사용자 지정 [GrCp8AHdgEM](https://www.youtube.com/watch?v=GrCp8AHdgEM), 조회 제목 `14. Welcome to the Green Room (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`, 업로더 Toby Fox, 업로드 20250604. 포맷 251 전체를 MP3 q2로 변환했다(95.004458초, 48kHz stereo). 구간 편집·피치·속도 변경·음량 정규화 없음. 전체 디코드 검사 통과; 출처·재현 명령·SHA-256은 `assets/source/ship-lounge/audio/README.md`. 출처 기록이 이용허락 확인을 뜻하지 않는다.

## 파크가디언 마녀재판 반론 (BUILD156, 2026-09-14)

사용자 요청의 `それはおかしいよ！` 원음은 [마녀재판 컷인 보이스 게임 녹화](https://www.youtube.com/watch?v=eBt4Agp85HE&t=5s), 업로더 표시명 `マークGames`, 2025-11-15 영상의 **7.04–8.42초**다. 공식 채널/공식 허가 소재로 주장하지 않는다. 포맷251의5–11초 확인 구간만 받고, 일본어 자동자막·로컬 Whisper·파형으로 첫 반론 위치와 뒤 일반 대사 경계를 확인했다. 배포 파일 `sfx/park_trial_objection.mp3`는1.38초,48kHz stereo,29,732바이트, 평균−19.9dBFS/peak−3.8dBFS다. 시작8ms/끝25ms페이드·gain2배 외 피치/속도 변경은 없다. 원 녹화의 배경 음악/효과음 성분은分離하지 않았다. 전체 디코드/잘라낸 음성 자동전사를 확인했지만 사람의 청취 검수 완료로 기록하지 않는다. 정확한 명령·체크섬·확인 구간은 `assets/source/park156/audio/README.md`에 있다. 출처 기록은 이용허락 확인을 뜻하지 않는다.

유리 파괴 `sfx/park_trial_shatter.mp3`는 원작 녹음이 아닌 새 오리지널 합성이다.0.74초의 밝은 노이즈 충격·27개 비정수 배음 파편 접촉·1000Hz하이패스로 구성했으며 외부 샘플/목소리 모사가 없다.44.1kHz mono,12,641바이트, 평균−23.0dBFS/peak−5.2dBFS.500Hz저역통과 뒤 평균은−54.2dBFS로 저음 킥이 아닌 고역 중심 감쇠를 확인했다. `node assets/source/park156/audio/synthesize-shatter.mjs`로 재현하며 체크섬·구조는 같은 오디오 README에 있다. 반론 후 시각 유리 파괴 시점에1회 재생한다.

## 파크가디언 전투 (BUILD155, 2026-09-14)

사용자 지정 [tlFnfEWZCtQ](https://www.youtube.com/watch?v=tlFnfEWZCtQ)의 오디오 포맷251 전체를 `assets/audio/bgm/park_guardian.mp3`로 변환했다. yt-dlp 메타데이터 제목은 `32. Cutie Mew Mew Magic (DELTARUNE Chapter 5 Soundtrack) - Toby Fox & @Cametek.CamelliaOfficial`, 업로더/채널 표시명은 `Toby Fox`, 게시일은2026-06-24, 표시 길이는185초다. 이는 해당 영상의 표시 메타데이터 기록이며 공식 배포·권리관계의 별도 검증을 뜻하지 않는다. 다른 영상이나 대체곡은 사용하지 않았다.

MP3는 **184.682667초,48kHz 스테레오,4,208,444바이트**, SHA256 `5880e403139253ec56d4d7a60338f5d762e2c7008fb4df75bfdfa51a53aa5124`다. 전체 디코드 성공, 평균−17.0dBFS/peak−0.2dBFS. 잘라내기·음높이·속도·페이드·음량 변경 없이 libmp3lame quality2로 변환했다. `park_guardian` 이름은 기존 `src/core/audio.js`의 파일명 기반 `preloadBgm`/`playBgm`으로 로드되므로 새 로더 등록은 필요 없다. 전투 연결·실제 재생과 주관적 청취 검증은 자산 디코드 검사와 구분한다.

원본 WebM SHA256는 `b98902b3004c57c5446fadf48f7010e64e7987287d3a7086584d5cc25d96a71e`다. 다운로드 원본과 전체 메타데이터는 임시 `/tmp/subtarune-park155-audio.X01M7I/`에 보관하며 배포에는 MP3만 포함한다. 원본 권리는 해당 권리자에게 있으며 출처 기록이 이용허락을 뜻하지 않는다.

```sh
uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-park155-audio.X01M7I/source.%(ext)s' 'https://www.youtube.com/watch?v=tlFnfEWZCtQ'
ffmpeg -hide_banner -loglevel error -n -i /tmp/subtarune-park155-audio.X01M7I/source.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/park_guardian.mp3
```

## 영클 공장 구역 BGM (BUILD143, 2026-09-13)

사용자 지정 [A CYBER'S WORLD? — Toby Fox](https://www.youtube.com/watch?v=In3y0C7mQvA&list=PLjj7CATn1HfUetet9LgdabEk9GsH7R2tI&index=6)를 `assets/audio/bgm/youngcle_factory.mp3`로 준비했다. `--no-playlist`로 영상 ID `In3y0C7mQvA` 하나만 받았고, YouTube 메타데이터의 제목·Toby Fox 채널·업로드2021-10-04·표시166초를 확인했다. 포맷251 전체를 libmp3lame quality2로 변환했으며 트리밍·음높이·속도·음량·페이드 변경은 없다. 영클전함2/3/4의 공통 BGM 이름은 `youngcle_factory`다. 기존 `preloadBgm`/`playBgm`이 파일 이름으로 경로를 구성하므로 새 로더 등록은 필요 없다.

출력은 **166.153875초,48kHz 스테레오,4,057,004바이트**, SHA256 `ec322f815c9ea578efd0258631255d654799e9beb5b11233fe1c70a59e8b275a`. ffmpeg 전체 디코드 성공, 평균−13.7dBFS/peak0.0dBFS이며 원곡 음량을 임의 정규화하지 않았다. 오디오 자산 테스트6개 통과. 주관적 청취와 세 맵의 게임 내 전환 검증은 별도다. 원본 메타데이터는 DELTARUNE Chapter2 OST,작곡Toby Fox,권리Materia Music Inc./Royal Sciences LLC로 표시한다. 간결한 출처 기록은 `assets/source/youngcle-factory143/bgm-source.json`; 전체 다운로드 메타데이터는 임시 `/tmp/subtarune-factory143-source.info.json`에만 보관한다.

```sh
uvx --from yt-dlp yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 --ffmpeg-location /opt/homebrew/bin --output 'assets/audio/bgm/youngcle_factory.%(ext)s' 'https://www.youtube.com/watch?v=In3y0C7mQvA&list=PLjj7CATn1HfUetet9LgdabEk9GsH7R2tI&index=6'
```

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

## 편집노조 스테이지 (BUILD153, 2026-09-14)

사용자 지정 [j69knNADinw](https://www.youtube.com/watch?v=j69knNADinw)의 포맷251 전체를 `bgm/editor_union_stage.mp3`로 변환했다. yt-dlp 메타데이터 제목은 `03. And Now For Today’s Sponsors…! (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`, 업로더 표시명은 `Toby Fox`다. 48kHz stereo,34.922813초,791732바이트,평균−13.6dBFS/peak−0.1dBFS. 자르기·피치·속도·볼륨·페이드 가공 없이 시작부터 전체 사용한다. 맵 진입은 무음이며 최초 인사 시점에서 시작하도록 사전 로드한다.

마리오 점프는 [The Mushroom Kingdom의 Super Mario Bros.(NES) 음원 목록](https://themushroomkingdom.net/media/smb/wav)에 Deezer 제공 `Jump (small)`로 표시된 [원본 WAV](https://themushroomkingdom.net/sounds/wav/smb/smb_jump-small.wav)를 사용한다. 팬 보관본이며 Nintendo 공식 배포 페이지라고 주장하지 않는다. `sfx/mario_jump.mp3`는44.1kHz mono,0.590113초,평균−21.9dBFS/peak−10.9dBFS. 전체 길이·원래 피치/속도/음량을 유지한 MP3변환이다. 기존 DELTARUNE `jump`는 그대로 둔다.

마리오 토관(2026-09-15 사용자 ‘토관에 들어갈 때 그 마리오 토관소리’)은 같은 목록의 `Pipe/Power-down`(`smb_pipe.wav`, 22.05kHz mono)을 `sfx/mario_pipe.mp3`(0.786초, 원래 피치·속도 유지)로 변환했다. 원본 WAV 사본은 `assets/source/bidet-room164/audio/`에 둔다. 팬 보관본이며 공식 배포라고 주장하지 않는다.

스포트라이트·착지·흙·박수·회복은 기존 `plug/chime/explosion/baron_slam/scrape/thud/maillard_applause/heal`을 재사용한다. 글자별 `editor_union_bam`은 기존 `fanfare`의0.90~1.32초 화음과 `baron_slam`의 앞0.42초를 각각0.65/0.55게인으로 섞고 짧게 감쇠한0.42초 효과음이다(44.1kHz mono,평균−18.5dBFS/peak−6.5dBFS).0.7초 글자 간격에 꼬리가 겹치지 않으며 원본 공용 파일은 유지한다. 비데와 파크 인형탈은148목소리를 유지하며 `VOICES.ttuulla`만150원본 Eddy ‘히히’ 블립에 등록했다(rate1/level0.85/cut:false/minGap0.20). 표시 화자 `뚜울라알라`는 voice키`ttuulla`를 쓴다. 새 실제 인물 목소리 복제는 없다.

출처·정확한 변환 명령·원본과 결과 SHA256·장면별 음량 권장은 `assets/source/stage153/audio/README.md`, 뚜울라 제작 근거는 `assets/source/ttuulla150/audio/manifest.json`에 보존한다. 새 파일 ffprobe/전체 디코드 검증은 실제 게임 재생·주관적 청취 평가와 구분한다. 원본 권리는 각 권리자에게 있으며 출처 표기가 이용허락을 뜻하지 않는다.

후속 ‘파크가디언 인형탈 목소리 악질맨 목소리마냥 게인도 좀’ 요청: 인형탈 원본 MP3·공주풍410→450Hz·0.16초 길이는 보존하고 디코드 시 한 번만 `0.64*tanh(2.1*sample)` 소프트 드라이브를 적용한다. `drive:2.1,driveLevel:0.64`는 `park_guardian_costume`에만 있고 rate1/level0.85/간격0.18은 유지한다. 실제7056표본 측정 평균−17.565→−15.484dBFS(+2.081dB), peak−11.046→−9.408dBFS, 클리핑0, 길이·영점 교차 유지. 악질맨의 낮은 톤 자체를 복제하지 않고 살짝 강한 질감과 게인만 보탰다. 파크 본체·비데·악질맨·다른 목소리는 변경하지 않는다.

## 영클전함 라운지 네 목소리 (BUILD148, 2026-09-14)

비데·파크가디언 인형탈·파크가디언 본체는 `tools/audio/lounge148_voices.mjs`의 기본파/배음·두 공명 대역으로 만든 원본 비언어 모음 블립이다. 럭키가이는 사용자가 첫 합성안을 ‘디지털음 같다’고 평가하여 macOS 기본 한국어 Eddy TTS ‘헤’ 단음으로 교체했다. 외부 음원이나 실존 인물 녹음·목소리 복제는 사용하지 않았다. 비데는 사용자의 아스고어 같은 굵은 음색 요청을 낮고 둥근 비음으로 해석한 원본이며 아스고어 게임 샘플 복제는 아니다.

| 파일 (`assets/audio/voices/`) | 음높이·방향 | 디코드 길이 / 평균·피크 dBFS |
|---|---|---|
| `warm_bidet.mp3` | 88→80Hz, 낮은 공명과 기본파를 강화한 굵은 비음 | 0.170초 / −19.8·−11.4 |
| `lucky_guy.mp3` | 한국어 Eddy TTS ‘헤’ ×1.08, 장난스러운 짧은 발음 | 0.190초 / −20.5·−11.0 |
| `park_guardian_costume.mp3` | 410→450Hz, 부드럽고 밝은 공주 음색 | 0.160초 / −17.6·−11.0 |
| `park_guardian.mp3` | 104→96Hz, 인형탈 모습과 대비되는 매우 굵은 음색 | 0.175초 / −20.4·−10.5 |

44.1kHz 모노·5ms 어택·25ms 릴리스·libmp3lame quality2. `VOICES`는 네 키를 `rate:1, level:0.85, cut:false`로 등록하고 원본보다20ms 긴 `minGap`을 둔다. 기존 `Object.keys(VOICES)` 사전 로딩과 `Sound.blip` 교차 페이드를 그대로 사용한다. 대사·이벤트 추가는 이 오디오 작업에 포함되지 않는다.

사용자 청취 후 비데를122→112Hz에서88→80Hz로 내리고 공명을270/650Hz로 낮췄다. 목표 peak도0.30→0.27로 낮춰 RMS−20.00→−19.79dBFS로 유지했다. 럭키가이는 `say -v 'Eddy (한국어(한국))' -r 190`의 ‘헤’를1.08배 피치·속도로 올리고 앞0.19초·가벼운 압축·페이드·peak0.28 정규화로 만들었다. 정확한 필터와 원본 `lucky_guy-eddy-he.aiff`는 아래 출처 폴더에 보존한다. 파크가디언 두 음성은 WAV·MP3 바이트 그대로 유지했다.

재생성: `node tools/audio/lounge148_voices.mjs`. 원본 AIFF·인코딩 전 WAV·실제 MP3 디코드 기반8회 반복 미리듣기·정확한 계수/해시/측정은 `assets/source/lounge148/audio/`에 있다. `all-voices-preview.wav`는 표 순서대로 재생한다. ffmpeg 전체 디코드에서7497/8379/7056/7717샘플, 무클리핑을 확인했다. 제작자의 주관적 청취 평가를 완료했다는 의미는 아니다.

## 섭리오(스크린 속 2D 게임) BGM (2026-09-15)

사용자 지정 두 곡. 둘 다 Toby Fox 공식 채널의 DELTARUNE Chapter 3+4 Soundtrack(2025-06-04 게시)에서 yt-dlp `bestaudio`(webm/opus)를 MP3 q2로 변환했으며 원본 전체 길이·피치·속도를 유지한다. 팬게임 비수익 사용이며 공식 이용허락을 주장하지 않는다.

| 파일 | 출처 | 길이 | 용도 |
|---|---|---|---|
| `bgm/subrio_query.mp3` | [07. Query?](https://www.youtube.com/watch?v=2LkI2_NdoZE) | 28.56초 루프 | 스크린이 가운데로 잡히고 `SUBRIO` 로고가 천천히 뜰 때부터 직업 선택까지 |
| `bgm/subrio_sword.mp3` | [33. SWORD](https://www.youtube.com/watch?v=KAtudLu42vA) | 136.93초 루프 | 화면이 밝아지며 2D 게임에 들어간 뒤 |

원본 webm 은 `assets/source/subrio165/audio/`에 둔다.

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

# 라즈마 비명·문장 원음 (BUILD157, 2026-09-14)

BUILD157 라즈마 추가 원음: 사용자 지정 [라즈마 전라도](https://www.youtube.com/watch?v=r_rgJvc0_Cc), 표시 업로더 GOMES BARROS ADAUTO,2023-06-24. 원본0.55–1.60초 비명과1.94–4.50초 문장을 각각 `park_razma_scream.mp3`(1.05초), `park_razma_jeolla.mp3`(2.56초)로 추출했다. 음높이·속도 변경 없이 +2dB 입력 게인/짧은 경계 페이드/피크 리미터를 사용했다. 원본이 이미0dBFS를 넘어서 평균은 실제로0.38/0.09dB만 증가했고, 최종 디코드 피크−1.23/−0.92dBFS 및 full-scale 이상 표본0개다. 정확한 출처·ASR 한계·재현·해시는 `assets/source/park157/audio/README.md`에 있다. 공식 이용허락이나 사람의 직접 청취를 확인했다고 주장하지 않는다.

# 영클 TV 음성·전원 효과음 (BUILD139, 2026-09-13)

후속 음성 간격 수정(2026-09-13): 사용자 ‘살짝 끊긴다, 톤은 좋다’에 따라 아래139의 `minGap:0.17`만 **0.12**로 줄였다. 기본 TextBox 글자 간격45ms에서 실제 블립 시작 간격은180→135ms다.160ms 파일 뒤의 무음 간격을 제거하고 기존8ms 단선 교차 페이드로 다음 블립을 잇는다. **사용자가 지정한 `4wSPkpzSQQE`38.10~38.26초 원본 MP3·SHA256·rate0.96·level1은 그대로**이며 다른 Queen 음원으로 교체하지 않았다. 다른 화자·BGM·SFX·글자 속도도 유지한다.

근거: 실제 Chromium OfflineAudioContext에서 같은 파일/40글자/45ms 입력을 사용하고 최소 간격만0.17→0.12→0.17로 바꿔 재현했다.0.1~1.7초의5ms RMS창321개 중−60dBFS 미만 창은49→0→49개, 피크는0.164448→0.164521로 유지됐다. 샘플 자체 끝값은0.0001345이며 파일을 다시 자르거나 늘리지 않았다. 이는 공백/출력 파형 검증이며 사람이 음색을 청취한 결과는 아니다. 실행 확인은 `./dev.sh` 후 `?qa=youngcle1`에서 TV 대사를 C로 진행한다. 회귀 검사는 `node --test tests/unit/youngcle-voice.test.mjs`다. 비교 WAV와 측정 스크립트는 작업 worktree의 `.omo/evidence/voice140/` 및 `voice140-repro.mjs`에만 보관하며 배포 파일에는 포함하지 않는다.

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

## 섭리오 직업 효과음 · 날리기 소리 (BUILD167, 2026-09-15)

사용자 지시: 판테온 창(탭·차징·투척), 질리언 시계(달콤가득 질리언 스킨)와 스턴(질리언 공식). 원음은 League of Legends 공식 위키(wiki.leagueoflegends.com, `/en-us/images/<파일>.ogg`)의 스킬 SFX 파일이며 Riot Games 저작물(비수익 팬게임 용도). ffmpeg 로 mp3(44.1kHz mono, `-q:a 2`) 변환만 했고 원본 ogg 는 `assets/source/subrio167/audio/` 에 보존.

| 게임 파일 | 원본(위키 파일명) | 길이 | 쓰임 |
| --- | --- | --- | --- |
| `sfx/zilean_q_throw.mp3` | `Zilean_SugarRush_Q_Ticking_SFX.ogg` | 3.65s(재생 1.3s) | 질리언 시계 둘 던질 때(달콤가득 질리언 Q) |
| `sfx/zilean_q_stun.mp3` | `Zilean_Original_Q_Stun_SFX_0.ogg` | 3.48s(재생 2.0s) | 같은 적에 시계 둘 → 스턴(질리언 공식 Q 스턴) |
| `sfx/pantheon_q_tap.mp3` | `Pantheon_Original_SFX_Q_Tap_cast_0.ogg` | 1.18s(0.5s) | C 탭 짧은 창 |
| `sfx/pantheon_q_charge.mp3` | `Pantheon_Original_SFX_Q_OnCast_0_0.ogg` | 2.48s(1.1s) | C 꾹 차징 시작 |
| `sfx/pantheon_q_throw.mp3` | `Pantheon_Original_SFX_Q_Missile_OnMissileLaunch_0.ogg` | 0.95s | 차징 창 투척 |
| `sfx/pantheon_q_hit.mp3` | `Pantheon_Original_SFX_Q_Missile_hit_0.ogg` | 1.57s(0.5s) | 창 명중 |
| `sfx/pantheon_e_up.mp3` | `Pantheon_Original_SFX_E_OnCast_0.ogg` | 2.07s(0.7s) | X 방패 올림 |
| `sfx/pantheon_e_block.mp3` | `Pantheon_Original_SFX_E_block.ogg` | 1.61s(0.6s) | 방패로 막음 |
| 브랜드 불 | 기존 `ember`(위키에 브랜드 Q SFX 파일 없음, 음성만) | | 6초마다 불덩이 |

보존해 둔 참고: `Zilean_SugarRush_Q_Stun_SFX.ogg`, `Pantheon_Original_SFX_Q_Missile_missilecast_0.ogg`(미사용).

**날리기(fling) 소리 지침(사용자 피드백 2: “ㅈㄴ 재사용하노”)**: `whoosh` 를 fling 기본값으로 쓰지 않는다. 장면마다 다른 소리를 고른다 — 파크가디언 박치기 **`wing`**([Deltarune snd_wing](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_wing/snd_wing), 디컴파일 자료, 원본 `assets/source/subrio169/audio/snd_wing.wav` SHA256 `33501074b8436b2ccdd827fe2b7027c6b2a3d2c874820b30f6ccf1ecae2c4725`, 0.469초 그대로 mp3 변환), 비데가 마리오를 날릴 때 `cannon_puff`. BUILD167의 합성 휘슬 `fling_whistle` 은 사용자가 “이상한 소리”라 해서 삭제(2026-09-15 포스트모텀 `docs/postmortems/2026-09-15-cutscene-sound-coverage.md`). 새 fling 은 합성하지 말고 공식 파일에서 고른다(`snd_bombfall` 도 받아 두었다, 미사용).

섭리오 스테이지 클리어(깃발 C, 몬스터 0)는 사용자 지시로 전투 승리음 `won`(언더테일 snd_victor) 을 쓴다(BUILD168, 전엔 합성 `fanfare`). 몬스터가 남아 있을 때의 C 는 `error`.

## 섭리오 보스전 공식 효과음 (BUILD170, 2026-09-15 “거슨전 띵 휘융 공식 사운드”)

[TeamBlossomDevs/DeltaruneDecomp_beta](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/tree/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds) 디컴파일 자료의 원본 wav 를 그대로 mp3(44.1k mono q2)로 바꿨다. 원본은 `assets/source/subrio169/audio/`. 이 SHA 의 목록엔 거슨(4장) 전용 소리가 없어 같은 용도의 공식 소리를 골랐다.

| 게임 파일 | 원본 | 길이 | 쓰임 |
| --- | --- | --- | --- |
| `sfx/bell.mp3` | `snd_bell` | 0.47s | 순간이동 뒤 영역 표시(띵) |
| `sfx/spearappear.mp3` | `snd_spearappear` | 0.54s | 보스가 사라질 때 |
| `sfx/wing.mp3` | `snd_wing` | 0.47s | 위에서 미끄러져 내려올 때(휘융) · 파크가디언 날리기 |
| `sfx/impact.mp3` | `snd_impact` | 0.62s | 내려찍기 착지 |
| (재사용) `sfx/impact.mp3` | 같은 파일 | 0.62s | 드럼통의 악마 흰 드럼통 착지(BUILD255, 사용자 “띠링 하는게 ㅂㄹ임” → 델타룬 공격음). `drum_impact.mp3` 는 삭제(로드 목록 감사: 파일만 남으면 무음 경고) |
| `sfx/power.mp3` | `snd_power` | 0.71s | 팽이 회전 예비(빨간 원) |
| `sfx/ultraswing.mp3` | `snd_ultraswing` | 1.09s | 팽이 회전 |
| `sfx/heavyswing.mp3` | `snd_heavyswing` | 1.04s | 평타(슬로우) |
| 면역 땡 | 기존 `knock`(1.3배) | | 패턴 중 맞혔을 때 |

### 섭리오 보스전 브금 — Chaos King (BUILD174, 사용자 지정)

| 게임 파일 | 출처 | 길이 | 쓰임 |
| --- | --- | --- | --- |
| `bgm/chaos_king.mp3` | 유튜브 [u5wyfl-OfFQ](https://www.youtube.com/watch?v=u5wyfl-OfFQ) “30. Chaos King (DELTARUNE Chapter 1 Soundtrack) - Toby Fox”(Toby Fox 공식 채널, 포맷 251 → 44.1k 스테레오 q2) | 111s(음악은 104~106.5초에 여운 뒤 무음) | 1-4 오프닝 START!! 부터 보스전 내내. `playBgm('chaos_king', { volume: 0.45, loopEnd: 104.0, loopFade: 0.8 })` — 104초에서 0.8초 줄이고 처음으로 되감아 끊김 없이 돈다(SWORD 와 같은 방식). 1-0~1-3 은 그대로 SWORD |

받기: `uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' -o 'chaos_king.%(ext)s' 'https://www.youtube.com/watch?v=u5wyfl-OfFQ'` → `ffmpeg -i chaos_king.webm -ar 44100 -ac 2 -q:a 2 assets/audio/bgm/chaos_king.mp3`.

### 무대 홀 입장 연출 (BUILD177, 사용자 지정)

| 게임 파일 | 출처 | 길이 | 쓰임 |
| --- | --- | --- | --- |
| `bgm/mike_board.mp3` | 유튜브 [YsZoTTl59hg](https://www.youtube.com/watch?v=YsZoTTl59hg) “04. MIKE, the BOARD, please! (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox”(Toby Fox 공식 채널, 포맷 251 → 44.1k 스테레오 q2) | 37s(음악은 32.8초까지, 뒤는 무음) | 뚜울라가 무대에서 뛰어내려 착지한 순간부터 “노래로 승부봅시다” 까지. `{ bgm: 'mike_board', volume 0.5, fadeIn 0.2, loopEnd 32.8, loopFade 0.12 }`(컷신 bgm 노드가 loopEnd/loopFade 를 넘긴다) |
| `sfx/locker.mp3` | Deltarune `snd_locker`(TeamBlossomDevs 디컴파일, 같은 SHA; 원본 `assets/source/stage_hall177/audio/`) | 1.47s | 무대 불이 켜지는 “철컥!” |

### 무대 리듬 게임 곡·영상 (BUILD178, 사용자 지정)

리듬 게임은 곡의 **영상을 통째로** 튼다(TV 화면에 그리고 소리는 그 영상에서). yt-dlp 로 360p 이하 영상+오디오를 mp4 로 받아 `assets/video/` 에 두고, 차트는 `tools/rhythm/chart.py` 가 오디오 onset 으로 만든다(`assets/rhythm/<id>.json`).

| 게임 파일 | 출처 | 길이 | 쓰임 |
| --- | --- | --- | --- |
| `video/noamtori.mp4` + `rhythm/noamtori.json` | 유튜브 [-IvdHDCBsps](https://www.youtube.com/watch?v=-IvdHDCBsps) “MD형섭 - 방가방가 노앰토리”(무언가가큰징징이, 360p mp4 4.0MB) | 88s | 첫 곡. 차트 166노트(홀드 51, 1.9/s), bpm 139.7 |
| `video/bojipam.mp4` + `rhythm/bojipam.json` | 유튜브 [-c1t2MTk_q0](https://www.youtube.com/watch?v=-c1t2MTk_q0) “MC노라니 - 보지팜 (백업)”(노라니 백업, 360p mp4 6.6MB) | 133s | 두 번째 곡(게임 표기 ‘보X팜’). 차트 232노트(홀드 54, 1.7/s), bpm 126 |
| `sfx/guitar_{c4,g4,a4,pc_e,pc_a,mute,scratch,feedback,sustain}.mp3` | 물리 모델 합성 `tools/audio/guitar.py`(Karplus-Strong 현 → 고게인 tanh 디스토션 → 캐비닛 로우패스 → 짧은 룸; 파워코드는 근음+5도+옥타브 디튠) — 사용자 “게인 세고 리얼한 일렉” | 0.07~3.2s | 작은별 음정(C4·G4·A4), GREAT 파워코드 E/A 번갈아, MISS 팜뮤트 척, 노트 없는 데 긁기, 곡 시작 전 피드백 지이이잉, 홀드 누르는 동안 sustain(떼면 씬이 줄여 끊음) |
| `sfx/guitar_dead.mp3` | 합성 `tools/audio/guitar.py`(로우패스 노이즈 + 70Hz 툭) | 0.1s | 리듬 MISS(음정 없음). BUILD183 사용자 확정 “곡 중 소리 없애고 리듬으로만” — `guitar_pc_e/a`·`guitar_mute`·`guitar_sustain`·`guitar_lead_*` 는 삭제, 작은별 음정 `guitar_c4/g4/a4` 만 사운드 체크에 남음 |
| `sfx/static_loop.mp3`, `sfx/static_burst.mp3` | 합성 `tools/audio/static.py`(대역 노이즈 800~6000Hz + 크래클 임펄스, 루프는 끝 크로스페이드) — 사용자 “못 맞추면 노래가 지직거리면서 덜 나온다” | 1.95s 루프 / 0.22s | 곡 동안 신호 품질(1−signal)에 비례해 잡음, MISS 순간 지직 |
| `assets/video/akjil.mp4` | 사용자 지정 [oQ0P4mRV_wA](https://www.youtube.com/watch?v=oQ0P4mRV_wA) ‘악질 시청자’ -쥰희- 버전, yt-dlp 360p 이하 mp4(vp9 240×358 + aac), 편집 없음 | 77.6s | 리듬 둘째 곡(차트 `assets/rhythm/akjil.json`, 하이라이트 4.0~29.9·35.1~44.8초) |
| `assets/video/noamtori.mp4` | 원본 유튜브 -IvdHDCBsps 전체(BUILD183 복원 — 영상은 안 자르고 노트만 18.2초부터) | 87.8s | 리듬 첫 곡 |
| `bgm/pandora_palace.mp3` | 사용자 지정 [q-5cXVcCOUs](https://www.youtube.com/watch?v=q-5cXVcCOUs) — yt-dlp 메타데이터 제목 `Pandora Palace`, 업로더 `Toby Fox`, 표시 길이 100초. 포맷251 전체를 mp3 q2 로 변환, 편집 없음(`assets/source/bgm188/` 메타) | 99.6s | 용광로 복도·용암 수로(youngcle13/14) 브금 |
| `sfx/sizzle.mp3` | 합성(numpy: 하이패스 노이즈 급붙음 + 크래클, 1.1초 감쇠) | 1.1s | 용암에 들어갈 때 치이익(컷신·뗏목 탑승) |
| `sfx/crowd_roar.mp3`, `sfx/crowd_roar_2.mp3`, `sfx/crowd_bed.mp3` | 유튜브 [K7zvbp2hbkk](https://www.youtube.com/watch?v=K7zvbp2hbkk) “Heavy Cheering & Applause with Large Indoor Crowd in Convention Hall” (Sound Ideas - Topic) 0.4~5.4s / 7~12s / 15~23s(끝 0.4s 크로스페이드 루프), loudnorm −16 LUFS, 원본 `assets/source/crowd187/audio/` — BUILD187 사용자 “휘파람 합성이 전자음 같다, 진짜 박수·환호” 로 합성본(`tools/audio/crowd_cheer.py`) 교체 | 5s / 5s / 8s 루프 | 콤보 50·곡 끝·하이라이트 함성 / 변형 / 곡 중 흥에 따라 커지는 바닥 소리 |
| `sfx/crowd_cheer.mp3`, `sfx/crowd_cheer_2.mp3` | 유튜브 [barWV7RWkq0](https://www.youtube.com/watch?v=barWV7RWkq0) “Applause Crowd Cheering sound effect” (ParadoxMirror) 1~4.6s / 13~16.6s, loudnorm | 3.6s ×2 | 콤보 20·하이라이트 16박마다 환호(번갈아) |
| `sfx/applause.mp3` | 유튜브 [zsrWXMfEogY](https://www.youtube.com/watch?v=zsrWXMfEogY) “Audience Clapping Sound Effects (no copyright)” 0.2~3.6s — 박수만(BUILD187, Deltarune snd_applause 에서 교체; 원본은 `stage_hall177/audio/`) | 3.4s | 콤보 10 박수·제목 공개·환호에 겹침 |
| `sfx/applause_2.mp3` | 유튜브 [xiG2xO-4Y-s](https://www.youtube.com/watch?v=xiG2xO-4Y-s) “Audience Cheering And Clapping Sound Effect” (SoundEffectsFactory) 6.5~9.8s(박수 위주 구간) | 3.3s | 박수 변형 |
| `sfx/crowd.mp3` | Deltarune `snd_crowd.ogg`(디컴파일, 같은 SHA; 원본 `assets/source/stage_hall177/audio/`) | 14.8s | 홀 관객 입장 웅성웅성 |
| 참고 영상 | 델타룬 3장 테나 리듬 게임 [103D6O-Wr_g](https://www.youtube.com/watch?v=103D6O-Wr_g) | | 두 칸 좌우·홀드·GREAT/MISS·인기 게이지 구성 참고 |

생성 그림(BUILD189, gpt-image-2, `assets/source/lava188/`): 용광로 배경 `backdrops/youngcle_furnace.png`(기존 youngcle_factory 를 참조로 용광로·용암·파란 패널, 1024×1536 → 480×720). 타일·소품은 `tools/art/lava_set.py`(차콜+파랑 철 타일 재색, 용암 타일, 플라즈마 빔 v/h 3프레임, 굳은 용암 벽 2종).

생성 그림(BUILD184, gpt-image-2, `assets/source/band184/`): 밴드 둥가둥가 4프레임(다운·업·왼쪽·오른쪽) — 참조는 기존 raw 시트를 512 로 NEAREST 축소(1.1MB 원본은 HTTP 413), `process.py` 가 기존 `band_*.png` 아래에 붙여 256×512.

생성 그림(BUILD180, OpenGateway gpt-image-2, `assets/source/stage180/`): 리듬 무대 배경 `props/rhythm_backdrop.png`(480×360, 스크린 106,34 264×148 측정값), 관객 띠 `props/rhythm_audience.png`(480×180, 위 평소·아래 환호), 대기실 소품 `props/backstage_*.png`, 무대 판자·마룬 카펫 `props/stage_floor.png`·`hall_carpet.png`·`backstage_carpet.png`. 억빠맨 보컬 시트는 입을 안 벌리는 버전으로 재생성(`band178/ppaman2`).

받기: `uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f 'bestvideo[height<=360]+bestaudio/best[height<=360]' --merge-output-format mp4 -o '<id>.%(ext)s' <url>` → `assets/video/`. 차트: `/usr/bin/python3 tools/rhythm/chart.py assets/video/<id>.mp4 --title … --artist … --out assets/rhythm/<id>.json`.

### 결과창 (BUILD172, 원본 `assets/source/subrio172/audio/`, 같은 SHA)

| 게임 파일 | 원본 | 길이 | 쓰임 |
| --- | --- | --- | --- |
| `sfx/levelup.mp3` | `snd_levelup` | 0.98s | 결과창 제목 WORLD 1 CLEAR!(띠리리링) |
| `sfx/menumove.mp3` | `snd_menumove` | 0.02s | 줄의 숫자가 올라가는 동안 0.055초 간격(피치 1→1.6) |
| `sfx/select.mp3` | `snd_select` | 0.19s | 숫자가 다 찼을 때 |
| `sfx/orchhit.mp3` | `snd_orchhit` | 0.61s | S+!! 도장 내려찍힘(+ 기존 `impact`) |
| `sfx/great_shine.mp3` | `snd_great_shine`(ogg) | 2.26s | 도장 뒤 반짝 |
| (재사용) `sfx/great_shine.mp3` | 같은 파일 | 2.26s | 억빠맨·경섭 재합류 나레이션(BUILD254). 사용자 링크 myinstants `deltarune-great-shrine-41204` 는 403 이라 같은 델타룬 원음 파일을 그대로 씀 |
| `sfx/chain_extend.mp3` | `snd_chain_extend` | 0.24s | 보스 도끼 찌르기(앞으로 뻗음) |
| `sfx/weaponpull.mp3` | `snd_weaponpull` | 1.07s | 찌르기에 걸린 주인공을 끌어당길 때 |

`snd_ghostappear`, `snd_quake_nes` 는 이 SHA 에 파일이 없어(14바이트) 못 썼다. 섭리오 BGM SWORD 는 원본 124~129.5초가 물소리·무음이라(사용자가 준 소스) `playBgm(loopEnd: 124, loopFade: 1.0)` 으로 123초부터 줄였다가 처음으로 되감는다(`src/core/audio.js`).


### 용광로 색깔 기억 게임 (BUILD198, 2026-09-16)

- **영클 TV 호출 음성** `sfx/color_{red,orange,yellow,green,blue,navy,purple,heart,nasdf,pi,legend,ngaita}.mp3`: 사용자 “RED ~ GREEN ~ 하면서 1초에 하나씩, 기계음 같이 / 약간 기계음, 마이크로 한 듯한 느낌, 남자 굵은 로봇 목소리”. 실존 인물 음성이 아니라 macOS `say` 합성(영어 Zarvox = 깊은 남자 로봇 음성, rate 175; 한국어 단어 하트·레전드·응아잇어는 Yuna 를 0.78배로 낮춰 길이는 되돌림) → ffmpeg 한 사슬(highpass 220·lowpass 3800·acrusher 9bit mix 0.3·tremolo 38Hz·aecho 25ms·loudnorm I −15·앞뒤 무음 제거) → 모노 44.1kHz mp3 q4, 0.46~0.84초. 생성기 `tools/audio/color_voices.py`(음성 이름·비율은 인자). 평균 −15dBFS 내외. 참고 영상 `-FfZmCpW0PE`(가재맨 공포 게임, 2022-08-08, 1902초)의 9:30~11:10 오디오(포맷 251)를 받아 로컬 faster-whisper(small, en) 로 원작 호출 구조(yellow → yellow blue → … 0.75초 간격 누적)만 확인했고 그 음성은 쓰지 않았다(스트리머 목소리가 겹침).
- **마지막 판 카메라 영상** `assets/video/gajaeman_cam.mp4`: 사용자 지정 같은 영상의 **12:58.4~13:02.4**(사용자 “12분 58초~13분 2초”; 12:58.0~12:58.35 는 게임 화면 전환 프레임이라 0.4초 뒤부터) 웹캠 얼빡 구간. 포맷 135(480p avc1)+251 을 구간만 받아 `crop=480:480:230:0,scale=240:240`, 30fps, 무음(-an), libx264 crf 26, 4.000초, 25,551바이트. 게임에서 소리 없이 반복(`muted loop`). 팬게임 비수익 사용, 이용허락 확인을 뜻하지 않는다. 전체 영상은 저장하지 않았다.
  - BUILD200: 이 클립을 `assets/video/gajaeman_cam_strip.png`(15fps × 4초 = 60장, 132px 정사각, 10열)로 뽑아 캔버스에 프레임을 그린다 — `<video>` 는 H.264 가 없는 브라우저(헤드리스 Chromium 등)에서 검게만 나왔다(사용자 “검은 화면밖에 안 보여”). 다시 뽑기: `ffmpeg -i gajaeman_cam.mp4 -vf fps=15,scale=132:132 f_%03d.png` → PIL 로 10열 타일.
- **색깔 게임 광기 판 잡음/다리 소리(BUILD200, 내가 고름)**: 폭주 치이이익 = `sfx/sizzle.mp3` + `sfx/static_loop.mp3` 루프(0.45), 버벅·웃음 = `static_burst`, 꺼짐 = `click`; 뒤 연출 다리 판 철컥 = `sfx/locker.mp3`, 울타리 내려감 = `sfx/thud.mp3`.
- **폭발 “꾸와아앙”** `sfx/furnace_blast.mp3` = DELTARUNE `snd_punchheavythunder` 전체(1.772초, 무가공) — 사용자 “폭발음 말고 쿠와아앙, 막타 칠 때 나는 소리, 더 긴 것” → 후보 57개를 `~/Downloads/deltarune_impact_candidates/` 에 두고 사용자가 **“snd_punchheavythunder 가 맞음”** 으로 확정. `snd_bigcut` 은 “아니긴 했는데 저장은 해줘” → `sfx/bigcut.mp3` 보존(미사용). 원본·SHA·후보 분석은 `assets/source/furnace198/audio/README.md`. 기존 `captain_thunder.mp3` 와 같은 원본.
- 형섭 손 `props/hand_point.png`·`hand_press.png`(44×56, `tools/art/furnace_memory_set.py`), 폭발 그림은 기존 `assets/fx/explosion.png`.

- **엄청대박인배 철문(BUILD201, youngcle19)**: 예를 고르면 `locker`(철컥, 기존 파일) 한 번. 다리길·조종실 브금은 지역 브금 `pandora_palace` 그대로(사용자 지정 없음 — 바꾸려면 말씀).
- **조종실 입장 연출(BUILD202)**: 대포 드르르륵 `scrape`, 발사 `boom` + 연기 `cannon_puff`, 벽 충돌 `impact`, 영클 상승 `rocket`, 하강 `ember`+`whoosh`(세 번), 버튼 `click`, 철창 `chain_extend`/`thud`/`locker`, 전투 시작 `battle_start` — 전부 기존 파일(내가 고름). 브금은 영클 테마 `storage_show`. 오방순 목소리 = `voices/obangsun.mp3`(BUILD149 Yuna 낮춘 ‘흐에에에’).
- **나람 목소리(BUILD203)**: 사용자 “뚱뚱한 목소리를 가진 쥰희 느낌, 같은 목소리는 쓰지 말고 비슷하게 새로” → `voices/naram.mp3` = 쥰희 `voices/junhee.mp3`(델타룬 snd_txtsus)를 ffmpeg 로 -3반음(asetrate 0.84)·tempo 1.08·lowpass 2600·bass +5dB·loudnorm 한 변형(0.135초). 쥰희 파일은 그대로. `VOICES.naram` rate 1·cut true·minGap 0.08.


## 조종실 전투 (BUILD207~209, 2026-09-17)

- BUILD221 리듬: 기존 지정 BGM은 변경하지 않는다. `sfx/tvtime_melody.ogg`는 그 MP3의 시간축을 보존한 HPSS 중고역 harmonic layer이며 성공 입력 때만 같은 곡 위치에서 전자 질감을 얹어 재생한다. 드럼/화음이 일부 남으므로 완전한 단일 멜로디 분리로 표현하지 않는다. 생성기·SHA·샘플 일치·노트 시간/길이 계약은 `assets/source/tvtime-rhythm/README.md`. 이전 BUILD220 사각파·고정60ms 보정은 아래 역사 기록이며 현재 미사용. 실제 미디어 반복 길이는 브라우저 `bgm.duration`을 사용한다(디코딩 길이171.5초와 혼동 금지).

- 변신 영클 특별 패턴 4종(BUILD216): **새 소리 없음** — 도입 `jump`·`thud`·`menumove`(춤 박자)·`static_burst`(TV 확대·지지직 복귀), 섭리오 `weaponpull`(창)·`jump`·`laser_charge`/`laser_zap`(도트 영클 레이저)·`static_burst`(과부하)·`baron_slam`(쓰러짐)·`hit`(명중)·`power`(일어남), 리듬 `bell`(패드 삐용)·`damage`(MISS)·`wing`/`damage`(우는 영클), 마녀재판은 파크 판 소리 그대로(`park_trial_objection` 소레와 오카시요·`park_trial_shatter`) + `thud`(망치), 팽이 배틀 `heavyswing`(돌진)·`orchhit`(팅!)·`static_loop`(티이잉 비빔)·`impact`(히트)·`furnace_blast`(5히트 쿠왕). 브금은 `youngcle_tvform_battle` 그대로(전환 없음), 리듬 박자 149.5bpm 은 스펙트럼 플럭스 자기상관 측정값.
- `rhythm/tvtime.json`(BUILD218/220 리듬 특별 패턴 차트): `bgm/youngcle_tvform_battle.mp3` 에서 `tools/rhythm/chart.py --player melody --no-video` — 템포 148.000bpm(콤 필터 0.01 해상도, 첫 박 0.176s, 드리프트 3.3ms/171s), 플레이어 노트 = 리드 대역(250~2000Hz 조화곱) 음정이 바뀌는 실제 온셋 자리 그대로(격자점이 25ms 안일 때만 붙임, 격자 밖도 유지 — 클릭 트랙 교차상관 최고점 +0.0ms, |노트−온셋| 중앙값 3.4ms) 479개(2.79/s, 홀드 없음, 노트마다 MIDI pitch 62~82) + 사이드 drums 538/vocal 402. 사용자 “노래랑 아예 똑같아야, 음만 다른 거지” — GREAT 마다 그 노트 음의 square 신스(0.15s, gain 0.35). 노트 창은 지금 브금 시각+2초부터 15초. 재생 지연 보정 `rhythm.latency`(기본 0.06s — 노트가 소리보다 늦으면 줄이고 먼저면 늘린다). 관객 환호는 무대 씬과 같은 crowd_cheer/roar/applause.
- `bgm/youngcle_tvform_battle.mp3`(BUILD214 변신 영클 전투): 사용자 지정 [ttz22bFLZqQ](https://www.youtube.com/watch?v=ttz22bFLZqQ) — yt-dlp 메타데이터 제목 “It's Tv Time! (From "Deltarune")”, 업로더 ElevenWAV, 171초, 업로드 20250701. `uvx --from yt-dlp yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2` 로 전체를 변환, 편집 없음(`assets/source/youngcle-tvform-bgm/meta.txt`). 전투 진입 때 0초부터. 인트로 소리: `power`(snd_power 띠리리리링)·`wing`(오라 휘이잉)·`great_shine`(에너지)·`baron_slam`(땅 내리침)·`thud`(VS 안착)·`pop`(코인벌기 버튼), 코인 `bell`(등장)·`item`(획득), 패턴은 `laser_charge`/`laser_zap`/`laser_beam`/`wing` 재사용 — 새 파일은 브금 하나.
- 조종실 전용 패턴 3종(BUILD213): **새 소리 없음** — `obangsun_beam` = `laser_charge`(조준)·`obangsun_wail`(흐어어어어어)·`laser_zap`/`laser_beam`(빔·스윕), `naram_tank` = `scrape`(굴러옴)·`cannon_guard_fire`(발사, snd_chargeshot_fire 변형)·`explosion`(착탄, 델타룬 폭발 영상), `youngcle_ship` = `wing`(함선 발사, snd_wing)·`laser_charge`/`laser_zap`(고정 레이저).
- 조종실 보스전 뒤 연출(BUILD211, `ship_control.js AFTERMATH`): **새 소리 없음** — 선장실 만카츠키 연출과 같은 파일 재사용: `captain_thunder`, `bgm/captain_reveal`(ANOTHER HIM), `captain_transform`, `furnace_blast`(쿠와아앙, snd_punchheavythunder), `bgm/captain_mankatsuki`(I'm Very Bad, 변신 뒤·재입장), `laugh_junhee`, `whoosh`/`rumble`(연기·소용돌이), `battle_start`(전투 시작 연출), 느낌표 `chime`.
- `bgm/youngcle_battle.mp3`: 사용자 지정 [XR2QQMfeJbg](https://www.youtube.com/watch?v=XR2QQMfeJbg) — yt-dlp 메타데이터 제목 “32. Attack of the Killer Queen (DELTARUNE Chapter 2 Soundtrack) - Toby Fox”, 업로더 Toby Fox, 표시 124초. 포맷 251 전체를 mp3 로 변환, 편집 없음(123.9초, `assets/source/youngcle-battle-bgm/`). 퀴즈 폭언 뒤(1.4초 페이드아웃)·피날레에서 꺼지고, 퀴즈 뒤 “니앰” 다음에 다시 켠다.
- **사용자 원칙(2026-09-17) “웬만해선 델타룬 사운드 재사용”** — 아래는 전부 [TeamBlossomDevs/DeltaruneDecomp_beta](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta) `sounds/`(커밋 154f9a97) ogg → mp3 q2, 표시한 것 외 편집 없음. BUILD207 의 ffmpeg 합성(laser_pew/laser_fire/laser_charge_tick)과 `snd_queenhowl_b`(queen_kieek)는 폐기.
  - `sfx/queen_hoot.mp3`(0.84초) = `snd_queen_hoot_0` — 영클 놀람(사용자 “퀸 호오 소리”). 나람 볼 충돌·오방순 충돌·점프슬램. 다른 호오(`snd_queen_hoot_1/2`, `snd_queen_gasp`, `snd_queen_woah/woo`)는 `~/Downloads/deltarune_impact_candidates/` 에 후보로.
  - `sfx/punch.mp3`(1.92초) = `snd_punchmed` — 나람 볼·오방순이 영클과 부딪힐 때(사용자 “부딪힐 때 파도소리 실화냐” → 합성 `boom` 폐기).
  - `sfx/laser_charge.mp3`(1.31초) = `snd_chargeshot_charge` — 철창 잠김 때 + 발사 1.3초 전. `sfx/laser_beam.mp3`(3.6초, BUILD210) = `snd_chargeshot_fire`(발사) 위에 `snd_dtrans_drone` 앞 3.6초(0.2초부터 0.9초 페이드인, volume 1.7)를 겹쳐 하나로 이어 붙임(3.15초부터 0.45 페이드아웃, 리미터 0.95) — 사용자 “레이저 소리 중간에 한 번 끊긴다”(발사음 1.77초가 끝나며 지속음으로 넘어가던 이음새) → 한 파일로 연속. 이전 `laser_blast.mp3` 는 삭제. 막판 틱 = 기존 `spearappear`(snd_spearappear), 철창 잠김 철컥 = 기존 `locker`(snd_locker).
  - `sfx/laser_zap.mp3`(0.56초) = `snd_laz_c` — 선회 레이저 볼트.
  - 재사용: 영클 피함 = `hit`(검 소리, 사용자 “그냥 검소리만”; 합성 `whoosh` 는 “파도소리”라 금지), 나람 점프 `jump`, 착지 `baron_slam`, 나람 볼 타격 `impact`, 돌진 `heavyswing`, 억빠맨 상자 진입 `wing`, 오방순 도약 `jump`, 쿠와아아앙 `furnace_blast`(snd_punchheavythunder), 연타 `menumove`, 철창 부서짐 `pop`.
- `sfx/obangsun_wail.mp3`(1.5초): 사용자 지정 [유튜브 쇼츠 Z-3eiWvwJQ8](https://www.youtube.com/shorts/Z-3eiWvwJQ8)(“불효자는 웁니다”, 업로더 오방순) 44.55~46.05초, 끝 0.12초 페이드 — 오방순 광선 패턴 ‘흐어어어~’ 마다. 구간은 파형·음정 분석으로 골랐고 다른 후보 4개는 `assets/source/obangsun-voice-v2/`.

| **청소부** 대사 음색 (BUILD227) | 사용자 “거슨 목소리” → 델타룬 4장 거슨 말하는 소리 클립 [VHS-OAgYyJM](https://www.youtube.com/watch?v=VHS-OAgYyJM)(Esperanza Platinum-Soundtrack Keeper, 2026-08-11) | `voices/janitor.mp3` | **적용됨** — 3.345s 부터 블립 하나 0.105s 를 그대로 자름(파일은 피치 변경 없음, 재생 rate 0.9439 = 반키 톤다운). 원본 webm 은 `assets/source/janitor-v1/audio/`. 게임 원본 텍스트음 ogg 가 들어오면 교체 |

| **청소부 등장** 브금 (BUILD226 토리이 길 이벤트) | 사용자 지정 [JkEhQ3qJubU](https://www.youtube.com/watch?v=JkEhQ3qJubU) | `bgm/wise_words.mp3` | **적용됨** — yt-dlp 메타: `56. Wise words (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`, 업로더 Toby Fox, 20250604, 47초. bestaudio(webm) 전체를 MP3 q2 로 변환, 트리밍·피치 변경 없음. 원본 `assets/source/janitor-v1/audio/wise_words_src.webm` |
| **청소부 합류 이후** 브금 (토리이 길·다음 맵들) | 사용자 지정 [RKQUblO-iCs](https://www.youtube.com/watch?v=RKQUblO-iCs) | `bgm/my_castle_town.mp3` | **적용됨** — `3. My Castle Town (DELTARUNE Chapter 2 Soundtrack) - Toby Fox`, 20250525, 131초. 같은 변환. `storyBgm`: `torii_janitor_joined` 이면 짜장 맵들에서 같은 이름 → 맵 이동 때 다시 재생되지 않음 |
| **청소부 웃음** 효과음 (BUILD227) | 같은 거슨 웃음 클립 [WiNn1mjmBlw](https://www.youtube.com/watch?v=WiNn1mjmBlw) | `sfx/laugh_janitor.mp3` | **적용됨** — 앞 1.6초 그대로(끝 0.15초 페이드), 웃음 모션과 같이 재생. 원본 webm 은 `assets/source/janitor-v1/audio/` |
| **러너 기믹 검 소리** (BUILD230) | 사용자 “c 누를 때 공격 사운드는 검 휘두르는 짧은 바람소리, 델타룬에 있으면 그거” → 디컴파일 저장소 `sounds/snd_swing`, `snd_criticalswing` 원본 wav | `sfx/swing.mp3`(0.73s, C 베기), `sfx/criticalswing.mp3`(1.09s, 공중 C 회전 베기) | **적용됨** — 44.1k mono q2 변환만. 검 뽑기는 기존 `weaponpull`, 대시는 `wing`, 점프는 `jump`. 원본은 `assets/source/runner-v1/audio/` |
| **러너 장애물 쳐냄·맞음** (BUILD236) | 사용자 “공격으로 쳐낼 때 효과음 델타룬에서 쓰이는 거” → 디컴파일 저장소 `sounds/snd_hit`, `snd_damage` 원본 wav | `sfx/deflect.mp3`(0.22s, 베기로 나뭇잎·가지를 쳐낼 때), `sfx/hurt_dr.mp3`(0.45s, 못 쳐내고 맞을 때 HP −10) | **적용됨** — 44.1k mono q2 변환만. 원본은 `assets/source/run-obstacles-v1/audio/`(snd_graze·snd_bump 는 보관) |
| `sfx/wallclaw.mp3` | `snd_wallclaw` | 1.13s | 찢칠라 찢기(틈이 벌어질 때, BUILD242) |
| `sfx/metalhit.mp3` | `snd_metalhit` | 0.89s | 찢칠라 드럼통 착지·굴러 들어옴 |
| `sfx/bell_bounce.mp3` | `snd_bell_bounce_short` | 0.55s | 드럼통이 바닥에서 튕길 때 |
| `sfx/squeaky.mp3` | `snd_squeaky` | 0.31s | 찢칠라 말풍선(speakSfx) |
| `sfx/break1.mp3` | `snd_break1` | 0.71s | 러너 장애물 쳐냄 한 겹 더(BUILD243, snd_hit 과 같이) |
| `sfx/vine_whip.mp3` | `snd_whip_crack_only` | 0.72s | 문코리타 덩굴 채찍이 쓸고 갈 때(BUILD248) |
| `sfx/howl.mp3` | `snd_howl` | 1.89s | 문코리타 소리지르기(음파 고리 시작) |
| **아짐키야** 노래·대사 클립 (BUILD227) | 사용자 지정 [mARppJip_hc](https://www.youtube.com/watch?v=mARppJip_hc) “[Team Azimkiya] 가재맨 애미 뒤짐”(서전트점프, 2024-12-01, 71초) | `bgm/ajimkiya_song.mp3`(전체), `sfx/ajimkiya_line.mp3`(0.0~2.6초, 잠정 구간) | **적용됨** — 소나무 숲 공터 연출(22초 재생) + 등장 대사·적 턴 말풍선 클립. 원본 `assets/source/ajimkiya-v1/audio/` |
| **짜장 일반몹 전투** 브금 (BUILD227) | 사용자 지정 [QvoQVCBqegU](https://www.youtube.com/watch?v=QvoQVCBqegU) “Rakuichi Buster”(Toby Fox, 2026-06-24, 110초) | `bgm/jjajang_battle.mp3` | **적용됨** — `Game.encounterBgm()`: 짜장 맵 조우 기본, 아짐키야전 |

## 드럼통 악마 전투·청소부 구출 (BUILD250, 2026-09-20)

별도 향후 사용 보관(장면 연결·preload 없음): **청소년등장** = `assets/audio/archive/youth_entrance.mp3`, 사용자 지정 [ap0cop](https://www.myinstants.com/en/instant/ap0cop-4272/) 공개 MP3 원본 무가공, 10.866917초. **관객들 충격**은 전달된 로컬 파일이 없어 원본 대기 중이며 저장 완료가 아니다. [보관 색인·출처·SHA](../../assets/source/future-sfx-archive/README.md).

BUILD252 보라 드럼통 쳐내기 추가 공격음(사용자 지정 아스고어 창 휘두르기): `sfx/asgore_spear_swing.mp3` = UNDERTALE `mus_sfx_cinematiccut.ogg` 전체 MP3 q2 변환(1.243719초). 원본 `obj_asgore_spearswipe`의 실제 창 휘두르기 재생 호출로 식별했다. 접촉 시 기존 강한 충격에 한 번 겹치며 일반 루드 버스터 공격·첫 깃발 Release Shoot은 유지한다. 상승/이동은 따뜻한 비데 실제 `bossVanish`의 `spearappear`0.7, 낙하는 `wing`0.9 재사용. [정확한 소스·코드 근거·레벨·SHA](../../assets/source/janitor-asgore-parry/README.md).

BUILD252 별도 성 등장·낙하 사용자 지정음: [Energetic Powershot](https://www.myinstants.com/en/instant/energetic-powershot-51849/)의 공개 [Download MP3](https://www.myinstants.com/media/sounds/energetic-powershot.mp3)를 무가공으로 `sfx/energetic_powershot.mp3`에 저장했다. 10.276초, 48kHz stereo, 165,357바이트, 평균 −22.4dBFS / 피크 −6.1dBFS. 전체 디코드 성공. SHA-256 `ef059bc5e71f815c57426774301005fed4686dd8a0678063e414b7d10f26511b`. 첫 SFX 로드 목록 등록, 장면 타이밍은 성 연출 담당이 연결한다. 재배포 라이선스는 미확인.

BUILD252 최신 사용자 지정 첫 깃발 명중음: [Myinstants Deltarune Release Shoot](https://www.myinstants.com/en/instant/deltarune-release-shoot-62629/)의 Download MP3 원본을 그대로 `sfx/deltarune_release_shoot.mp3`로 저장했다(1.772018초). 첫 깃발 접촉에 한 번 재생하며 아래 `rudebuster_hit` 추천을 이 장면에서만 대체한다. 일반 60피해 지원 공격은 루드 버스터 원본 두 음 그대로. [정확한 파일 URL·SHA·규격](../../assets/source/janitor-release-shoot/README.md).

BUILD252 등장 음악 뒤 공백: 원본 `janitor_hero`의 끝에 −60dB 이하 4.494833초가 확인되어, 음악 감쇠를 보존한 46.76초의 전용 `bgm/janitor_hero_intro.mp3`를 만들었다. 원본은 그대로 보관한다. 등장용은 한 번 재생 후 실제 ended에서 미리 로드한 전투 음악으로 즉시 전환한다. [측정·재현·SHA 기록](../../assets/source/janitor-hero-intro-cue/README.md). 깃발 명중은 원본 `rudebuster_hit` gain 1.0 한 번을 권장하며 폭발음을 섞지 않는다.

BUILD252 일반 흰 드럼통 투척음 보강: `drum_throw.mp3`을 wing의 중역 어택 + baron_slam 저역 몸통의 0.32초 가공본으로 교체했다. 평균 −18.1dBFS / 피크 −5.1dBFS, 마지막 80ms 평균 −47.4dBFS로 짧게 감쇠한다. gain 0.75와 묶음당 1회·0.25초 간격은 유지 권장. [v2 제작·이전 파일·비교 청취본](../../assets/source/drum-throw-v2/README.md). 아래 v1 투척음 설명은 역사 기록이며 충돌/폭발 및 BGM은 그대로다.

청소부 붉은 3겹 참격(사용자 지정 Rude Buster 원본): `sfx/rudebuster_swing.mp3` 발사음과 `sfx/rudebuster_hit.mp3` 명중음은 고정 리비전의 `snd_rudebuster_swing`·`snd_rudebuster_hit` 전체를 MP3 q2로 변환한 것(각 0.953379초, 44.1kHz mono)이다. 원본 게임의 공격·투사체 코드로 실제 사용 시점을 확인했으며 붉은 버전도 같은 두 소리를 쓴다. 음원 가공·대체 합성 없음. [출처·식별 코드·SHA·권장 큐](../../assets/source/janitor-rudebuster-audio/README.md).

공격음 개선: 기존 `wing`를 낮추고 짧게 자른 `sfx/drum_throw.mp3`(0.38초), `metalhit` 저역과 `baron_slam`을 섞은 `sfx/drum_impact.mp3`(0.40초), `furnace_blast`를 저역 중심으로 짧게 감쇠한 `sfx/drum_burst.mp3`(0.95초)를 사용한다. 동시 투척/충돌은 묶음당 한 번, 보라 폭발은 일반 충격 없이 한 번만 재생한다. 붉은 찢김은 기존 `baron_slam`·`wallclaw`를 재사용한다. 원본·정확한 가공 명령·권장 음량/간격·레벨·비교 청취본은 [자산 기록](../../assets/source/drum-devil-audio-v1/README.md)에 있다. 기존 공용 파일과 아래 사용자 지정 BGM은 변경하지 않았다.

사용자가 지정한 두 URL의 전체 오디오를 `yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2`로 가져왔다. 선택된 WebM/Opus를 MP3 q2로 변환했으며 트리밍·피치·속도·음량 가공은 없다. 제목·업로더·업로드 날짜는 yt-dlp 메타데이터로 확인했다. 웹 페이지 조회는 throttled였으며 재배포 라이선스는 확인되지 않았다(`license=NA`). 아래 자산 검사는 게임 내 큐·청취 검증과 구분한다.

| 용도·런타임 키 | 사용자 지정 출처·확인된 제목 | 전체 MP3 길이·규격 | 자산 |
| --- | --- | --- | --- |
| 청소부 구출 전 보스전 `drum_devil_battle` | [B8Us0DZgexw](https://www.youtube.com/watch?v=B8Us0DZgexw), `30. Black Knife (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`, Toby Fox, 2025-06-04 | 121.928초, 48kHz 스테레오, 2,909,612바이트 | `assets/audio/bgm/drum_devil_battle.mp3` |
| 청소부 구출·테마 `janitor_hero` | [hFYTL3mTsdo](https://www.youtube.com/watch?v=hFYTL3mTsdo), `69. Need a hand!? (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`, Toby Fox, 2025-06-04 | 51.176792초, 48kHz 스테레오, 1,155,116바이트 | `assets/audio/bgm/janitor_hero.mp3` |

두 파일 모두 `ffmpeg -v error -i <파일> -f null -` 전체 디코드 종료 코드 0. BGM은 별도 등록 목록 없이 `Sound.playBgm(key)`가 위 경로를 직접 연다. SHA-256: `drum_devil_battle.mp3` = `0012fbda979102ab8a24b6d1968e58f69f40818d938bf39d1190d63b4ad39d4c`, `janitor_hero.mp3` = `82fac24e5006cb4f524f05a0f77519c7fa08d979cb562f484a573bad28385151`.

## BUILD257 빛 드는 공터 (2026-09-20)

- `sfx/kart_missile.mp3`·`kart_booster.mp3`·`kart_banana.mp3`·`kart_waterbomb.mp3`·`kart_magnet.mp3`·`kart_waterfly.mp3`(BUILD266 다오·배찌 패턴): 유튜브 [BARkNxACQkE](https://www.youtube.com/watch?v=BARkNxACQkE) “[섭셉이subsebi]카트라이더 효과음 모음”(36초, 라벨 없음) 10구간 중 6구간을 소리 성격으로 배정(0.0~2.8 부스터 — 부스터 참고 영상과 상관 0.82 / 3.3~5.2 자석 / 5.7~10.9 미사일 / 16.2~19.8 물폭탄 / 20.1~27.0 물파리 / 27.7~29.1 바나나), loudnorm −16 LUFS. **청취 확인 없음** — 구간표 `assets/source/kartrider-v1/README.md`.
- `bgm/sakura.mp3`(203.5초, 5.0MB): 사용자 지정 [MzEHcwoNlbE](https://www.youtube.com/watch?v=MzEHcwoNlbE) “11. Garden of Hopes and Dreams (DELTARUNE Chapter 5 Soundtrack) - Toby Fox & @insaneintherainmusic”(업로더 Toby Fox, 20260624) 전체를 MP3 q2 로 변환(구간 편집·정규화 없음). 벚꽃 숲(jjajang_sakura, BUILD261) 맵 브금. 원본 wav 는 `assets/source/jjajang-sakura-v1/`(커밋하지 않음, 메타·로그만).
- `bgm/choimis.mp3`: 사용자 지정 [XGbJbxiXS0o](https://www.youtube.com/watch?v=XGbJbxiXS0o) — yt-dlp 제목 “10. Your Dad's Best Friend (DELTARUNE Chapter 5 Soundtrack) - Toby Fox”, 업로더 Toby Fox, 29초 전체를 MP3 q2. 최미스 “아시발.” 부터 “큼큼” 까지 반복.
- `bgm/gasuni.mp3`: 사용자 지정 [RQsr0_RUMJU](https://www.youtube.com/watch?v=RQsr0_RUMJU) — “Who might you be?”, Toby Fox, 64초 전체를 MP3 q2. 가순이 셋이 내려올 때부터 “ㅋㅋㅋ... 후후..” 까지.
- `sfx/choimis_chosouya.mp3`(1.7초, BUILD259 — 처음 3.0초 안에 19:51.8 부근 다른 화자(여자 목소리) 한 마디가 딸려 있어 사용자 “뒤에 여자목소리 잘라” 로 첫 발화 1.5초 뒤 0.2초 페이드로 끝냈다): 사용자 지정 [OGMmX4AvedA](https://www.youtube.com/watch?v=OGMmX4AvedA) “그 남자 그 여자의 금지된 사랑”(가재맨) 19:49.5~19:52.5 — “나 추구미 쵸소우야” 로 지정된 19:50 부근을 `--force-keyframes-at-cuts` 로 정확히 받아 소리 크기 파형(0.1초 RMS)에서 말하는 구간을 골랐다. 받아쓰기 도구가 없어 단어는 사용자 확인 필요. 원본 구간 wav 는 로컬 `assets/source/choimis-audio-v1/`(30MB 라 커밋하지 않음, 메타·로그만 커밋).
- `sfx/choimis_seup_miss.mp3`(2.7초): 사용자 지정 [X3qvIeLPkMI](https://www.youtube.com/watch?v=X3qvIeLPkMI) “최미스짜장면” 8.4~11.1초 — 조용한 들숨(스읍) 뒤 큰 소리(미스)가 있는 구간. 코 비비기 1.4초 → 손가락 총 1.3초 동작과 같은 길이.
- `voices/choimis.mp3`(0.12초): 위 쵸소우야 클립 19:50.5 부근 목소리 조각(사용자 “보이스폰트는 쵸소우야 톤으로 느낌만”). `VOICES.choimis` rate 1·level 0.85.
- 가순이 목소리는 지정 없음 → 합성 `VOICES.gasuni`(triangle 470Hz). 풀숲 흔들림은 기존 `break1` 0.5, 윙크 띠링은 기존 합성 `chime`, 가면 던짐은 기존 `whoosh`·`thud`.
- (BUILD258 정정) 위 세 클립은 처음엔 무음으로 잘려 있었다(`-ss` 를 `-i` 뒤에 두고 afade 를 걸면 시작 시각이 0 이 아니라 페이드인이 끝나지 않음) → `-ss` 를 `-i` 앞에 두고 `loudnorm` 으로 -16 LUFS. `voices/choimis.mp3` 는 델타룬 **킹**(랜서 아빠) 대사음 `snd_dadtxt`(디컴파일 154f9a9) 그대로(사용자 “델타룬의 킹 목소리로”). `voices/gasuni.mp3` 는 델타룬 `snd_txttor`(토리엘)를 asetrate 1.32배로 높인 것(사용자 “토리엘 목소리에서 톤을 높인 버전”).

## BUILD271 벚꽃 숲 5 (2026-09-20)

- `voices/dohyun.mp3`(0.05초): 델타룬 알피스 대사음 `snd_txtal`(디컴파일 154f9a9 `sounds/snd_txtal/snd_txtal`)을 1.1배 높임(사용자 “델타룬 알피스에서 톤 살짝 올린 걸로”). (BUILD272 사용자 “지지직 좀만 빼줘”) 50ms 클립에 loudnorm 을 걸면 왜곡 → lowpass 3.2kHz·4ms/10ms 페이드·볼륨 4.5 로 교체(피크 −7.7dB). `VOICES.dohyun` rate 1·level 0.85.
- `voices/domijorim.mp3`(0.11초): 청소부 `voices/janitor.mp3`(델타룬 4장 거슨 **말하는 소리** 클립, BUILD227) 기반. 처음엔 1.35배 높였으나(“많이 젊어 보이게”) 사용자 “좀 더 굵게, 낮게” → 0.92배로 낮추고 저음 +7dB(180Hz)·lowpass 2.2kHz(BUILD272). `VOICES.domijorim` rate 1·level 0.85.
- `sfx/domijorim_heumi.mp3`(1.45초, BUILD279 재절단 **1:14:45.40 부터 1.45초** — 사용자 “동영상 1초 뒤 목소린데”; 음성인식 “금이~!”(=흐미~!) 45.42~46.82, 그 위 방송 삐- 처리음이 겹쳐 있음. 사용자가 음성 파일을 직접 주기로 함 → 받으면 교체): 사용자 지정 [waFEhwjUb3c](https://www.youtube.com/watch?v=waFEhwjUb3c) “천하제일 요리대회”(가재맨) (이전 BUILD273~278: 1:14:44.50 부터 1.2초(사용자 “1:14:44쯤 흐미~ 1.N초” → “44초에 소리라고” → “45초쯤 소리라고”). 첫 절단 1:14:15 는 “어머니 전라도 오신 분”, 2차 1:14:46.8 은 뒤쪽 외침이라 폐기. 페이드아웃 0.25초, loudnorm -16 LUFS. 도미조림 “흐미!!” 두 팔 번쩍 자세·점프와 같이 난다.
- 가순이 4·5·6 목소리는 1·2·3 과 같은 `gasuni`. 벚꽃 숲 5 브금은 `sakura`, 갈림목 연출에서 끈다(“[브금 꺼지면서]”), 연출 뒤 지정 없음.
- `bgm/telling.mp3`(40.5초, 0.9MB): 사용자 지정 [CvFuMiWEryM](https://www.youtube.com/watch?v=CvFuMiWEryM) “26. I'm Telling! (DELTARUNE Chapter 5 Soundtrack) - Toby Fox”(업로더 Toby Fox) 전체를 MP3 q2(구간 편집·정규화 없음). 벚꽃 숲 5 윗길 연출(“위로 쫌 올라가면”)부터.
- `bgm/petal_dance.mp3`(92.7초, 2.4MB): 사용자 지정 [RsAu3BDaAp8](https://www.youtube.com/watch?v=RsAu3BDaAp8) “17. Petal Dance (DELTARUNE Chapter 5 Soundtrack) - Toby Fox” 전체를 MP3 q2. 도미조림·도현 전투 브금.
- 도미조림·도현 탄막 소리는 기존 `whoosh`(홍어)·`swing`/`thud`(횃불·착지)·`pop`(도현 낙하·카톡) 재사용(지정 없음).
- `bgm/stop_criminell.mp3`(45.2초, 0.96MB): 사용자 지정 [kXp2H7GbYis](https://www.youtube.com/watch?v=kXp2H7GbYis) “27. Stop, Criminell! (DELTARUNE Chapter 5 Soundtrack) - Toby Fox” 전체를 MP3 q2. 벚꽃 숲 5 승리 뒤 연출 “혹시 궁금한게 있는데…” 부터, 가순이들이 떠난 뒤 “...” 에서 끔, “허허 그럴까.” 뒤 `telling` 복귀.
- `bgm/loving_steps.mp3`(133.7초, 2.9MB): 사용자 지정 [tLAxahP5scs](https://www.youtube.com/watch?v=tLAxahP5scs) “28. Loving Steps (DELTARUNE Chapter 5 Soundtrack) - Toby Fox” 전체를 MP3 q2(구간 편집·정규화 없음). 벚꽃 숲 6 광장 연출 “헤헤” 부터(억빠맨 마지막 줄에서 끔), 벚꽃 숲 7 무대 “이 브금 다시 나오면서”(BUILD278 예정).
- `sfx/crowd_ooh.mp3`(3.5초): 사용자 지정 [myinstants “Crowd Ooh (Deltarune)”](https://www.myinstants.com/en/instant/crowd-ooh-deltarune-27719/) 전체, loudnorm I=-16(원본 `assets/source/sakura7-v1/crowd-ooh-raw.mp3`, Cloudflare 가 curl 을 막아 curl_cffi 로 받음). 벚꽃 숲 7 무대에서 가면 벗겨진 최미스가 앞모습이 되는 순간.
- `sfx/crowd_boo.mp3`(6.6초): 유튜브 [u0D718AmYTs](https://www.youtube.com/watch?v=u0D718AmYTs) “Crowd Booing - Sound Effect”(WhiteFox) 0.9~7.5초, 페이드 인 0.15/아웃 0.5, loudnorm I=-16. 벚꽃 숲 7 관객 난동 6초 + 박치기 뒤 야유(BUILD279, 사용자 “관객 야유소리는 아닌거같음” → 기존 함성 crowd_roar 대체; 내가 고른 녹음, 다른 걸 주시면 교체).
- `sfx/ak_shot.mp3`(0.42초): 유튜브 [75Yj9jNj7OA](https://www.youtube.com/watch?v=75Yj9jNj7OA) “AK47 Single Shot Natural Mid 2”(Sound Effect Library) 0~0.42초, 페이드아웃 0.1, 피크 정규화(원본 `assets/source/sakura5-v1/ak-raw.webm`). 벚꽃 숲 5 도미조림 `ak_torch` 4발 연사(BUILD281, 사용자 지정 없음 — 내가 고른 녹음, 다른 걸 주시면 교체).
- `sfx/kakao.mp3`(0.8초): 도현 카톡 말풍선 패턴의 알림음(사용자 “카톡 올 때 똑똑똑 효과음은 왜 쓴 거야” → click/knock 폐기). 유튜브 [sAcHTjAH7Co](https://www.youtube.com/watch?v=sAcHTjAH7Co) “카카오톡 사운드 모음” 7.50~8.30초 — 파형 분석에서 사람 목소리(기본 주파수 220Hz, 0.65초)로 보이는 구간 = ‘카톡!’ 알림음으로 추정, **청취 미확인**. 다른 구간이 맞으면 초를 바꾼다.
- `bgm/shop3.mp3`(75.2초, 1.0MB): 사용자 지정 [wsYUaus3RGI](https://www.youtube.com/watch?v=wsYUaus3RGI) “20. Shop 3 (DELTARUNE Chapter 5 Soundtrack) - Toby Fox” 전체를 MP3 q2(구간 편집·정규화 없음; raw 는 `assets/source/sakura12-v1/audio/`에 두고 저장소엔 안 넣음). 벚꽃 숲 12 제단 맵 브금(BUILD285) — 벚꽃 숲 11 위쪽 길에서 sakura 가 꺼진 뒤 제단 맵에서 시작.
