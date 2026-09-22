# 최미스 꽃 망토 올림 동작 · raise294

이 폴더는 이미 생성된 2×2 원본을 기계적으로 내보낸 자산 계약이다. 새 창작 그림·색키·팔레트 보정은 하지 않았다. `raw-sheet.png`은 내장 이미지 생성 결과이며 실제 alpha를 128 기준 이진화한 뒤, cape292의 기존 처리기를 통해 source crop을 얻고 NEAREST로 한 공통 배율만 적용했다.

- [최종 시트](sheet-transparent.png): 320×320 RGBA, 160×160 셀, 2열×2행.
- 전달 PNG: `assets/enemies/choimis-flower-raise.png` (같은 바이트의 최종 시트).
- 순서: 좌상0 `arm-waist` → 우상1 `palm-chest` → 좌하2 `arm-overhead` → 우하3 `hold-cape`.
- 공통 pivot: `(80,152)`. 프레임별 발 밑변은 y=152(exclusive)로 고정했다.
- 재생 계약: one-shot `0,1,2,3`, `300/350/350/450ms`; 완료 뒤 3번을 hold한다. 장면 소유자는 원하면 완료 후 `2↔3`의 가벼운 망토 loop만 사용한다.
- [292 neutral과 모든 최종 프레임의 비교](comparison-all4-with-292-neutral-2x.png), [4배 시트](preview-4x.png), [4배 재생 GIF](animation-preview-4x.gif), [투명 GIF](animation.gif).

`frame-0.png`~`frame-3.png`, `qc-meta.json`, `processor/pipeline-meta.json`, `export.py`가 최종 decode/alpha/frame QC와 재현 정보를 가진다. `prompt-used.txt`의 완전한 생성 프롬프트 기록은 생성 담당자가 소유한다; 이 exporter는 축약문을 실제 프롬프트로 표기하지 않는다.

## 재현

```sh
uv run export.py /private/tmp/subtarune-choimis294
```

자산 ready는 게임 통합을 뜻하지 않는다. `character-motions.js` 등록 및 실제 장면의 one-shot 완료·hold 검증은 장면 통합자의 소유다.
