# 전함 침공305 음원

2026-09-23 사용자 지정 BGM과 사진·일행 주먹 들기 효과음. 합성으로 원작 소리를 흉내 내지 않고 지정 영상과 실제 게임 음원을 사용한다.

## 출처와 식별

- BGM: https://www.youtube.com/watch?v=z2IT2YzscSE — `66. Crumbling Tower (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`. yt-dlp 메타데이터 업로더 `Toby Fox`, 채널 `UC26hbdeqyPRl7VsnK1UhFPw`, 업로드20250604, 표시174초, 오디오 포맷251. 원본 영상 설명의 권리 안내: https://materiamusicpub.com/youtube-faq/ . 조회 메타데이터는 별도 이용허락 확인이 아니다.
- 효과음 보관 저장소: [TeamBlossomDevs/DeltaruneDecomp_beta](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/tree/154f9a97b8f18fa6974e917c4c4e774bde6b7eba), 고정 커밋 `154f9a97b8f18fa6974e917c4c4e774bde6b7eba`. 게임 자산을 포함한 커뮤니티 디컴파일 자료이며 공식 배급사의 다운로드/라이선스 허가 사이트가 아니다.
- `snd_camera_flash.wav`: 위 커밋 `sounds/snd_camera_flash/snd_camera_flash`. [사진 촬영 이벤트](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/objects/obj_ch2_scene21_loop/Step_0.gml#L764-L778)가 흰 플래시와 `snd_camera_flash`를 함께 사용하며 뒤 대사는 사진 촬영을 직접 언급한다.
- `snd_grab.wav`: 위 커밋 `sounds/snd_grab/snd_grab`. [크리스 소파 소울 제거](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/objects/obj_ch2_scene32/Step_0.gml#L503-L544)의 `spr_cutscene_32_kris_couch_soul_cushion` 동작, imageindex15에서 실제 재생된다. [욕실 소울 제거](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/objects/obj_ch2_scene31/Step_0.gml#L80-L123)에도 사용된다. 새 장면의 주먹 들기에는 이 원음 하나를 사용한다.
- 빠른 이동음은 기존 `assets/audio/sfx/wing.mp3`를 그대로 재사용한다. 원본 `snd_wing`과 출처는 `assets/source/subrio169/audio/snd_wing.wav` 및 `design/audio/references.md`의 섭리오169 기록에 있다.

## 런타임 계약·검증

| 키 | 길이 | 포맷 | 바이트 | float peak / RMS |
| --- | --- | --- | --- | --- |
| `ship_invasion` |173.592979초|48kHz stereo MP3|3484724|−0.411850 / −16.473660dBFS|
| `photo_shutter` |0.780000초|44.1kHz mono MP3|11257|−0.950879 / −20.695842dBFS|
| `soul_grab` |0.857143초|44.1kHz stereo MP3|15275|−2.875457 / −18.561884dBFS|

BGM은 거대 가재맨 성 낙하·전함 분단 시작에서0초부터 재생한다. 파일 전체를 보존했으며 트리밍·피치·속도·페이드 변경이 없다. 무가공 MP3 인코딩의 float peak가+0.112035dBFS여서 BGM에−0.5dB만 적용했다. 셔터는 무가공 MP3 float peak+0.668854dBFS여서−1.2dB를 적용했다. `soul_grab`에는 볼륨 변경이 없다. 세 파일 모두 전체 디코드 성공, 비무음, peak<0dBFS, NaN/Inf0을 확인했다. 이 검사는 사람의 주관적 청취 또는 실제 장면 큐 검수를 대신하지 않는다.

별도 음악 레지스트리는 없다. `Sound.preloadBgm('ship_invasion')`/`playBgm`은 파일 이름으로 읽는다. `photo_shutter`/`soul_grab`은 장면 진입의 `loadSfxFiles`에서 미리 읽고 실제 플래시/주먹 들기 순간 한 번 재생한다. 큐 통합은 장면 담당이 소유하며 본 자산 취득 작업은 `src/main.js`나 엔진 파일을 수정하지 않았다.

## 재현

```sh
python3 -m yt_dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-ship305-bgm.%(ext)s' 'https://www.youtube.com/watch?v=z2IT2YzscSE'
ffmpeg -i /tmp/subtarune-ship305-bgm.webm -map_metadata -1 -af volume=-0.5dB -c:a libmp3lame -q:a 2 assets/audio/bgm/ship_invasion.mp3
ffmpeg -i assets/source/ship-invasion305-audio/snd_camera_flash.wav -map_metadata -1 -af volume=-1.2dB -c:a libmp3lame -q:a 2 assets/audio/sfx/photo_shutter.mp3
ffmpeg -i assets/source/ship-invasion305-audio/snd_grab.wav -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/soul_grab.mp3
```

다운로드한 전체 BGM 원본과 전체 메타데이터는 `/tmp/subtarune-ship305-bgm.webm`·`.info.json`에 있고 배포에는 MP3만 포함한다. 작은 원본 효과음 두 개는 이 디렉터리에 보존한다.

## SHA256

| 파일 | SHA256 |
| --- | --- |
| `assets/audio/bgm/ship_invasion.mp3` |`e97d0084212b3ec3c49f0b40b89c7b7bca31cbea7b91e363bb8e7a2efa013c9a`|
| `assets/audio/sfx/photo_shutter.mp3` |`97deb28807c96568bc281a5aadb66d8784ff64b012ff838919d9ee103cdc27e9`|
| `assets/audio/sfx/soul_grab.mp3` |`085e165095962b21017e6ddbd52ec2a807b6f62b9213a7626fb1aee6b39ebcf9`|
| `snd_camera_flash.wav` |`ff99751150117db1efb71acb511fced3323f3c592971687503a9c59d3bfb9bbf`|
| `snd_grab.wav` |`e405c651b394e289bf5cf58bce0ef3ead74942a37ce09355c2025abf77b80285`|
| BGM source WebM |`bef2ea1d3f8c15651e0af24c12ebb970d606d29abc4d7b960b38560b08a71044`|
