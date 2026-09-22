# 최미스 짜장면 먹기 영상 소스 계약

- 사용자 지정 원본: `https://www.youtube.com/watch?v=X3qvIeLPkMI`
- 영상 ID: `X3qvIeLPkMI`
- 원본 제목/게시자: `최미스짜장면` / `병신만올리는계정`
- 원본 실측 길이: `21.694s` (`yt-dlp` 표시는 22초)
- 런타임 출력: `assets/video/choimis-eating-race.mp4`

원본 전체가 요청 장면이다. 프레임을 직접 확인한 결과 0초부터 약10.3초까지 앉은 자기소개·카운트다운, 약10.3–10.8초에 `Miss`/타이머 전환, 약10.8–11.0초부터 실제 먹기가 시작되어 마지막21.694초까지 이어진다. 별도의 완주 결과 카드는 원본에 없고,19초 무렵 `아 살짝 무리가 왔다` 자막 뒤에도 먹기와 근접 화면이 계속된다. 따라서 존재하지 않는 30초나 결과 화면을 합성하지 않고 0–21.694초 전체를 보존한다.

원본 854×480 AV1/29.97fps + Opus 임시 다운로드의 SHA-256은 `23c32492bcd6da6a894dbfb19411102971c6604bb8d719d6bb3ac7d4baad73b5`다. 저장소에는 중복 보관하지 않는다.

런타임 파일은 480×270,15fps,H.264 Constrained Baseline,yuv420p와 AAC-LC 44.1kHz stereo 80kbps,`faststart`로 변환했다.

```sh
ffmpeg -i source.mp4 -vf "scale=480:-2:flags=lanczos,fps=15" \
  -c:v libx264 -profile:v baseline -level 3.0 -preset slow -crf 30 -pix_fmt yuv420p \
  -c:a aac -b:a 80k -ar 44100 -movflags +faststart \
  assets/video/choimis-eating-race.mp4
```

출력은 `21.694014s`,579,159바이트다. 전체325프레임 중317개가 서로 다른 디코드 프레임 해시여서 실제 움직이는 영상이다. 세부 값은 `metadata.json`에 고정한다.
