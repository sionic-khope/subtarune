# 최미스 한국어 참조 음성 합성 — BUILD292 작업 기록

사용자가 지정한 한국어 더빙 `https://www.youtube.com/shorts/T3THgeD8bpI`의 음색을 참조하여 새 한국어 문장을 합성하는 로컬 실험이다. 원본 클립을 새 문장의 녹음으로 표시하지 않는다.

## 참조

- `reference-reactions.wav`: 기존 원본 추출 `choimis_flower_wow.mp3`(6.35–7.30초), `choimis_flower_no.mp3`(24.74–25.79초), `choimis_flower_yes.mp3`(33.76–34.38초)를 이 순서로 연결하고 끝에 0.5초 무음을 추가했다. 24kHz mono. 피치 변경 없음.
- 참조 전사: `와. 아니 아니 아니. 그래.` 각 클립의 기존 Whisper small 독립 전사 JSON은 `../choimis-flower291/audio/asr-{wow,no,yes}.json`이다.
- `reference.wav`: 33.70–37.80초 연속 구간 후보. 자동 전사가 불확실하여 합성에는 사용하지 않았다.
- 원본 배경음은 분리하지 않았다. 음색 동일성이나 청취 검수 완료를 주장하지 않는다.

## 도구와 상태

- OpenGateway의 인증된 모델 목록은 92개이며 사용 가능한 음성 생성 모델을 찾지 못했다. 이 조사에서는 모델 목록 GET만 사용했다.
- 로컬 실행: `mlx-audio` 0.5.5, `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-4bit`. 약 2.33GB 모델·음성 토크나이저를 다운로드했다. 격리된 uv 캐시 환경을 사용하며 시스템 패키지를 변경하지 않는다.
- 문서: <https://github.com/QwenLM/Qwen3-TTS>, <https://github.com/Blaizzy/mlx-audio/blob/main/docs/models/tts/qwen3-tts.md>.
- 비용: 유료 API 호출 없음. 참조 파일 외부 업로드 없음.
- 모델 스냅샷: `37e955a1deb861c088ae5f3a67043185f3d1a60c`. Base 모델의 `ref_audio` + `ref_text` ICL 경로를 사용했다. 프리셋 화자, 피치 변조, 속도 변경을 사용하지 않았다.
- 첫 인사 생성: 58.08초, peak memory 4.78GB. 같은 모델을 한 번 로드하여 나머지를 생성한 배치의 peak memory 5.77GB. 이후 문장 생성은 약 5–8초였다. 첫 패키지 import 지연 후 캐시 환경에서 오프라인 재실행했다.

## 선택된 실제 합성 파일 — 에코 적용 전

아래 표는 에코 적용 전 파일이다. 원형을 `dry/choimis_flower_<이름>.mp3`에 보존했다. 모두48kHz mono, libmp3lame q2이며, 길이는 MP3 전체를 디코드한 샘플 수 /48000으로 검증했다. 에코 적용 후 실제 실행 파일은 아래 별도 표를 따른다.

| 이름 | 합성 입력 | 선택된 원본 WAV | 초 | 전사 결과 | 평균 / peak dBFS |
| --- | --- | --- | ---: | --- | --- |
| hello | 안녕하세요 형들. | greeting_000.wav | 1.120 | 안녕하세요 형들! | −18.3 / −4.0 |
| seup | 스읍 미스. | seup_000.wav | 1.600 | 습, 미스 | −19.9 / −3.0 |
| sexy | 나 섹시해. | sexy_000.wav | 2.480 | 나 섹시해 | −20.4 / −2.5 |
| gap | 갭티 입을래? | gap_000.wav | 1.360 | 캡티 입을래? | −18.9 / −3.3 |
| gonik | 난 가재맨 고닉! | gonik_v2_000.wav | 1.680 | 난 가재맨 고닉 | −24.8 / −2.0 |

전사는 로컬 `Systran/faster-whisper-small`, CPU int8, threads4, 한국어, beam5, condition_on_previous_text=false로 수행했으며 정답 유도 initial_prompt를 사용하지 않았다. 인사·섹시해·고닉은 단어가 일치한다. `스읍`의 들숨 표현과 `갭티/캡티`의 첫 자음은 자동 전사만으로 정확하다고 판정하지 않는다. 이 실행 환경에서 오디오 입력을 직접 들을 수 없으므로 **주관적 음색 유사성, 성우 동일성, 발음 청취 합격을 주장하지 않는다**. 모든 대사는 새 합성 파일이며 원본 영상의 기존 대사를 대신 재생한 결과가 아니다.

음량 처리: hello +10dB, seup/sexy +8dB, gap +10.5dB. gonik는 `loudnorm=I=-20:TP=-2:LRA=7`이며 높은 순간 peak 때문에 실제 출력 integrated loudness −23.32 LUFS다. 모두 시작5ms/끝20ms 페이드. gonik는 다른 파일보다 평균 음량이 낮으므로 실제 장면 청취 시 확인한다. 기존 킹 블립이나 `그래` 음절 블립을 이 출력에 섞지 않았다.

## 비교 후 선택하지 않은 후보

