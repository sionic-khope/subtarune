# 최미스 핑크 슈터: DELTARUNE 노란 하트 음원

2026-09-22 사용자 요청에 따라 합성 `power`/`cannon_puff` 대신 노란 하트가 실제로 사용하는 게임 음원을 연결한다.

출처는 [TeamBlossomDevs/DeltaruneDecomp_beta chapter2](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/tree/154f9a97b8f18fa6974e917c4c4e774bde6b7eba)다. 게임 자산을 포함한 커뮤니티 디컴파일 자료이며 배급사 공식 다운로드 사이트가 아니다. 이 기록은 배포 라이선스 허가를 뜻하지 않는다.

[obj_heart/Step_0.gml](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/objects/obj_heart/Step_0.gml#L224-L253)의 `color == 1` 분기에서 일반 발사 `snd_heartshot_dr_b`, 홀드 충전 `snd_chargeshot_charge`, 완전 충전 발사 `snd_chargeshot_fire`를 확인했다. 파일 이름만으로 판단하지 않았다. `snd_chargeshot_fire`가 기존 천둥 원본과 동일한 바이트인 것은 맞지만 이 노란 하트 이벤트에서도 직접 재생된다.

`audio/`에 받은 원본 WAV와 원본 GameMaker 메타데이터를 보존하고, `code/`에 이벤트 본문과 충전 정리 코드를 보존한다. `manifest.json`은 원본·런타임 SHA256, 길이, 바이트 수, 재현 변환 명령을 기록한다. MP3 변환 외 자르기·볼륨/피치/속도 변경·합성은 없다.

런타임 키는 `yellowheart_charge`, `yellowheart_shot`, `yellowheart_shot_big`. 충전은 홀드마다 한 번 재생하고 놓기/단계 종료/dispose에서 반환된 HTMLAudioElement를 pause 후 해제한다. 게임 원본은 충전을 루프하며 피치를 올리지만, 이 구현은 원본 샘플 rate 1·volume 0.3으로 한 번 재생한다. 단발/완전충전 발사는 rate 1·기본 volume 0.9다.

검증: 코드 연결·원본 해시·ffprobe 길이/코덱·ffmpeg 전체 디코드 확인. 주관적인 청취 검수는 수행하지 않았다.
