# 대포 방어 피드백 오디오

BUILD2026-09-12.98. 사용자가 요청한 브레스 발사음과 방어 성공음만 추가하며 기존 BGM·충전·발사·충돌음을 교체하지 않는다.

- `cannon_guard_block.mp3`: Deltarune `snd_metalhit`의 첫0.28초, gain1.1, 마지막0.12초 감쇠. 매 방어 성공1회.
- `cannon_guard_breath.mp3`: 기존 `whoosh.mp3` 첫0.65초(gain0.8)와 `baron_roar.mp3` 0.15~0.8초(lowpass1200Hz,gain0.75)를 합친0.65초 분사음. 경고 종료 후 실제 브레스가 나올 때1회.

원본 출처·재현 명령은 `design/audio/references.md`의 BUILD98 항목. 런타임에서 MP3 구간 재생을 하지 않고 가공한 짧은 파일 전체를 재생한다.
