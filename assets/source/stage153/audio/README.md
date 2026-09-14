# 편집노조 스테이지 오디오 · BUILD153

## 지정 BGM

- 사용자 URL: https://www.youtube.com/watch?v=j69knNADinw&list=PLKXdyINOQYsaHwm4rJ0QDFzsaZQNQjF0U&index=3
- 확인한 ID: `j69knNADinw`; 메타데이터 제목: `03. And Now For Today’s Sponsors…! (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`; 업로더 표시명 `Toby Fox`; 채널 `UC26hbdeqyPRl7VsnK1UhFPw`; 업로드 날짜 `20250604`; 표시 길이35초.
- 웹 열기는 throttled였고, yt-dlp의 YouTube 전용 추출기로 위 메타데이터와 포맷251을 확인했다. 표시명은 메타데이터 기록이며 권리자·공식 채널 여부를 별도로 인증했다는 뜻이 아니다.
- 실행 파일: `assets/audio/bgm/editor_union_stage.mp3`,48kHz stereo,34.922813초,791732바이트. 평균−13.6dBFS/peak−0.1dBFS.
- 전체 음원에서 트리밍·피치·속도·페이드·음량 변경 없이 MP3 품질2로 변환했다. 장면 시작 전 미리 로드하고, 최초 인사에서0초부터 재생한다. 맵 진입 시에는 무음이다.
- 원본 WebM SHA256: `170e6f65c104d78ec67b944c522646605b7286000fd5434520bfe16b3a9e2e8d`.
- 실행 MP3 SHA256: `c33664f43c937e13d0ae5b7635e893d41489ab0d741764dc8f648cf222007600`.
- 원본과 전체 YouTube 메타데이터는 임시 `/tmp/subtarune-stage153-audio.S5Biuz/`에만 보관한다. 만료 미디어 URL 등은 배포하지 않는다.

```sh
python3 -m yt_dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-stage153-audio.S5Biuz/stage-source.%(ext)s' 'https://www.youtube.com/watch?v=j69knNADinw'
ffmpeg -hide_banner -loglevel error -i /tmp/subtarune-stage153-audio.S5Biuz/stage-source.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/editor_union_stage.mp3
```

## 작은 마리오 점프

- 출처 페이지: https://themushroomkingdom.net/media/smb/wav
- 페이지에 `Super Mario Bros. (NES)`, `Jump (small)`, 제공자 `Deezer`로 표시된 실제 게임 효과음이다. Nintendo 공식 다운로드 페이지가 아닌 팬 보관본이다.
- 원본: https://themushroomkingdom.net/sounds/wav/smb/smb_jump-small.wav
- 보존 파일: `smb_jump-small.wav`,26982바이트,0.590113초; SHA256 `9a1c26efa3447fbcbe0f1892d0569e0dded82dd3ff107e72d66d04c5753d6e51`.
- 실행 파일: `assets/audio/sfx/mario_jump.mp3`,44.1kHz mono,0.590113초,7814바이트; 평균−21.9dBFS/peak−10.9dBFS; SHA256 `7ca9085e6b5251d20eb32b1c0e60f20976021e4599ab6d35c0c147bd86783fc8`.
- 전체 길이를 MP3로 변환했으며 피치·속도·볼륨·앞뒤 자르기 없이 보존했다. 기존 `jump`는 DELTARUNE 점프라 변경하지 않았다. `mario_jump`를 SFX 사전 로드 목록에 추가하고 마리오 점프 시작마다 한 번만 재생한다.

```sh
curl --fail --location 'https://themushroomkingdom.net/sounds/wav/smb/smb_jump-small.wav' --output assets/source/stage153/audio/smb_jump-small.wav
ffmpeg -hide_banner -loglevel error -i assets/source/stage153/audio/smb_jump-small.wav -map_metadata -1 -ac 1 -ar 44100 -c:a libmp3lame -q:a 2 assets/audio/sfx/mario_jump.mp3
```

## 편/집/노/조 강조음

`assets/audio/sfx/editor_union_bam.mp3`는 기존 합성 `fanfare`의0.90~1.32초 화음과 기존 `baron_slam`의 앞0.42초를 각각0.65/0.55게인으로 섞은 짧은 ‘빰’이다. 새 외부 음원이나 새로운 합성 곡을 쓰지 않고 기존 두 자산을 오프라인 가공했다.0.7초마다 한 번 울려도 꼬리가 다음 글자를 덮지 않도록0.42초로 마감한다.44.1kHz mono,5021바이트,평균−18.5dBFS/peak−6.5dBFS.

- `editor_union_bam.mp3` SHA256: `c793d2e50a96209ecc1664ce892def786ff51a2b6c77fade6e832c88a726eabf`.
- 원본 `fanfare.mp3` SHA256: `7d69b75931c16ade8c570672f21b3fbb56c200103e86ff1529f68d2b1a103415`.
- 원본 `baron_slam.mp3` SHA256: `3c530c584980b054d861a46c5767420ea9ab1830ca5f35a07dc49381cb5a9b1e`.
- 기존 파일은 변경하지 않았으며 새 키를 SFX 사전 로드에 등록한다.

