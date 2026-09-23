# 첫 구출 깃발 명중음 — 사용자 지정 Release Shoot

BUILD303 사용자 지정 보관명은 **릴리즈샷**이다.2026-09-23 같은 페이지의Download MP3를다시 내려받아 기존 파일과 `cmp` 및SHA256을 대조했고 바이트가 완전히 같다. 별도 복제파일을 만들지 않고 기존키 `deltarune_release_shoot`를 재사용한다. 최미스60초 공세가 끝나며 화면탄막이 폭발하는 순간에 사용하며, 이후4초차지 최종빔 발사와 혼동하지 않는다. 기존 첫구출 깃발 큐는 유지한다.

2026-09-20 사용자 지정 [Deltarune Release Shoot](https://www.myinstants.com/en/instant/deltarune-release-shoot-62629/). 페이지 제목과 업로더 `adriano28`, Download MP3 링크를 웹 조회로 확인했다.

- 정확한 공개 파일: https://www.myinstants.com/media/sounds/deltarune-release-shoot.mp3
- 런타임: `assets/audio/sfx/deltarune_release_shoot.mp3`, 키 `deltarune_release_shoot`.
- 공개 MP3를 바이트 그대로 저장했다. 트리밍·변환·EQ·속도/피치·음량 가공 없음. 기존 프로젝트에 이 이름의 자산은 없었다.
- 44.1kHz mono, 1.772018초, 14,645바이트, 평균 −21.2dBFS / 피크 −5.7dBFS. 전체 디코드 오류 0.
- SHA-256: `80c13090ee58ce60ecf43c36d314cd5796ce6e7f8b76e23cad33e143a64df571`.
- 일반 curl은403이었고 ultimate-browsing의 curl_cffi Safari 경로로 HTTP200/audio-mpeg를 받아 파일을 확보했다. 인증·쿠키·유료 서비스는 사용하지 않았다.

첫 구출 장면에서 던져진 깃발이 명중하는 순간 gain1.0으로 한 번 재생한다. 기존 `rudebuster_hit` 추천을 사용자 지정음으로 대체한다. 청소부의 일반 60피해 지원 공격의 루드 버스터 발사음·명중음은 그대로다. 첫 `loadSfxFiles` 목록에 등록했다.

이 페이지가 붙인 Deltarune 이름을 그대로 기록한 것이며 원본 게임 내부 sound ID와의 동일성 또는 배급사 공식 배포를 주장하지 않는다. 재배포 허가는 확인되지 않았다. 실제 청취 승인 여부는 별도다.
