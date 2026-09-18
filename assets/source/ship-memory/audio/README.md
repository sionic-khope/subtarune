# 침몰 기억·짜장숲 해변 오디오

## 사용자 지정 침몰 BGM

- 요청 URL: https://www.youtube.com/watch?v=P89rxnT7lKw
- 영상 ID: `P89rxnT7lKw`
- yt-dlp 제목: `Lost Girl`, 업로더 표시명 `Toby Fox`, 업로드 `20211004`, 표시 길이 80초.
- 런타임: `assets/audio/bgm/ship_sinking.mp3` (`ship_sinking`)
- MP3 48kHz stereo, 80.000000초, 1,755,116바이트.
- SHA-256: `eb75f6fc84f01161e9c10c24a12e4612cb81cfe41345e9a981404e536ab36715`
- 취득일: 2026-09-18. yt-dlp 2026.08.19, 포맷251 전체를 MP3 q2로 변환했으며 트리밍·속도·피치·음량·페이드 변경 없음.

```sh
uvx --from yt-dlp yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 -o 'assets/audio/bgm/ship_sinking.%(ext)s' 'https://www.youtube.com/watch?v=P89rxnT7lKw'
```

원곡 권리는 Toby Fox 등 권리자에게 있으며 출처 기록이 배포 이용허락 확인을 뜻하지 않는다.

## 파도만 있는 해변 배경음

기존 `wind`는 합성 바람, `splash`는 합성 짧은 첨벙, `maillard_splash`는 단발 충돌음이라 해변의 지속 파도 루프를 대신하지 않았다. 사용자의 파도만 있는 배경음 요청에 맞춰 멜로디나 새 합성을 추가하지 않은 외부 파도 효과음 원본을 사용한다.

- 작품: **Waves Sound Effect**, 저자 **Alexander**, Orange Free Sounds, 2016-08-29.
- 출처: https://orangefreesounds.com/waves-sound-effect/
- 원본: https://www.orangefreesounds.com/wp-content/uploads/2016/08/Waves-sound-effect.mp3
- 라이선스: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/), 출처 페이지에서 상업적 이용 가능·loopable 표기 확인(2026-09-18).
- 런타임: `assets/audio/bgm/jjajang_shore.mp3` (`jjajang_shore`)
- 배포된 원본 MP3 바이트 그대로, 새 편집 없음. 페이지의 192kbps 표기와 달리 실제 파일은 128kbps, 44.1kHz stereo.
- 83.252188초, 1,332,035바이트.
- SHA-256: `ffe43399b8480c40ff4c8a97ca5da0ee0b1a2de7a3bc4d4cdea4e60cd029fe4c`

```sh
curl --fail --location --output assets/audio/bgm/jjajang_shore.mp3 'https://www.orangefreesounds.com/wp-content/uploads/2016/08/Waves-sound-effect.mp3'
```

## 확인 범위

두 파일 모두 ffmpeg 전체 디코드 오류 0개/종료 코드 0 및 ffprobe 형식·길이·체크섬 확인. 해변 원본은 평균 −27.0dBFS/peak −2.3dBFS, −40dB 이하 0.15초 이상 무음 구간 없음. 파일을 임의 증폭하지 않았다. 실제 브라우저 반복 경계·음량·음악 전환·청감 확인은 별도 통합 QA 범위다.

기존 실제 물 녹음 효과음 `maillard_splash`는 수면 충격에 재사용 가능하나 수중 녹음이라고 부르지 않는다. `maillard_water_lift`는 그 녹음의 역재생 가공본이라 물 상승에만 적합하다. 현재 승인된 수중 전용 녹음은 확인되지 않았다.
