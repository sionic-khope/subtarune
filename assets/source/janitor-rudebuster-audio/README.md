# 청소부 루드 버스터 원본 효과음

2026-09-20 사용자 지정: 붉은 3겹 참격의 발사음·명중음은 DELTARUNE Rude Buster 원본을 사용한다. 기존 프로젝트 자산에서 해당 샘플이 없어, 프로젝트에서 이미 쓰는 디컴파일 자산 저장소의 고정 리비전에서 가져왔다.

출처 리비전: `TeamBlossomDevs/DeltaruneDecomp_beta@154f9a97b8f18fa6974e917c4c4e774bde6b7eba`. 게임 원본 보관 자료이며 배급사 공식 다운로드 페이지가 아니다. 원 권리는 원 권리자에게 있으며 재배포 허가는 확인하지 않았다.

## 원본 식별 근거

- [공격 애니메이션 Step](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/objects/obj_rudebuster_anim/Step_0.gml): `t == 10`에서 `snd_play(snd_rudebuster_swing)`과 `obj_rudebuster_bolt` 생성을 함께 수행한다.
- [투사체 Step](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/objects/obj_rudebuster_bolt/Step_0.gml): 목표에 도달한 `explode == 1`, `t == 1`에서 피해와 `snd_play(snd_rudebuster_hit)`를 수행한다. `red == 1`도 같은 소리를 사용한다. 타이밍 보너스의 별도 `snd_scytheburst`는 이번 일반 발사/명중음 요청에 포함하지 않았다.

| 런타임 키 | 원본 | 전체 MP3 길이 | 평균/피크 dBFS | 권장 음량·큐 |
| --- | --- | --- | --- | --- |
| `rudebuster_swing` | [snd_rudebuster_swing](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_rudebuster_swing/snd_rudebuster_swing) | 0.953379초 | −20.3 / −5.6 | 0.80, 내려치기/에너지 발사 순간 한 번 |
| `rudebuster_hit` | [snd_rudebuster_hit](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_rudebuster_hit/snd_rudebuster_hit) | 0.953379초 | −20.2 / −4.4 | 0.85, 투사체 실제 명중 순간 한 번 |

원본은 확장자 없는 WAV이며 여기 `.wav`로 보관했다. `ffmpeg -v error -i <원본.wav> -c:a libmp3lame -q:a 2 assets/audio/sfx/<키>.mp3`로 전체를 변환했다. 44.1kHz 모노 유지, 트리밍·EQ·레이어·피치·속도·음량 가공 없음. 시각적인 세 겹마다 소리를 복제하지 않는다. BGM 변경 없음.

전체 디코드 오류 0, 비무음·클리핑 없음. `preview.mp3`은 발사음 뒤 1.5초 지점에 명중음을 넣은 청취 자료(각 권장 음량 적용)이며 전투 타이밍 자체를 나타내지는 않는다. 주관적 청취 승인은 별도다.

SHA-256:
- 원본 swing: `6f8055345becca5ecf1cde22578ffb30beafa4c3321e047f7d5baa9e590c8885`
- 원본 hit: `cd270f003d5b41c59439bccd4706681356d03c0dac0c7af35b73d722c7b318f7`
- MP3 swing: `c5019b86682f9f5b8aba469cf7241e6fa8e9e481c0bd33ef41080acdc4182144`
- MP3 hit: `41c3f97a9cf34450c3387299ff391273eff11b81dcd18b13e050732c08acd764`
