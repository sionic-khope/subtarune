# 라즈마 원음 (BUILD157)

사용자 지정 [라즈마 전라도](https://www.youtube.com/watch?v=r_rgJvc0_Cc), 표시 업로더 GOMES BARROS ADAUTO, 게시일2023-06-24. yt-dlp 메타데이터 길이8초, 실제 Opus 파일7.90초. 짧은 원본 전체는 분석용 `/tmp/park157-razma-source.webm`에만 내려받았으며 배포 자산에는 아래 두 구간만 넣는다. 출처 기록은 재배포 이용허락 확인을 뜻하지 않는다.

| 실행 키 | 원본 구간 | 디코드 길이 | 목적 |
|---|---|---|---|
| park_razma_scream | 0.55–1.60초 | 1.05초 | 첫 비명 발성의 독립된 한 덩어리. 다음 짧은 발성을 섞지 않음 |
| park_razma_jeolla | 1.94–4.50초 | 2.56초 | 사용자가 지정한 ‘너 전라도 사람이지’ 문장 전체. 다음 비명 이전 종료 |

faster-whisper small CPU int8, language ko, beam5, word timestamps 분석에서 첫 발성0–1.94초, 문장1.94–4.50초, 후속 비명4.50–5.90초가 식별됐다. 파형의 첫 본 발성은 약0.60–1.43초이고1.6초 이후 작은 다음 발성이 있어 첫 구간을0.55–1.60초로 제한했다. ASR은 원본 문장을 `너 천라도 살았겠지!!`, 잘라낸 문장을 `너 천라도 사람 대신!`으로 오인식했다. 이는 문장 위치의 보조 근거이지 정확한 발음의 검증이 아니다. 사용자의 지정 문구와 영상 제목을 함께 근거로 선택했으며 사람의 직접 청취 완료를 주장하지 않는다.

음높이·속도·음성 분리·합성 없음. 8ms 시작 페이드, 비명30ms/문장25ms 끝 페이드, **+2dB 입력 게인**. 원본 디코드 자체가0dBFS를 넘는 표본을 포함하여 출력 리미터(limit0.83, attack2ms, release10ms, 자동 볼륨 보정 없음)를 적용했다. 따라서 평균 레벨이 정확히2dB 올라갔다고 표현하지 않는다. 미세한 평균 증가와 피크 안전 여유를 확보한 결과다. 원 녹음에 있는 왜곡이나 배경음 성분은 그대로 남는다.

## 측정

48kHz stereo, MP3 quality2. ffmpeg 전체 디코드 float32 값을 `measure.mjs`로 검사했다. 표본 수는 좌우 합계다.

| 구간 | 원본 RMS / peak dBFS | 결과 RMS / peak dBFS | 원본 / 결과 ≥1 절댓값 표본 |
|---|---|---|---|
| 비명 | −11.305 / +0.024 | −10.921 / −1.232 | 1 / 0 |
| 문장 | −10.471 / +0.384 | −10.381 / −0.920 | 25 / 0 |

비명100800표본=1.05초, 문장245760표본=2.56초. MP3 전체 디코드 성공. 클립을 겹쳐 재생하거나 런타임 추가 게인을 높이면 별도의 믹스 포화가 생길 수 있으므로 구현은 음성 중첩을 피한다. 기술적 디코드/파형 검수와 주관적 청취는 별개다.

SHA256:

- 원본: `2c3f8bbba51b655b6a45b71c41738c3294284c4e35fac0a9acdff0933205f9b3`
- 비명: `599b39025062390b96020f1d9fcc0355f206d9978ee9c694c95fea1298f93aed`
- 문장: `5951fbbec72c08aa14c69a620a119b6fd26b53688428934c2765b9a3e733324a`

## 재현

게임 저장소 루트에서 실행한다. 기존 파일을 덮어쓰지 않는 명령이다.

```sh
uvx yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' -o '/tmp/park157-razma-source.%(ext)s' 'https://www.youtube.com/watch?v=r_rgJvc0_Cc'
ffmpeg -i /tmp/park157-razma-source.webm -af 'atrim=start=0.55:end=1.60,asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=1.02:d=0.03,volume=2dB,alimiter=limit=0.83:level=false:attack=2:release=10:latency=true' -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/park_razma_scream.mp3
ffmpeg -i /tmp/park157-razma-source.webm -af 'atrim=start=1.94:end=4.50,asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=2.535:d=0.025,volume=2dB,alimiter=limit=0.83:level=false:attack=2:release=10:latency=true' -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/park_razma_jeolla.mp3
node assets/source/park157/audio/measure.mjs /tmp/park157-razma-source.webm
```