| 파일 | 입력 / temperature | 전사 결과 | 처리 |
| --- | --- | --- | --- |
| seup_v2_000.wav | 스읍, 미스. / 0.4 | 수, 미, 수? | 첫 후보가 더 가까워 제외 |
| gap_v2_000.wav | 갭 티 입을래? / 0.4 | 캡티 입을래? | 첫 자음 검증 개선이 없어 첫 후보 유지 |
| gonik_000.wav | 난 가재맨 고닉. / 0.6 | 난 가재맨 코닉 | 단어가 일치한 v2로 교체 |

선택한 hello/seup/sexy/gap temperature는0.6, gonik_v2는0.4다. max_tokens150, language Korean, speed1.0. 임의 seed를 고정하지 않았으므로 같은 명령이 같은 파형을 보장하지 않는다. 후보 WAV는 비교와 추적을 위해 보존했다.

## 재현 명령 예

저장소 루트에서 다음 CLI를 실행한다. 최초 설치는 격리 uv 캐시를 사용하며 모델 다운로드가 필요하다. 나머지 문장은 위 표의 합성 입력·이름·temperature를 대입한다.

```sh
uv run --with mlx-audio==0.5.5 python -m mlx_audio.tts.generate \
  --model mlx-community/Qwen3-TTS-12Hz-1.7B-Base-4bit \
  --text '안녕하세요 형들.' --lang_code Korean \
  --ref_audio assets/source/choimis-voice292/reference-reactions.wav \
  --ref_text '와. 아니 아니 아니. 그래.' \
  --max_tokens 150 --temperature 0.6 \
  --output_path assets/source/choimis-voice292 --file_prefix greeting
```

## 사용자 추가 요청: 다섯 음성에 짧은 에코

2026-09-22 사용자 “각각의 음성에 에코사운드 이펙트도 주고 플라워리마냥” 요청을 반영했다. 건조 음성이 중심에 남도록 모노 원음에85ms/170ms의 두 번의 작은 반사를 추가했다. ffmpeg 내장 `aecho`의 in_gain0.9, out_gain0.9, decays0.16/0.07을 사용한다. 피치·재생 속도·대사 내용을 변경하지 않았다. 새로운 대사 합성이나 원본 블립 수정은 없다.

```sh
ffmpeg -y -v error \
  -i assets/source/choimis-voice292/dry/choimis_flower_hello.mp3 \
  -af 'aecho=0.9:0.9:85|170:0.16|0.07' \
  -ar 48000 -ac 1 -map_metadata -1 -c:a libmp3lame -q:a 2 \
  assets/audio/sfx/choimis_flower_hello.mp3
```

나머지 네 파일도 파일 이름만 바꾸어 같은 필터를 적용했다. `ffmpeg -h filter=aecho`에서 설치된 필터 인자와 범위를 확인했다. 모든 최종 파일은 전체 디코드 성공·비무음·클리핑 없음으로 확인했다. 종전 건조 파일과 정확히0.170초(8160샘플) 차이가 난다. 전사 결과는 건조 파일 기준이며 에코 후 새 전사는 실시하지 않았다. 실제 음색·잔향의 주관적 청취는 이 환경에서 확인할 수 없으므로 합격을 주장하지 않는다.

| 실행 SFX 이름 | 최종 초 | 디코드 샘플 수 | 평균 / peak dBFS |
| --- | ---: | ---: | --- |
| choimis_flower_hello | 1.290 | 61920 | −20.6 / −5.8 |
| choimis_flower_seup | 1.770 | 84960 | −22.0 / −4.8 |
| choimis_flower_sexy | 2.650 | 127200 | −22.4 / −4.3 |
| choimis_flower_gap | 1.530 | 73440 | −21.1 / −5.0 |
| choimis_flower_gonik | 1.850 | 88800 | −26.9 / −3.9 |

장면 담당자에게 위 최종 길이를 전달했다. gonik는 건조 파일부터 평균 음량이 상대적으로 낮았으며 에코에서도 같은 특성을 유지한다.

## 최종 에코 MP3 SHA256

- hello: `7eb54917ed83a9a666d25a7163ee0ba129460e91dd2fd5584e464d8c36010901`
- seup: `b48cf0730c6e0e39471246ba6c8aadfc98c501471317894a6dc695dd935ab369`
- sexy: `627de2ccbfb4161227e0987bb0a5f3a2c978478d8c1fbfcb09163959125d50cf`
- gap: `4ba8b82fea0d61b47497f5f15e015551253ccd610f35baa14933f40b58ad7300`
- gonik: `a64727b6c722728413b554d19344a6134f9b65e25a1ead5c2d6c21f7078317b4`

## 보존된 건조 MP3 SHA256

- hello: `d34a2c045e00ea77f189f9586008afd7c7bde2655ed6968ba85c4d3b18e3340d`
- seup: `33c63901cc9fa8d0ae56beb21fb9bbe82e6a0754f9fbb17eafc9b0bf49c0096f`
- sexy: `631079a97063efe7d1887004809259a8c552b4a92ee928801e8251a32e96d821`
- gap: `f4acee54a8075f55121c7dde5580c25c9a30b28e9e5d6e9ce108737071466ac1`
- gonik: `2cb54049696bc13f2fd3c1b2ee9aac91a65d1ad49d874d00aa761ed3cb389822`
