# 최미스 하늘 전투 BGM — BUILD294

## 사용자 지정 원본과 런타임 출력

- 요청 URL: <https://www.youtube.com/watch?v=GWf9_qSrnOM>
- 단일 영상 ID: `GWf9_qSrnOM` (플레이리스트는 받지 않음)
- yt-dlp 메타데이터 제목: `34. Flower Man (DELTARUNE Chapter 5 Soundtrack) - Toby Fox & @Cametek.CamelliaOfficial`
- 업로더: `Toby Fox`; 업로드 날짜: `20260624`; 표시 길이: 192초
- 보존 원본: `GWf9_qSrnOM.webm` (format 251, Opus, 48kHz stereo, 192.061000초, 2,971,240바이트)
- 보존 메타데이터: `GWf9_qSrnOM.info.json`
- 런타임 파일/키: `assets/audio/bgm/choimis_battle.mp3` / `choimis_battle`
- 런타임 형식: MP3 q2, 48kHz stereo, 192.040646초, 4,726,316바이트

## 취득·처리·음량 확인 루프

원곡 전체를 그대로 재생해야 하므로 구간 자르기, 페이드, 피치/속도 변경 및 `loudnorm` 같은 음량 정규화는 하지 않았다. 이 경우의 음량 확인 루프는 출력 파일을 다시 전체 디코드해 유효성을 확인하고, 장면 음량은 런타임 `playBgm`의 설정값으로만 조절하는 것이다. 즉 소스 PCM 레벨을 바꿔 원곡을 근사본으로 만들지 않는다.

```sh
uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o 'assets/source/choimis-sky294/audio/%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=GWf9_qSrnOM'
ffmpeg -v error -i assets/source/choimis-sky294/audio/GWf9_qSrnOM.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/choimis_battle.mp3
ffmpeg -v error -i assets/audio/bgm/choimis_battle.mp3 -f null -
ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels -of json assets/audio/bgm/choimis_battle.mp3
shasum -a 256 assets/source/choimis-sky294/audio/GWf9_qSrnOM.webm assets/audio/bgm/choimis_battle.mp3
```

전체 디코드 오류 0개·종료 코드 0을 확인했다. 런타임은 `Sound.playBgm('choimis_battle')`가 파일명을 직접 해석하므로 별도 BGM 목록 등록은 없다. 전투 진입 시 큐·루프·실제 청취는 장면/전투 통합 QA의 별도 책임이다.

## 사용자 지정 가사 타이밍 (BUILD294)

가사는 원곡 가사가 아닌 사용자 지정 텍스트다. `src/data/choimis-lyrics.js`의 `CHOIMIS_LYRICS`는 렌더러가 `game.sound.bgm.currentTime`에만 대조할 `{ start, end, text, chars }` 배열이다. 벽시계·대화 글자 속도·전투 프레임 시간은 기준으로 쓰지 않는다.

`tools/rhythm/chart.py`를 원본 전체에 `--player melody --no-video --min-gap 0.10 --max-per-sec 7 --mel-delta 0.45 --soft-delta 0.20`으로 실행해, 음악적 어택 후보 942개를 `choimis_battle_onsets.json`에 보존했다. 160.0 BPM, 첫 박0.184초, 10초 창 격자 드리프트 최대1.5ms라는 측정값은 후보 정렬용이며, 가사 큐는 균일 글자 속도가 아니라 그 후보 중 실제 어택을 골라 배치했다.

`오늘도 스읍 미스`의 보이는 음절은 44.809/44.996/45.128/45.278/45.465/45.746초 어택에 맞춘다. 두 공백은 앞 음절과 같은 시각을 공유한다. 마지막 `스`의45.996초는45.746초의 마지막 측정 어택과46.121초 후렴 어택 사이에 사람이 정한 보간점이며, 후렴이 시작되기 전 125ms 이상 보이게 한다. 이 한 보간점은 자동 온셋으로 검증된 음절이라고 주장하지 않는다; 반복도 같은 규칙으로165.996초에 둔다.

- 첫 패스의 QA 비트마크: 24.090, 27.184, 30.184, 33.184, 36.184, 39.184, 42.184, 44.809, 46.121, 52.215, 58.121, 64.215, 71.246초.
- 반복 패스의 QA 비트마크: 144.184, 147.184, 150.184, 153.184, 156.184, 159.184, 162.184, 164.809, 166.121, 172.215, 178.121, 184.215, 191.246초. 첫 반복의 강한 어택은144.184초라서 첫 패스의24.090초 후보보다94ms 늦게 잡힌다. 이후 바·후렴 경계는 +120초로 반복된다.
- `spectrum-023_071.png`와 `spectrum-143_191.png`는 각 가사 구간의 스펙트럼 이미지다. 직접 확인해 46.121/166.121초의 후렴 진입 앞 저에너지 간격과 반복 구조를 대조했다.

재생 피드백에 따라 `최미스! 최미스!` 문구의 **컨테이너**는46.121/166.121초에서 유지하되, 첫 단어의 한글은46.496→46.835→47.153초, 둘째 단어는48.184→48.559→48.934초의 측정 가락 어택에 맞췄다(반복은 각+120초). `!`와 공백은 직전 글자 어택을 공유한다. 46.121/166.121초는 후렴 직전의 짧은 어택으로 보이며, 자동 차트의 강한 구간도46.4/166.02초에서 시작한다. 따라서 전체 BGM·앞 절·후속 문구는 밀지 않았다. 이 판단은 `karaoke-timing.json`의 `targetedChantAdjustment`에 기록했으며, 원본 보컬의 의미론적 음절과 완벽히 일치한다고 주장하지 않는다.

자동 온셋은 악기와 가락이 섞인 어택 후보일 뿐 의미론적 음절을 보장하지 않는다. 이 환경에서 청취 가능한 오디오 출력을 캡처하지 못했으므로 주관적 노래-가사 동기화 합격을 주장하지 않는다. 통합 QA는 실제 BGM 재생 중 위 비트마크에서 텍스트/글자 채움이 진행되는지만 확인한다. 새 음성 생성·ASR·유료 API 호출은 하지 않았다.

## 해시와 비용

- `GWf9_qSrnOM.webm`: `1ae9d88a3916524b5400b33040d43f0b2e243e6bf92c49abea3fbd75130b7da3`
- `choimis_battle.mp3`: `a767c3a326bd8cdeaab3677c1813f9cf37036010bd6c19490a76a7bf24c72df3`
- 취득은 공개 URL의 `yt-dlp`와 로컬 `ffmpeg`만 사용했다. 유료 API 호출·외부 API 비용은 0이다.

원곡 권리는 각 권리자에게 있으며, 출처 기록은 별도 이용허락 확인을 뜻하지 않는다.
