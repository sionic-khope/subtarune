# 최미스 플라워리 변신 오디오 — BUILD291

## 출처와 통합 이름

- 변신 BGM은 기존 `assets/audio/bgm/choimis.mp3`, 키 `choimis`를 재사용한다. 사용자 지정 [XGbJbxiXS0o](https://www.youtube.com/watch?v=XGbJbxiXS0o)와 기존 출처가 일치한다. 기존 전체 29초 음원의 내용/속도를 바꾸지 않았다. SHA256 `1eb27dedaa34155336f372809bd375adf935fef8bc7399cc4c8669724abc75c6`.
- 밤 해안 세 맵 BGM: [1kGmc1BOyPY](https://www.youtube.com/watch?v=1kGmc1BOyPY), 조회 제목 `33. Running Sky (DELTARUNE Chapter 5 Soundtrack) - Toby Fox`, 업로더 표시명 `Toby Fox`, 게시일 `20260624`, 포맷251. 원본 전체 `1kGmc1BOyPY.webm` → `assets/audio/bgm/night_coast.mp3`, 키 `night_coast`. 출력142.291896초,48kHz stereo,3,373,100바이트. 구간 편집·속도·피치·음량·페이드 변경 없음.
- 한국어 반응 음성: 사용자 지정 [T3THgeD8bpI](https://www.youtube.com/shorts/T3THgeD8bpI), `플라워리 한국어 더빙 모음 [델타룬 챕터 5]`, 업로더 `대람`, 게시일 `20260731`, 표시74초, 포맷251. 원본 `T3THgeD8bpI.webm` 및 한국어 자동자막 `.ko.vtt` 보존. 원작 성우/공식 한국어판으로 주장하지 않는다.

## 반응 클립

| 파일·SFX 키 | 원본 구간 | 내용 | PCM 길이 |
| --- | --- | --- | --- |
| `choimis_flower_wow` | 6.35–7.30s | 와 | 0.95s |
| `choimis_flower_yes` | 33.76–34.38s | 그래 | 0.62s |
| `choimis_flower_no` | 24.74–25.79s | 아니 아니 아니 | 1.05s |

모두 `assets/audio/sfx/`에 저장했다. 모노 변환·시작8ms/끝30ms 페이드·MP3 q2 인코딩 외 피치·속도·음량 변경 없음. 원본 영상의 배경음이 섞여 있다. 자막과 파형으로 구간을 선정했고 전체 디코드/비무음 확인을 통과했다. 출력 파일을 Whisper small(한국어,CPU,threads4,beam1,temperature0)로 독립 전사해 `와`/`그래!`/`아니 아니 아니`를 확인했다(`asr-*.json`). 처음 `와` 구간은 시작 음절을 놓쳤으므로6.35초부터로 넓혀 재검사했다. 전체74초 전사는 느려 중단했고 완료로 주장하지 않는다. 실제 청취·장면 내 음량은 통합 QA에서 확인한다. 발화가 끝나기 전에 다음 반응을 겹쳐 재생하지 않는다.

사용자가 예시로 요청한 `안녕하세요 형들`, `스읍 미스`, `나 섹시해`, `GAP티 입을래?`, `난 가재맨 고닉`은 이 영상의 자막에 없다. 이 클립을 해당 다섯 문장의 녹음으로 표시하거나 문장을 이어 붙여 만든 음성으로 주장하지 않는다. 새 문장 생성·성우 복제는 수행하지 않았다.

## 낮춘 대사 블립

`blip-raw.wav`는 같은 더빙의 `그래` 중33.95–34.09s,0.14초다. 원작 게임의 추출 블립이 아닌 **사용자 지정 한국어 더빙의 짧은 음절 조각**이다. `assets/audio/voices/choimis_flower.mp3`는 원본을2반음 낮추고 길이는0.14초로 유지했다. 시작6ms/끝20ms 페이드, gain4(+12.04dB),48kHz mono,MP3 q2. 검사 평균−15.9dBFS/peak−5.3dBFS로 클리핑 없음.

런타임 voice 키는 `choimis_flower`, `rate:1`을 사용한다(파일에서 이미 낮췄으므로 이중 피치 변경하지 않음). 짧은 음절의 자음/모음 성분을 쓰므로 완전한 새 발화가 아니다.

## 재현

```sh
uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' -o 'assets/source/choimis-flower291/audio/%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=1kGmc1BOyPY' 'https://www.youtube.com/shorts/T3THgeD8bpI'
ffmpeg -i assets/source/choimis-flower291/audio/1kGmc1BOyPY.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/night_coast.mp3
ffmpeg -ss 33.76 -i assets/source/choimis-flower291/audio/T3THgeD8bpI.webm -t 0.62 -map_metadata -1 -ac 1 -ar 48000 -af 'asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=0.59:d=0.03' -c:a libmp3lame -q:a 2 assets/audio/sfx/choimis_flower_yes.mp3
ffmpeg -i assets/source/choimis-flower291/audio/T3THgeD8bpI.webm -ss 33.95 -t 0.14 -map_metadata -1 -ac 1 -ar 48000 assets/source/choimis-flower291/audio/blip-raw.wav
ffmpeg -i assets/source/choimis-flower291/audio/blip-raw.wav -af 'asetrate=42763.1384707363,aresample=48000,atempo=1.1224620483,apad,atrim=duration=0.14,afade=t=in:d=0.006,afade=t=out:st=0.12:d=0.02,volume=4' -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/voices/choimis_flower.mp3
```

`wow`/`no`는 표의 시작·길이와 끝페이드 시작(길이−0.03)을 같은 추출 명령에 대입한다. 전체 디코드 검사는 `ffmpeg -v error -i <file> -f null -`로 수행했다.

## SHA256

- `1kGmc1BOyPY.webm`: `d02522faa99db8938c9e108569e3dc60420a2cc3f9b2e854506a59046a61160a`
- `T3THgeD8bpI.webm`: `b6fbd68a4a4a7749692aef818a18ff657520cadd3958dc7551a3804c99161344`
- `night_coast.mp3`: `55e120d8b65cc1bd2ba6ce0872f6094244ea27e5da72a686bcdf03a59c68b5ef`
- `choimis_flower_wow.mp3`: `692dc5fa27f815af767d30e3ecffc212bf059b2e5da871eb41e4c4976b656da5`
- `choimis_flower_yes.mp3`: `f5ea681f00d85af924b42a5ee9ac6d3be766c420e1752386f116b9649256362b`
- `choimis_flower_no.mp3`: `4e3b005380dbb0b7ea525dda5530bb6172ab3da68584a87909f10fd6af9bb291`
- `blip-raw.wav`: `3085f6ce7064200b5e504d0c72f11c257dd766b49ac6a7139170994c0f6d144f`
- voice `choimis_flower.mp3`: `6167e2a80c6b1aa5792307422d6807bcbd52ea05d893e296a12470aab79f539c`

원음 권리는 각 권리자에게 있으며 출처 기록이 별도 이용허락 확인을 뜻하지 않는다.
