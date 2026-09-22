# 최미스 공중 망토 대기 · cape295

최신 요청: 최미스의 눈을 정리하고, 뒤의 망토를 손으로 잡고 한쪽 무릎을 든 채 떠 있으며 망토는 크게 펄럭인다. 꽃잎·발판은 이 자산에 없다. 흰 뾰족머리·검은 눈썹/사각 안경·긴 코·별도 치아 입·볼 점·분홍 GAP 옷을 기존 BUILD294 자산에서 유지한다.

- 전달: `sheet-transparent.png` → `assets/enemies/choimis-flower-idle.png`.
- 320×320 RGBA, 2×2, 160×160 셀. 좌상0→우상1→좌하2→우하3.
- 피벗 `(80,152)`, duration `[280,280,280,280]ms`, 1120ms loop. 기존 런타임의 `1000/280` fps와 GIF 재생 시간을 일치시킨다.
- 4개 고유 프레임, 펼침→높은 물결→낮은 물결→접힘의 큰 망토 변화. 몸과 얼굴은 고정에 가깝게 유지하며 한쪽 무릎은 계속 든 상태.
- 현재 런타임 기준과 같은 배율 비교: `old-vs-new-2x.png`. 새 불투명 높이118/118/117/117px, 기존123/122/123/122px. 평균 −4.08%이며 넓어진 망토와 공중 자세를160px셀에 보존하기 위한 단일 공통배율이다. 프레임별 배율 보정은 없다.
- `animation.gif`와 `animation-preview-4x.gif`, 프레임0~3, `preview-4x.png` 포함.

## 원본 및 재현

Codex 내장 image_gen을 한 번 호출했다. 모델 ID·사용량·비용은 도구에서 공개되지 않아 unknown. `generation.json`은 참조/원본 경로, `prompt-used.txt`는 실제 프롬프트다. 첫 참조는 당시 runtime의 복사본 `old-sheet-reference.png`, 두 번째는 사용자 제공 자세 예시 `pose-reference.png`다.

```sh
uv run assets/source/choimis-flower-cape295/export.py /absolute/path/to/subtarune
```

기존 cape292 export를 재사용하고 비교용 이전 셀을160으로 수정했다. 실제 alpha를128에서 이진화, 공통 NEAREST 축소, 발 하위10%의 가로 중앙값80 및 하단152 정렬만 수행한다. 색키·그림 추가·눈/얼굴 수작업·팔레트 양자화는 없다. 최초123px 출력은 넓은 망토가 최종 셀 경계를 넘어 export assertion에서 거절됐고, 공통118px 출력은 잘림 없이 통과했다. 기하 게이트를 완화하지 않았다.

자산 시각/알파 검수는 `qc-report.md`, 수치는 `qc-meta.json`과 `processor/pipeline-meta.json`. 게임 장면 통합·동작검수·배포는 상위 작업의 별도 책임이며 이 문서는 완료 증거를 대신하지 않는다.
