# 마녀재판 반론 음성 (BUILD156)

사용자가 요청한 에마의 짧은 반론 원음을 게임 녹화에서 가져왔다. 새 목소리 합성이나 성우 모사는 없다.

- 출처: https://www.youtube.com/watch?v=eBt4Agp85HE&t=5s
- 영상 ID: `eBt4Agp85HE`
- 제목: `【魔法少女ノ魔女裁判】裁判パートカットイン演出ボイス集（ネタバレ注意）`
- 업로더 표시명: `マークGames`, 게시일: 2025-11-15, 표시 길이: 224초.
- 게임: 魔法少女ノ魔女裁判, 에마(桜羽エマ). 공식 업로더가 아닌 게임 녹화다. 출처 기록은 공식 이용허락이나 재배포 허가의 확인이 아니다.
- 공식 Steam 1.1.0 공지(2025-11-14)에 컷인 보이스 추가가 기록되어 있다: https://steamcommunity.com/app/3101040/announcements/?l=japanese

## 범위와 검증

포맷251 중 **영상 5.00–11.00초, 6초만** 구간 다운로드했다. 전체 영상/음원을 저장하지 않았다. `--force-keyframes-at-cuts`가 오디오를 Opus 96kbps로 다시 인코딩한 확인용 구간이 `objection-context-05-11.webm`이다.

일본어 YouTube 자동자막은 7.319초부터 `それはおかしいよ。`를 기록했다. 로컬 faster-whisper small, CPU int8, language ja, beam_size 5, word_timestamps true 분석은 확인 구간 **2.10–3.42초**(영상 7.10–8.42초)를 같은 대사로 식별했다. 뒤의 일반 대사는 구간 5.32초부터 시작했다. 파형을 함께 확인하고 실제 배포 샘플은 구간 **2.04–3.42초**, 즉 **영상 7.04–8.42초**로 잘랐다. 잘라낸 샘플의 별도 전사도 `それはおかしいよ!`만 반환했다.

음성 분리를 하지 않았으므로 원 녹화의 배경 음악/효과음 성분은 남는다. 뒤의 유리 깨짐을 깨끗하게 분리했다는 근거가 없어 별도 원작 glass 파일은 만들지 않았다. 아래의 새 오리지널 유리 깨짐 효과음을 별도로 사용한다. 파형·자동전사·디코드 검증이며 사람의 청취나 주관적 음색 검수 완료를 뜻하지 않는다.

## 실행 자산

`assets/audio/sfx/park_trial_objection.mp3`: **1.380000초, 48kHz stereo, 29,732바이트**. 음높이·속도 변경 없음. 시작 8ms/끝 25ms 페이드와 gain 2배(+6.02dB)만 적용하여 컷 경계와 작은 원본 음량을 보정했다. ffmpeg 전체 디코드 성공, 평균 **−19.9dBFS**, peak **−3.8dBFS**. 무음/클리핑 없음. 런타임 `Sound.sfx('park_trial_objection', 1)`과 파일 사전 로딩 등록은 전투 구현 측에서 연결한다.

- 실행 MP3 SHA256: `167803df42c1e7635198f4f968e382b070a8d777dd95bfde94d3f8921e270f1b`
- 6초 확인 구간 SHA256: `8b228f4d00a9347ea80d37cf862bdbfee7577c59753bcb5ca72a413aca03c94b`

## 재현

```sh
uvx yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --download-sections '*5-11' --force-keyframes-at-cuts -o 'assets/source/park156/audio/objection-context-05-11.%(ext)s' 'https://www.youtube.com/watch?v=eBt4Agp85HE'
ffmpeg -hide_banner -loglevel error -ss 2.04 -i assets/source/park156/audio/objection-context-05-11.webm -t 1.38 -af 'afade=t=in:d=0.008,afade=t=out:st=1.355:d=0.025,volume=2' -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/park_trial_objection.mp3
```

## 유리 깨짐: 새 오리지널 효과음

기존 프로젝트에 실제 `glass`/`shatter` 자산이 없어 `park_trial_shatter.mp3`를 새로 합성했다. **마녀재판 원본 효과음이 아니며 외부 샘플/음성/목소리 모사를 사용하지 않는다.**

재현: `node assets/source/park156/audio/synthesize-shatter.mjs`. 고정 시드156031의 짧은 고역 노이즈 충격과27개의 비정수 배음 유리 파편 접촉음을0–0.495초에 분산하고, 각 파편을23–91ms로 감쇠한다. 마지막40ms페이드,1000Hz하이패스로 저음 충격을 배제했다. 가장 낮은 링 기본주파수는1450Hz이며 배음비는1/1.417/2.073이다. 한 번의 쨍그랑 뒤 작은 파편이 사그라지는 구조다.

- 결과: **0.740000초,44.1kHz mono,12,641바이트**, libmp3lame quality2.
- SHA256: `39975b5a2403ca8902955b6473b98b85dd70ae285ee167270e7163e2054ad5b3`.
- ffmpeg 전체 디코드:32,634샘플, 평균−23.0dBFS/peak−5.2dBFS, 무클리핑.
- 같은 디코드에500Hz저역통과 후 평균−54.2dBFS: 전체보다31.2dB 낮아 거대한 저음 킥이 아닌 고역 중심 효과임을 수치로 확인했다. 주관적 청취 검증은 아니다.
- 통합 키: `park_trial_shatter`. 반론 음성 뒤 시각 유리 파괴 시점에1회 재생하며 루프하지 않는다.
