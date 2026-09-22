# 최미스 랩 영상 소스 계약

- 사용자 지정 원본: `https://www.youtube.com/watch?v=LHT3XMBGO_8`
- 영상 ID: `LHT3XMBGO_8`
- 원본 제목/게시자: `(백업) 최XX 포에버` / `ㅇㅇ`
- 사용 구간: `22.000s` 이상 `41.000s` 미만, 총 `19.000s`
- 런타임 출력: `assets/video/choimis-forever-22-41.mp4`
- 용도: `choimis_rap` 동안 기존 보스 BGM과 동시에 재생되는 음성 포함 실영상. Canvas에서 낮은 불투명도로 전장 뒤에 그린다.

원본 구간은 `yt-dlp --download-sections '*22-41' --force-keyframes-at-cuts`로 받았다. 다운로드된 854×480/30fps 임시 구간의 SHA-256은 `0c7179f4561cce81f71a7519ca94e5857909018152d5b6f7c38015ef2beed24c`다. 임시 파일은 저장소에 중복 보관하지 않는다.

출력은 480×270,15fps,H.264 Constrained Baseline,yuv420p와 AAC-LC 44.1kHz stereo 80kbps로 변환했다. `faststart`를 적용했고,19초 전체에 영상285프레임과 오디오 스트림이 있다.

```sh
ffmpeg -i source.mp4 -vf "scale=480:-2:flags=lanczos,fps=15" \
  -c:v libx264 -profile:v baseline -level 3.0 -preset slow -crf 30 -pix_fmt yuv420p \
  -c:a aac -b:a 80k -ar 44100 -movflags +faststart -t 19 \
  assets/video/choimis-forever-22-41.mp4
```

검증값은 `metadata.json`에 고정한다. 프레임 MD5 검사에서 모든 디코드 프레임이 서로 달라 정지 이미지가 아니다.
