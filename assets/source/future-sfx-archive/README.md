# 향후 사용 효과음 보관

사용자가 이름을 지정해 보관한 파일이다. 장면 연결·자동 재생·시작 시 preload는 하지 않는다. 실제 사용을 요청받으면 `assets/audio/archive/`의 원본을 SFX 폴더로 복사하고 로드 목록과 해당 장면에 등록한다.

## 청소년등장

- 사용자 지정 이름: **청소년등장**.
- 보관 파일: `assets/audio/archive/youth_entrance.mp3`.
- 사용자 지정 [ap0cop 페이지](https://www.myinstants.com/en/instant/ap0cop-4272/), 페이지 설명 `Fountain Opening (DELTARUNE)`, 업로더 `m4chia`.
- 페이지 Download MP3가 가리키는 정확한 공개 파일: https://www.myinstants.com/media/sounds/ap0cop.mp3
- 원본 MP3 바이트를 그대로 보관했다. 변환·트리밍·피치·음량 가공 없음.
- 10.866917초, 44.1kHz stereo, 260,862바이트. 전체 ffmpeg 디코드 오류0.
- SHA-256: `94fa860cba55cd4707a364cf55236b6c3277feff62e1ad0ad744069934055805`.
- curl_cffi Safari 요청으로 HTTP200/audio-mpeg 확인. 로그인·쿠키·유료 서비스 없이 가져왔다. 재배포 허가는 미확인.

## 관객들 충격 — 원본 대기

사용자가 제공한 Arc WebShare의 `share-15a6c487-dc4d-4605-9922-295619b8c33b/myinstants.mp3`는 작업 시점에 존재하지 않았다. WebShare 폴더에서도 해당 이름/ID를 찾지 못했다. 다른 소리를 대체 저장하지 않았으며 원본을 받으면 `assets/audio/archive/crowd_shock.mp3`로 보관할 예정이다. 이는 저장 완료 항목이 아니다.
