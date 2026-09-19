# 드럼통 악마 공격 효과음

2026-09-20 사용자 공격음 불만을 반영한 기존 샘플 가공본이다. 새 다운로드·새 합성·BGM 변경은 없다. 기존 공용 파일은 보존한다. 제작 명령은 `sh assets/source/drum-devil-audio-v1/build.sh`.

| 키 | 원본·가공 | 디코드 길이 | 평균/피크 dBFS | 권장 재생 음량·최소 간격 |
| --- | --- | --- | --- | --- |
| `drum_throw` | `wing.mp3` (DELTARUNE snd_wing), 0.75배 피치/속도, 앞 0.38초, 70–1800Hz, 짧은 감쇠 | 0.38초 | −23.0 / −10.6 | 0.75 / 0.25초 |
| `drum_impact` | `metalhit.mp3` (snd_metalhit), 0.65배 피치/속도, 80–1300Hz + 기존 합성 `baron_slam.mp3` 저역, 0.40초로 감쇠 | 0.40초 | −18.2 / −6.0 | 0.50 / 0.18초 |
| `drum_burst` | `furnace_blast.mp3` (snd_punchheavythunder), 앞 0.95초, 40–2200Hz, 100Hz +3dB, 뒤 0.50초 감쇠 | 0.95초 | −22.3 / −9.1 | 0.95 / 0.80초 |

전부 44.1kHz 모노 MP3 q2. 전체 디코드 오류 0, 클리핑 없음. 원본 출처는 `design/audio/references.md`의 snd_wing·snd_metalhit·snd_punchheavythunder·바론 육중한 몸통 타격 항목을 따른다. 게임 디컴파일 샘플의 재배포 허가는 확인되지 않았다.

동시에 떨어지는 드럼통마다 복제 재생하지 않고 한 묶음당 한 번만 재생한다. 보라 폭발에서는 일반 금속 충격을 겹치지 않는다. 8턴 붉은 찢김은 기존 `baron_slam` 0.35로 시작하고 실제 찢김 순간 `wallclaw` 0.50 한 번을 권장한다. 효과음 로드 목록과 실제 호출은 통합 담당이 연결한다.

`preview.mp3`은 0.0초 던지기 → 1.2초 충돌 → 2.4초 보라 폭발 → 4.2초 기존 찢기 순서로 위 권장 음량을 적용한 6초 청취 자료다. 파형·디코드·레벨 검증만 수행했으며 주관적 청취 승인이나 실제 전투 사운드믹스 완료를 의미하지 않는다.

SHA-256:
- `drum_throw.mp3`: `2953ca8a911e0b00e78f451b9fadb22c00d70e9fe4828e1079800c0dc581b3a5`
- `drum_impact.mp3`: `6e4fd503444a21c8010859324069736e523c78f8867c488d77c261c242dfb577`
- `drum_burst.mp3`: `639b8b78f43bf8d634f36af0e7b519124ce25c4a3eed81fefdc1dc64c7aee1eb`
