# 독립 관중 v2

빈 파란 관중석과 서로 다른 관중16명의 상반신을 별도 imagegen 원본으로 분리했다. 배경/난간은 고정하고 인물만 작은 움직임을 줄 수 있는 런타임 자산이다. 이전 관중포함 배경은 `../audience/`에 이력으로 보존한다.

- `bleachers-raw.png`: 내장 생성 원본 `exec-e7bfad8a-00f1-41f9-b0cd-e7462b608b11.png`, 2092×752. 희미한 알파노이즈를 threshold64로 제거한 bounds30/145/2064/620→672×176 NEAREST. 최종 `editor_union_audience.png`.
- `crowd-raw.png`: 내장 생성 원본 `exec-2f9433df-d53f-4719-9746-1a670a36592a.png`, 1322×1190. 4열×4행16명. 토끼 귀를 온전히 보존하도록 y0/297/590/888/1190 구간을340×320셀에 원본배율 그대로 패딩했다.
- `final/sheet-transparent.png`: 런타임 `editor-union-crowd.png`, 256×256, 64셀16개. shared fit0.86, bottom정렬, largest component, NEAREST. 모든 프레임 공통배율이고 개별확대는 없다. 인물bbox너비40..55px, 높이41..50px, 밑동y59..60.
- strict QC: frame16, empty0, edge0, clamp0, bodyCV0.03183, anchorYstd0.02149. 토끼 귀·올린손·머리·인물 밑동을 실제 PNG로 확인했다. 모든 최종 그림 RGBA/alpha0..255.
- 빈 관중석의 밝은 난간선은 y63..65/102..104/146..148. 권장 앞면 덮개crop은 y62높이10, y101높이10, y145높이11. 관중64셀을36×42로 그릴 때 밑동은 drawTop+39이므로 drawTop28/67/112가 난간 안쪽에 자연스럽게 걸린다. 원본 난간줄을 인물 위에 다시 그려 하단5~6px를 덮고 구조물 자체는 움직이지 않는다.

재현: `uv run prepare.py` → 스킬 처리기에 crowd-regrouped.png와 `--rows 4 --cols 4 --cell-size 64 --fit-scale 0.86 --align bottom --scale-strategy fit --component-mode largest --shared-scale --strict-qc`를 지정한다. 정확한 생성 프롬프트는 부모 작업자가 별도기록한다. 실제 맵 레이어·군중움직임·카메라는 부모 통합 QA 범위다.
