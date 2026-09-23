# 최미스 BUILD301 · 대기 / 손 올림 / 쵸소

내장 이미지 생성 원본을 기계적으로 내보낸 자산이다. 원본 얼굴의 흰 삐친 머리·검은 눈썹·사각 안경·긴 코·별도 치아 입·볼 점과 길고 가는 몸을 유지한다. 분홍 GAP 망토 대기와 손 올림, 쵸소 의상 공격 준비/발사의 세 상태다. 새 얼굴·눈 합성이나 프레임별 체형 보정은 하지 않았다.

| 상태 | source | runtime PNG | 프레임 시간 |
| --- | --- | --- | --- |
| 망토 대기 | 이 폴더 | `assets/enemies/choimis-flower-idle.png` | 280/280/280/280ms, loop |
| 손 올림 | `raise/` | `assets/enemies/choimis-flower-raise.png` | 300/350/350/450ms, one-shot 후 마지막 hold |
| 쵸소 | `choso/` | `assets/enemies/choimis-choso.png` | 제작 미리보기 220/260/150/260ms; 실제 준비/발사는 전투 타임라인 소유 |

모두 320×320 RGBA, 2×2, 160×160 셀이다. 순서는 좌상0→우상1→좌하2→우하3. 공통 발 피벗은 `(72,152)`이며 y152는 불투명 영역의 exclusive 하단이다. 원래 x80이면 대기2의 망토가 셀을 넘으므로 전체 프레임을 8px 옮긴 피벗을 채택했다. 그림을 늘이거나 망토를 잘라내지 않았다.

## 몸 크기와 배율

- 대기: 원본 머리→발553px에 공통140/553 배율. 최종 네 프레임 모두140px.
- 손 올림: 팔을 내린0번 머리→발527px에 공통140/527 배율. 최종 전체 높이140/140/145/146px. 손을 든2/3은 머리→발138/137px, 손이 머리보다7/9px 높다. 손까지 포함한 bbox로 몸을 축소하지 않았다.
- 쵸소: 원본0/1 머리→발539px에 공통140/539 배율. 최종140/140/136/136px. 발사2/3의 숙인 자세는 그대로 남겼다. 양발이 있는 이 시트는 발 하위10% 픽셀의 x범위 중앙을 쓴다. 픽셀 개수의 중앙값은 한쪽 신발로 튀므로 쓰지 않는다.

기존 대기 평균117.5px ×0.506 ×세로1.2 = 화면71.346px. 신규140px ×가로세로 공통0.714 =99.96px, 약40.106% 크다. `runtime-comparison.png`와 확대본 `runtime-comparison-3x.png`는 이전 실제 표시 배율과 새 표시 계약을 같은 발 높이에서 비교한다. `runtime-size-qc.json`에 계산을 보관한다. 실제 장면 검증은 통합 담당의 별도 증거를 따른다.

## 기준점

`anchors.json`은 효과 연결용 최종 셀 좌표다. 손 올림2의 손바닥 `(47,14)`,3은 `(47,13)`, 몸통 집결점 `(69,80)`을 사용한다. 선택한 손바닥/몸통 좌표가 각각 실제 불투명 피부/분홍 픽셀임을 확인했다. 전체 시트 좌표가 아닌 셀 내부 좌표다.

## 재현과 보존

```sh
uv run assets/source/choimis-cape301/export.py /absolute/path/to/subtarune
uv run assets/source/choimis-cape301/raise/export.py /absolute/path/to/subtarune
uv run assets/source/choimis-cape301/choso/export.py /absolute/path/to/subtarune
uv run assets/source/choimis-cape301/runtime-comparison.py
```

각 exporter는 cape295 exporter와 `tools/sprites/sheet_processor.py`를 재사용한다. 실제 alpha를128 기준 이진화하고 공통 NEAREST 축소, 셀 분할, 발 정렬만 적용한다. 색키·팔레트 양자화·수작업 그림은 없다. `raw-sheet.png`는 생성 원본, `old-sheet-reference.png`는 교체 전 runtime의 바이트 보존본이다. 실제 프롬프트는 루트의 `idle-prompt.txt`, `raise-prompt.txt`, `choso-prompt.txt`에 생성 담당이 기록한다. 도구가 공개하지 않은 모델 ID·비용은 unknown이다.

각 폴더에 최종 시트, 개별0~3프레임, 확대 시트, 투명/배경 포함 GIF, 이전 자산 비교, QC 수치가 있다. GIF의 반복은 제작 검수 편의이며 손 올림/쵸소의 실제 one-shot/hold 전환을 의미하지 않는다. QC JSON의 `bodyHeight`는 알파 bbox 전체 높이이므로 손 올림의 실제 머리 높이는 `anchors.json`과 위 표를 사용한다. PNG runtime 경로 복사는 완료했으며 장면 등록·브라우저 재생·사용자 외형 승인은 이 자산 검수와 구분한다.
