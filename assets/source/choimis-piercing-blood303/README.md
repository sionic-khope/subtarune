# 최미스 천혈: 기존 델타룬 베기·충격 재사용 (BUILD303)

사용자가301의 천혈음을 다시 거절하여 `assets/audio/sfx/choimis_piercing_blood.mp3`를 교체했다. 이번 파일은 기존 DELTARUNE 샘플 두 개를 짧게 편집한 게임용 조합이다. 주술회전 원본, 새 합성음, 사람 목소리가 아니다.301의 커뮤니티 업로드는 런타임에서 더 이상 쓰지 않는다.

## 원본과 편집

공통 출처 리비전: `TeamBlossomDevs/DeltaruneDecomp_beta@154f9a97b8f18fa6974e917c4c4e774bde6b7eba`. 게임 자료 보관 저장소이며 배급사의 공식 다운로드 페이지가 아니다. 기존 프로젝트에서 사용한 소리를 재사용한다.

| 역할 | 보존 원본 | 출처 |
| --- | --- | --- |
| 짧은 공기 베기 | `assets/source/runner-v1/audio/snd_criticalswing.wav` | [snd_criticalswing](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_criticalswing/snd_criticalswing) |
| 시작점의 짧은 충격 | `assets/source/subrio169/audio/snd_impact.wav` | [snd_impact](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_impact/snd_impact) |

베기는 속도/음높이1.2배, 앞0.44초, gain1.55, 마지막0.24초 감쇠다. 충격은 원래 속도/음높이의 앞0.18초를 gain0.48로 짧게 겹친다. 양쪽3ms 페이드인, 합산 뒤 peak0.8 리미터(자동 증폭 끔)를 적용했다. 긴 레이저·드론·충전음은 포함하지 않는다.

```sh
ffmpeg -i assets/source/runner-v1/audio/snd_criticalswing.wav \
  -i assets/source/subrio169/audio/snd_impact.wav \
  -filter_complex '[0:a]asetrate=52920,aresample=44100,atrim=duration=0.44,afade=t=in:d=0.003,afade=t=out:st=0.20:d=0.24,volume=1.55[cut];[1:a]aformat=channel_layouts=mono,atrim=duration=0.18,afade=t=in:d=0.003,afade=t=out:st=0.04:d=0.14,volume=0.48[impact];[cut][impact]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.8:level=false:latency=true[out]' \
  -map '[out]' -ar 44100 -ac 1 -codec:a libmp3lame -b:a 160k assets/audio/sfx/choimis_piercing_blood.mp3
```

## 호출 감사와 연결 계약

수정 전 일반 천혈은 적 설정에 따라301 커뮤니티 음원(volume0.6)을 사용했지만, 패턴 기본값은 `laser_beam`(0.22초)으로 남아 있었다. 핑크 천혈·피 구체 폭발은301음원을 사용했고, 마지막60초 공세는 `laser_charge`와 `laser_beam`을 사용했다. 따라서 같은 쵸소 공격에도 서로 다른 소리가 났다.

303은 일반 기본값·적 설정, 핑크 발사·피 구체 폭발, 마지막 공세를 모두 같은 키 `choimis_piercing_blood`, volume0.85로 맞춘다. 예고 종료 뒤 실제 발사 때 한 번 재생한다. 일반·마지막 공세의 레이저 충전음을 제거한다. 파일 자체가0.44초이므로 `from`/`len`으로 재차 자르지 않는다. 기존 전투 진입 로더가 이 키를 사전 로드한다. 대사 `choimis_chosouya`, 플레이어 샷, 최종 몸통 타격 `furnace_blast`, BGM은 이 변경 대상이 아니다.

## 파일 검증과 한계

- 전체 디코드 성공,44.1kHz 모노,19,404샘플=0.440초.
- MP3 디코드 평균−15.2dBFS,피크−2.2dBFS. 런타임volume0.85에서 평균약−16.6/피크약−3.6dBFS다.
- 이전 파일은 평균−24.8/피크−10.0dBFS에volume0.6이었다. 새 파일은 긴 잔향을 잘라 발사 시점에 집중하고, 이전의 과도한 대역 제한을 사용하지 않는다.
- 직접 청취 도구가 없어 청취 만족도는 검증하지 못했다. 파형·수치·디코드·호출 시점 검증을 청취 승인으로 표현하지 않는다.
- 베기 원본 SHA256: `6cf8f2130801a80644c743c23dc67a42e1a1b3ea363ef6db1ce26591b1ad320c`
- 충격 원본 SHA256: `24a26f6c6c80cdf5f1f9df14dce9670af50d003b59f8060d2ec44b989b2c9190`
- 출력 SHA256: `71f310124d028701fbbc65cbbd1616597d3f52d68d9c626520c5efdc6e8f3d4d`
