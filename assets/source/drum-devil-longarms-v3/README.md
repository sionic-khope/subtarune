# 드럼통의 악마: 긴 팔과 큰 손 (BUILD252)

요청은 기존 촉수 악마의 전체 크기 약1.2배, 팔 길이 및 손·손가락 증가이다. 기존 승인 wings-v2의 검은 정장·흰 셔츠·검은 넥타이, 파란 드럼통 머리·전완, 긴 허리, 다리 없음, 거친 검은 등 촉수6개를 유지한다. 전체 **1.2배는 런타임에서만 적용**하며 원본/출력에 중복 확대하지 않는다.

## 생성과 원본

내장 image_gen 3회: idle은 `../drum-devil-wings-v2/idle-raw.png` 편집, 첫 attack은 v2 attack + 새 idle 비율 참조, `attack-compact-raw.png`는 첫 attack의 두 번째 준비 자세 팔 각도만 바깥쪽으로 낮춘 편집이다. 초안 `attack-raw.png`는 위로 든 손 때문에 표시 높이를 초과해 런타임 미사용이며 보존한다. 정확한 프롬프트는 각 raw와 대응하는 txt이다. backend 모델/품질/요금은 도구 미공개로 unknown이다.

프롬프트 목표는 팔18%·손/손가락20% 증가다. 이를 정확한 결과 수치로 주장하지 않는다. 첫 idle 왼손의 밝은 발톱 ROI bbox 실측은 v2 [93,490,184,580]에서 v3 [82,532,205,646]로 변했다(원본 좌표; 단순 bbox이며 관절별 길이 측정은 아님). 길어진 팔/발톱이 허리 아래로 내려오고, 머리와 몸체의 기본 크기는 유지된다.

## 재현과 계약

`uv run assets/source/drum-devil-longarms-v3/export.py`

이 스크립트는 source 폴더에 후보 결과를 생성한다. 채택 후 `idle-transparent.png`, `attack-transparent.png`, `field-transparent.png`를 각각 `assets/enemies/drum-devil-{idle,attack,field}.png`에 복사한다.

- 입력은 `idle-raw.png`, **`attack-compact-raw.png`**. alpha>1/255의 큰 연결 성분으로 완전한 몸체를 분리한다. 손이 명목상 원본 셀 중앙선을 넘지만 다음 몸체와 분리돼 있으므로 균등 사분할하지 않는다.
- 모든8프레임은 v2와 동일한 **0.44 NEAREST 공통 배율**이다. 프레임별 확대·축소나 그림 합성·그리기 없음.
- 시트768×768,2×2,384셀. 허리 피벗 **[216,320]**. 긴 손이 밑으로 내려오므로 v2보다 기준점을 셀 내30px 위로 옮겼다. 월드상의 허리 위치는 피벗으로 유지한다.
- 8프레임 alpha union **[35,97,339,356]**,304×259. 1.2배 실제 가시 높이310.8px. 각 프레임 좌표는 runtime-contract.json에 있다.
- field는 idle0에서 모든 idle의 합집합+4px 여백으로 crop. XYWH **[74,94,268,266]**, field피벗 **[142,226]**. 인트로가 공격 준비0/1/복귀3을 쓰면 이 crop에 들어오지만, 공격 타격2의 왼손은 더 왼쪽이므로 전체384셀을 써야 한다.
- 공격1 권장 투척 접점 **[108,160]**, 피벗 상대 **[-108,-160]**; 손바닥 중심 [108,171]. 최종 렌더링에서 탄환 크기와 함께 확인한다.
- idle220ms×4 loop; attack180/220/140/260ms one-shot. 검수 attack GIF는 반복한다.

## 검증과 한계

최종8프레임·field·같은 배율 비교에서 손끝/촉수 잘림과 셀 경계 접촉 없음. exporter containment assertion 및 no-excuse 검사 통과. PNG는 원본 RGBA를 유지하며 GIF만 팔레트/이진 alpha 처리한다. 자동 LSP는 linked worktree 경로가 request cwd 외부라 실행되지 않았다.

`before-after-same-scale.png`는 왼쪽 v2·오른쪽 v3를 같은 허리 위치로 정렬한다. `preview-dark.png`는 위 idle·아래 attack. `yoplait-comparison-native.png`는 네이티브 픽셀 비교이며 게임별 drawScale은 적용하지 않았다.

별도 에이전트 `longarms_asset_review`가 원본·최종8포즈·field·계약을 읽고 **asset-only PASS**를 반환했다: 정체성, 더 긴 팔/큰 발톱, 완전한 외곽, 공통 배율을 확인했다. 정확한 신체 증가율과 게임 내1.2배 표시·재생은 별도 검증 대상이다. 부모가 최종 native preview를 보고 런타임 적용을 승인했다.
