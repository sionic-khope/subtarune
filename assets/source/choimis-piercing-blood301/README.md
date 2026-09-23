# 최미스 천혈 발사 효과음 — BUILD301

- 출력: `assets/audio/sfx/choimis_piercing_blood.mp3`
- 내려받은 원본: `community-source.mp3` (3.984초)
- 출처 페이지: https://tuna.voicemod.net/sound/ebcb5a80-7c56-4a0c-bdaa-03bea88d40c9
- 페이지 제목: **Choso piercing blood**, 업로더: **Time2365**
- 원본 파일 URL: https://us-tuna-sounds-files.voicemod.net/ebcb5a80-7c56-4a0c-bdaa-03bea88d40c9-1768709803104.mp3
- 확인일: 2026-09-23

사용자의 천혈 효과음 검색 요청으로 찾은 커뮤니티 업로드다. 공식 애니메이션 원본, 특정 회차, 원저작자 또는 별도 재사용 라이선스는 확인되지 않았다. 제목·태그 이상의 출처를 주장하지 않는다.

## 편집과 연결

원본의 0.68–1.16초 구간을 잘라 0.48초로 만들었다. 100Hz 하이패스와 2.8kHz 로우패스로 저역 럼블 및 높은 지속음을 줄이고, 8ms 페이드인과 마지막 210ms 페이드아웃을 적용했다. 볼륨 0.6, 최대 진폭 제한 0.5, 모노 44.1kHz/128kbps MP3다.

권장 호출: `sfx('choimis_piercing_blood', { volume: 0.6 })`. 별도 `from` 또는 `len`은 필요 없다. 예고 종료 뒤 실제 발사가 시작될 때 한 번 재생하고, 같은 프레임의 여러 갈래 공격에는 한 번만 재생한다. 사전 로드 목록에도 키를 추가해야 한다.

```sh
ffmpeg -ss 0.68 -t 0.48 -i community-source.mp3 \
  -af 'highpass=f=100,lowpass=f=2800,afade=t=in:d=0.008,afade=t=out:st=0.27:d=0.21,volume=0.6,alimiter=limit=0.5:level=false' \
  -ar 44100 -ac 1 -codec:a libmp3lame -b:a 128k choimis_piercing_blood.mp3
```

## 검증 범위

- FFmpeg 전체 디코딩 성공. 실제 디코드 길이 0.480초, 21,168 샘플.
- 출력 평균 -24.8dB, 최대 -10.0dB로 클리핑 없음. 권장 재생 볼륨 0.6을 적용하면 최대 약 -14.4dB.
- 원본 스펙트럼에서 약 0.68초의 광대역 시작점과 3.7/7.5kHz 지속 대역을 확인해 자르기와 필터를 정했다.
- 이 실행 환경의 오디오 입력은 지원되지 않아 직접 청취 검증은 하지 못했다. 음성·배경음 완전 부재나 애니메이션 원본과의 일치는 보장하지 않는다.
- 원본 SHA-256: `ee39034084dbb68ab693c0e67a445e8a1112bcace7d2a691b722ae9cdefb8808`
- 출력 SHA-256: `b5d018b831b7ceaa2bd7443bd038dc5c979dc103e11a2e35e8648eddf513c655`
