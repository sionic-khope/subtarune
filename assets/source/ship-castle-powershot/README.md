# 가재맨 성 생성 지정 효과음

- 사용자 지정 페이지: https://www.myinstants.com/en/instant/energetic-powershot-51849/
- 페이지 Download MP3: https://www.myinstants.com/media/sounds/energetic-powershot.mp3
- 페이지 표시 제목: `energetic powershot`; 업로더: `le_tri`
- 취득일: 2026-09-20
- 런타임 원본: `assets/audio/sfx/energetic_powershot.mp3`
- MP3 원본165,357바이트,48kHz stereo,10.276초
- SHA-256: `ef059bc5e71f815c57426774301005fed4686dd8a0678063e414b7d10f26511b`

페이지를 열어 Download MP3의 실제 주소를 확인했다. 일반 curl은403을 반환해
오디오 담당의 기존 `curl_cffi` Safari TLS 다운로드 경로로 같은 공개 MP3를
받았다(HTTP200, audio/mpeg). 원본 바이트를 그대로 저장했다. 편집·트림·재인코딩·
피치/속도 변경·정규화 없음. 전체 ffmpeg 디코드 종료0.

## 연출 연결

`castle_reveal` 진입 때 전체 클립을1배속·volume0.9로 한 번 재생한다.
`ShipCastle.revealAudio.currentTime`을 성 연출 시계로 사용하여4.5초에 성의
출현·낙하를 시작하고6.5초에 착수한다. 이전4.5초 모으기와2초 생성/착수 동작은
유지한다. 원음의0.25초 RMS 구간 분석에서4.25~4.75초가 가장 강한 구간이며,
6.25초부터 긴 감쇠가 이어진다. 이는 파형 분석이지 사람이 청취 승인한 기록은 아니다.

기존 소환 `mankatsuki_clone`·모으기 `rumble`·생성 `boom` 겹침은 이 비트에서
제거하고 수면 접촉의 `furnace_blast`는 유지한다. 앞 비트 `vortex_gather`의
rumble과 `vortex_burst`의 폭발음은 그대로다. 클립의 끝 꼬리는 첫 반응 대사
중에도 자연히 끝까지 재생된다. 다음 비트에서도 남은 꼬리를 보존하며,
Escape/장면 해제 시 이 장면이 소유한 오디오만 멈춘다. `{shipCastleReveal:true}`가
같은 실제 재생 시계로 파도까지 끝났는지 확인한 뒤 다음 대사를 연다.

## 확인 명령

```sh
ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels -of json assets/audio/sfx/energetic_powershot.mp3
ffmpeg -v error -i assets/audio/sfx/energetic_powershot.mp3 -f null -
shasum -a 256 assets/audio/sfx/energetic_powershot.mp3
QA_BASE_URL=http://127.0.0.1:8891 QA_SHIP_CASTLE_FOCUS=powershot tests/playtest/run.sh ship-castle
```

최소 검사 경로는 기존 ship-castle 하네스의 powershot 모드다. 앞 대치 한 줄부터
소용돌이→성 생성→착수·파도→반응3줄→요플래 낙하→첫 빔까지 원래 스크립트를
실시간 재생하고, 새 소리 중 Escape 해제도 검사한다. 앞 라운지와 후속 회상은
이번 변경과 관계없어 fixture로 생략하며 전체 스토리 완주로 보고하지 않는다.
