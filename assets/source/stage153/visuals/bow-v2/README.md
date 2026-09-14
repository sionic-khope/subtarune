# 파크가디언 인사 v2 · 8프레임

사용자 후속 지시의 더 역동적인 좌우 인사·손 흔들기·다리 들기·첫 인사 모션용 새 생성본이다. 부모가 확인한 원본 `exec-a5d97766-f5e1-485e-9d09-1dccd5088476.png`는 `raw-sheet.png`에 보존한다. 이전6프레임은 `../bow/`에 보존하며 더 이상 런타임에서 사용하지 않는다.

- 최종 `final/sheet-transparent.png`: 256×512, 2열×4행, 128px셀8개.
- `CHARACTER_MOTIONS.park_guardian_costume.bow`: scale27/60, pivot64/119, 프레임당0.18초, 전체1.44초.
- map visualScale2.66이 사용자 요청 전체20%확대를 담당한다. 모션 자체 배율은 이동 시트54px 몸체÷2=27월드기준에 맞추므로20%를 중복 적용하지 않는다. 중립프레임 실제높이는27×1.43×2.66=102.702월드px다.
- 최초 원본행의 발 위치가 달라 strict QC anchorstd0.05097이었다. `reanchor.py`가 이미 색키 처리된 원본의 각 셀을512×416 고정캔버스, y400 발기준으로 **이동만** 했다. 픽셀 재생성·포즈별 리사이즈 없이 common preserve배율을 유지한다.
- 최종 strict QC: frame8, empty0, edge0, clamp0, bodyCV0.06470, anchorYstd0.004234. 허리숙임·한쪽발 들기 높이 변화는 그대로다.
- 최종 PNG를 열어 손·발·귀·꼬리 잘림 없음과 인사 동작 변화, RGBA투명을 확인했다. 실제 첫 인사/감사 반복·카메라 배치는 부모 통합 QA에서 확인한다.

재현: `uv run reanchor.py` 이후 스킬 처리기에 `--rows 4 --cols 2 --cell-size 128 --fit-scale 0.85 --align feet --scale-strategy preserve --component-mode largest --shared-scale --duration 180 --strict-qc --max-body-scale-cv 0.08 --max-anchor-y-std 0.05`를 지정해 `regrouped.png`를 `final/`로 처리한다. 최상위 과거 `assemble.py`는 v1처리 이력이므로 v2배포를 덮어쓰는 용도로 사용하지 않는다.