```sh
ffmpeg -hide_banner -loglevel error -i assets/audio/sfx/fanfare.mp3 -i assets/audio/sfx/baron_slam.mp3 -filter_complex '[0:a]atrim=start=0.9:duration=0.42,asetpts=PTS-STARTPTS,volume=0.65,afade=t=in:d=0.003,afade=t=out:st=0.18:d=0.24[chord];[1:a]atrim=duration=0.42,asetpts=PTS-STARTPTS,volume=0.55,afade=t=out:st=0.18:d=0.24[hit];[chord][hit]amix=inputs=2:normalize=0,alimiter=limit=0.8:level=false[out]' -map '[out]' -t 0.42 -ac 1 -ar 44100 -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/editor_union_bam.mp3
```

## 기존 자산 재사용

| 장면 | 키 | 권장 장면별 volume |
|---|---|---|
| 스포트라이트 철컥 | `plug` |0.8|
| 삼인방 느낌표 | `chime` |0.8, 동시에 한 번|
| 파크 착지·대화창 날리기 | `explosion` |0.65|
| 비데 도끼 착지 | `baron_slam` |0.8|
| 뚜울라 흙 파고 튀어나오기 | `scrape` 뒤 `thud` |0.65/0.6|
| 관중 공개·노조 소개·인사 | `maillard_applause` |0.65|
| 편/집/노/조 강조 | `editor_union_bam` |0.85,0.7초 간격으로 각 한 번|
| 마리오 작은 점프 | `mario_jump` |0.9|
| 버섯 전체 회복 | `heal` |0.75|

강조음의 별도 오프라인 가공본 외 기존 파일은 복사·개명·재합성하지 않는다. 위 값은 런타임 통합 권장치이며 실제 장면의 확정 호출과 별개다. 공용 파일과 다른 전투 음량은 유지한다. 각각의 기존 출처는 `design/audio/references.md`에 있다.

## 목소리

`warm_bidet`(굵은 원본 비음)는148파일·프리셋 그대로 사용한다. 실제 인형탈 형태의 파크에 본체의 굵은 `park_guardian` 목소리를 쓰지 않는다.

후속 사용자 ‘파크가디언 인형탈 목소리 악질맨 목소리마냥 게인도 좀’ 요청은 기존 공주풍 파일·410→450Hz 음높이·0.16초 길이를 보존하고 **인형탈 프리셋에만** 부드러운 드라이브를 더했다. 악질맨은 원본 게임 블립에140~2800Hz 대역 제한을 걸었지만, 인형탈에 그 저음/라디오 대역을 그대로 적용하면 공주풍 정체성이 바뀌므로 음높이·필터는 유지한다. `VOICES.park_guardian_costume.drive=2.1`, `driveLevel=0.64`이며 디코드 직후 각 PCM표본에 `0.64 * tanh(2.1 * sample)`을 **한 번만** 적용한다. 저진폭은 조금 더 커지고 높은 봉우리는 부드럽게 눌려 가벼운 거친 질감이 붙는다. 매 글자마다 재가공하거나 누적 드라이브하지 않는다. 파일 바이트와 rate1/level0.85/cut:false/minGap0.18은 그대로다.

실제 MP3를 디코드하여 위 `Sound._decodeVoices()` 경로로 측정한7056표본: 평균−17.565→−15.484dBFS(**+2.081dB**), peak−11.046→−9.408dBFS, 클리핑0→0, 표본 부호 변화0. 런타임level0.85 적용 뒤 peak는 약−10.82dBFS다. 비데·파크 본체·악질맨 및 다른 모든 프리셋에는 drive가 없어 파형을 변경하지 않는다.148원본/미리듣기는 원본 비교용으로 유지된다. 주관적 음색 평가는 실제 사용자의 청취와 구분한다.

`ttuulla`는150에 준비한 macOS Eddy 한국어 ‘히히’0.18초를 그대로 등록했다. `VOICES.ttuulla`는 rate1,level0.85,cut:false,minGap0.20으로 전체 발음을 재생한다. 표시 화자 `뚜울라알라`도 voice는`ttuulla`다. Jerry 배우 음성이나 실제 인물의 목소리 복제가 아니다. 원본·필터·해시는 `assets/source/ttuulla150/audio/manifest.json`이 기준이다.

모든 새 실행 음원은 ffprobe 및 ffmpeg 전체 디코드로 검증한다. 이는 실제 장면 재생과 주관적 청취 평가를 대신하지 않는다. 음원 권리는 원 권리자에게 있으며 출처 표기가 별도 이용허락을 뜻하지 않는다.
