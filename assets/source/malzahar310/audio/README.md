# 말자하310 효과음 출처와 검증

2026-09-23. Q/W는 Riot 공식 챔피언 페이지의 스킬 시연 영상에서 짧은 시전 구간을 추출했다. 새 돌진은 원작 말자하 E가 아니므로 `malzahar_dash`는 **Q 발사 순간을 재사용한 커스텀 돌진 발동 큐**다. 원작 E 효과음이나 독립적으로 분리된 공식 원음이라고 부르지 않는다.

## 공식 출처

- [말자하 챔피언 페이지](https://www.leagueoflegends.com/en-us/champions/malzahar/)
- [Riot Data Dragon 16.18.1 스킬 설명](https://ddragon.leagueoflegends.com/cdn/16.18.1/data/en_US/champion/Malzahar.json)
- Q: <https://lol.dyn.riotcdn.net/x/videos/champion-abilities/0090/ability_0090_Q1.mp4>
- W: <https://lol.dyn.riotcdn.net/x/videos/champion-abilities/0090/ability_0090_W1.mp4>
- E 조사 참고: <https://lol.dyn.riotcdn.net/x/videos/champion-abilities/0090/ability_0090_E1.mp4>

위 URL은 챔피언 페이지 HTML에 실제 포함된 주소이며 curl로 공개 다운로드했다. 인증·쿠키·우회·유료 서비스는 사용하지 않았다. 원본 파일은 이 폴더의 동일 파일명 MP4다. Q4.566667초, W17초, E8.666667초이며 AAC48kHz stereo 오디오를 포함한다. E 파일은 조사 참고로만 보존하며 런타임에 사용하지 않는다. 공개 접근 확인은 별도 재배포 허가 확인을 의미하지 않는다.

공식 Q는 두 차원문에서 안쪽으로 투사체를 발사하고, W는 공허충을 소환한다. 원작 E는 지속 피해/전염이며 돌진이 아니다. 위키의 `Malzahar_Original_Q_0.ogg`/`Malzahar_Original_E_0.ogg`는 [Audio 페이지](https://wiki.leagueoflegends.com/en-us/Malzahar/Audio)에서 “Malzahar yells”로 분류하는 캐릭터 기합이므로 효과음 원본으로 쓰지 않았다.

## 선택 구간과 처리

시간은 각 공식 MP4의 시작을0초로 한 절대 구간이다. 재현은 저장소 루트에서 `sh assets/source/malzahar310/audio/prepare.sh`를 실행한다.

| 런타임 파일 | 원본 | 구간 | 처리 | 디코드된 평균/피크 |
| --- | --- | --- | --- | --- |
| `assets/audio/sfx/malzahar_q.mp3` | `ability_0090_Q1.mp4` | 0.55–1.85초,1.30초 | +4dB | −20.3/−5.6dBFS |
| `assets/audio/sfx/malzahar_w.mp3` | `ability_0090_W1.mp4` | 0.27–1.55초,1.28초 | +6dB | −21.6/−5.6dBFS |
| `assets/audio/sfx/malzahar_dash.mp3` | `ability_0090_Q1.mp4` | 1.13–1.65초,0.52초 | +5.5dB | −18.0/−3.9dBFS |

모두 시작8ms/끝80ms 페이드,48kHz stereo, libmp3lame q2다. 속도·피치 변경, 반복, 합성, 소스 분리, 노이즈 제거는 없다. 시연 영상에 포함된 배경/캐릭터 기합이 남을 수 있으므로 완전히 격리된 SFX라고 표현하지 않는다. 파일 크기는 Q26,252바이트, W26,204바이트, dash11,276바이트다.

## 구간 선정 근거

- `q-contact.png`: 원본을4fps로 뽑은18프레임, 왼쪽→오른쪽/위→아래. 약0.75–1초에 두 차원문이 보이고 약1.25초에 중앙 발사 섬광이 보인다.100ms RMS는0.5초−34.49dBFS에서0.7초−23.53dBFS로 상승하고1.2초−20.33dBFS에 큰 피크가 있다.1.85초에 끝내 이후 약2.4초의 평타 동작/소리를 제외했다.
- `w-contact.png`: 원본 첫4초의4fps16프레임. 약0.5초부터 소환 이펙트/공허충이 보이며 이후 공격이 진행된다.100ms RMS는0.2초−38.85dBFS에서0.4초−21.72dBFS로 상승한다.1.55초 종료로 약2.4초부터의 다음 큰 공격음을 제외했다.
- `e-contact.png`는 비교용4fps 캡처다. E의 지속 저주와 사용자 지정 돌진을 구분하기 위한 참고이며 런타임 오디오에는 사용하지 않았다.
- `q-waveform.png`, `w-waveform.png`, `dash-waveform.png`는 완성 MP3의 전체 파형이다. 세 파형과 Q/W의 실제 영상 프레임을 눈으로 확인했다.

청취 도구가 제공되지 않아 실제로 들었다고 주장하지 않는다. 위 검증은 영상 시전 타이밍,100ms RMS,파형,코덱/피크 및 전체 디코드 검사다. 최종 장면에서의 주관적 음색/밸런스 청취는 별도다.

## 런타임 전달

- 권장 시작 volume: Q0.80, W0.85, 돌진0.90. 실제 장면 믹스에서 조정한다.
- Q는 시전/발사 시1회, W는 세 마리를 소환하는 묶음당1회다. 공허충마다 겹쳐3회 재생하지 않는다.
- 돌진은 실제 이동 시작에서 `malzahar_dash`1회와 기존 `ultraswing`0.65를1회 겹치는 방안을 전달한다. `ultraswing`은 기존 승인된 Deltarune `snd_ultraswing` 재사용이며 `design/audio/references.md`의 BUILD169 출처를 따른다. 이 오디오 작업은 런타임 연결이나 두 파일의 믹스를 수행하지 않았다.
- 피격 섬광/흔들림/파편과 충격음은 실제 접촉에서만 연결한다. 돌진 시작 소리가 프레임마다 반복되면 안 된다.
- 이 권장 조합의 두 파일 디지털 피크 합 상한은 약−1.7dBFS(Q 발동−3.9dBFS×0.90, 기존 ultraswing−8.3dBFS×0.65)다. BGM/다른 효과음까지 포함한 버스 레벨 보장은 아니며 중첩 청취는 아직 하지 않았다.

## 검증 및 SHA256

`sh -n prepare.sh` 성공, 실제 스크립트 실행 성공. 세 런타임 파일의 ffprobe 코덱/길이/크기를 확인하고 `ffmpeg -v error -i <파일> -f null -`로 전체 디코드를 확인했다. 유료 비용0. JS/레지스트리/기존 오디오 수정 및 커밋은 하지 않았다.

| 파일 | SHA256 |
| --- | --- |
| `ability_0090_Q1.mp4` | `44da39b683abdcc7b018c3aa57d1ea1a23efd2a361bb9d79b40be413adbb1ae9` |
| `ability_0090_W1.mp4` | `89409664876ffe68d12f0f51860cae3fd53b97e89feaa81c89773698282aa332` |
| `ability_0090_E1.mp4` | `552faaaa53961426fb7edd65ad7ec0ce75cd5d9ce62280f30868c124fb8ee645` |
| `malzahar_q.mp3` | `05438fdd1d9d968b93124a4bc099d4a8dafda78516e6b978843f51b9e2ac88fe` |
| `malzahar_w.mp3` | `d81a8dde22a65da70a01dcb90f1e99e5a415f7368e7e6c8951ceb82c1ab8ef57` |
| `malzahar_dash.mp3` | `34477a531b0470c5e5f265cbc8911803e73f0b374909709104259054494faedd` |
