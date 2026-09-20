# 청소부 등장 음악 무음 꼬리 제거 (BUILD252)

사용자 “영웅 등장 음악이 끝난 뒤 다음 전투 음악 전에 공백”에 대응한 전용 큐다. 원본 `assets/audio/bgm/janitor_hero.mp3`은 보존한다. 런타임 키 `janitor_hero_intro`, 파일 `assets/audio/bgm/janitor_hero_intro.mp3`.

원본은 사용자 지정 [hFYTL3mTsdo](https://www.youtube.com/watch?v=hFYTL3mTsdo), Toby Fox의 `69. Need a hand!? (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`. 원본 전체 출처 기록은 `design/audio/references.md`의 BUILD250 항목을 따른다.

## 확인된 공백

원본 MP3 전체 디코드 길이 51.176792초. ffmpeg `silencedetect`로 측정한 끝 무음 시작점:

| 문턱 | 시작 | 파일 끝까지 |
| --- | --- | --- |
| −45dB | 46.592667초 | 4.584125초 |
| −60dB | 46.681958초 | 4.494833초 |
| −70dB | 46.743792초 | 4.433초 |

46.76초까지 음악 감쇠를 남기고 이후 4.416792초만 제거했다. 앞부분 트리밍, 속도/피치/EQ/음량 변경, 임의 크로스페이드는 없다. 재현:

```sh
ffmpeg -v error -i assets/audio/bgm/janitor_hero.mp3 -af 'atrim=end=46.76' -c:a libmp3lame -q:a 2 assets/audio/bgm/janitor_hero_intro.mp3
```

현재 파일: 46.760초, 48kHz stereo, 1,118,852바이트. 전체 디코드 오류 0. `silencedetect=noise=-60dB:d=0.08`에서 80ms 이상 무음 구간 없음. 원본에는 동일 검사에서 4.494833초 꼬리가 존재했다.

장면 담당은 이 큐를 `loop:false`로 재생하고 다음 전투 음악을 미리 로드한다. 현재 오디오 요소의 실제 `ended`에 다음 음악을 `fadeIn:0`으로 시작하고, 취소/타이틀/리셋 때는 리스너를 정리한다. 단순한 연출 타이머나 기본 루프에 맡기지 않는다. 이 문서는 파일 분석 근거이며 브라우저 전환 관찰은 장면 통합 QA가 담당한다. 공용 `Sound` 변경은 필요하지 않았다.

깃발 명중은 기존 원본 `rudebuster_hit`를 gain 1.0으로 한 번 권장했다(원본 파일 peak −4.4dBFS, 폭발음 중첩 없음). `assets/source/janitor-rudebuster-audio/README.md`의 원본 식별 근거를 따른다.

SHA-256 원본: `82fac24e5006cb4f524f05a0f77519c7fa08d979cb562f484a573bad28385151`

SHA-256 등장용: `5790fdf53fdec80ca8eb0c1fa7977a8750a61b3f31e0cd4a28ef89133c01daaf`
