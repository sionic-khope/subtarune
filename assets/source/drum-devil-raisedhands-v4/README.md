# 드럼통의 악마: 메뉴 위로 든 손

사용자 교정: “지금 메뉴판에 드럼통악마 손이 잘리는 느낌...살짝 올리고있고 손은 보이게해야지 접거나 더옆으로펼치거나.” v3의 긴 팔·큰 손과 1.2배 몸 크기를 유지하며 팔꿈치/손목 자세만 변경한다.

## 생성

내장 image_gen 편집2회. idle은 `../drum-devil-longarms-v3/idle-raw.png` 참조, attack은 v3 `attack-compact-raw.png`와 새 raised idle을 참조했다. 모델/품질/요금은 도구 미공개로 unknown이다. 각 `*-prompt.txt`는 전송한 정확한 프롬프트이며 raw PNG를 보존한다.

모든 idle과 공격의 낮은 반대손을 팔꿈치에서 굽혀 들어 올렸다. 공격2는 손을 아래로 늘어뜨리는 대신 가슴/위허리 높이에서 가로로 휘두른다. 머리·정장·몸통·긴 허리·촉수·파란 드럼통·긴 손가락 정체성과 기본 그림 배율은 유지한다. 투척 준비손의 접점은 v3와 같다.

## 재현과 좌표

`uv run assets/source/drum-devil-raisedhands-v4/export.py`

출력은 source 폴더에 생성한다. 채택 후 `idle-transparent.png`, `attack-transparent.png`, `field-transparent.png`를 `assets/enemies/drum-devil-{idle,attack,field}.png`로 복사한다.

- 공통 배율 **0.44 NEAREST**,384셀,768×768시트,2×2/행우선4프레임. 피벗 **[216,320]**. 전체1.2는 런타임에서만 적용한다.
- 모든8프레임 alpha union **[36,97,342,322]**. 이전과 같은 허리 위치로 정렬했고 프레임별 확대/축소 없음.
- field는 idle0의 모든 idle union+4px 여백: XYWH **[74,94,272,232]**,피벗 **[142,226]**. 본체배율 보존을 위해 필드/포효/투척 모션의 기존 `220/(266*1.43)` 배율을 유지한다. 새 crop높이232를220에 다시 맞추면 본체가 커지므로 금지한다. field 전체높이가 약191.9px가 되는 것은 손을 든 자세와 여백 변경 때문이다.
- 공격1 투척접점 **[108,160]**, 피벗 상대 **[-108,-160]**, 손바닥 중심 [108,171].
- idle220ms×4 loop; attack180/220/140/260ms one-shot; 검수 GIF만 반복한다.

## 메뉴 가림 검증

실제 PNG에서 밝은 발톱색의 전체 bbox 하단은 idle [250,261,243,256],attack [260,254,262,248]이다. 색 검출에는 치아도 포함될 수 있으므로 이것만 전체 손의 증거로 쓰지 않는다.

별도 시각검수에서 검은 손바닥·보라 관절·손목을 포함한 전체 손이 각 프레임의 `fullHandReviewRegions` 안에 드는지 확인했다. 이 사각형은 자동 분할 결과가 아니라 보수적인 수동 검수 영역이며, 손 주변 팔/날개 일부를 포함할 수 있다. 모든 영역의 하단은 native280 이하. 전투 rootY272,scale1.2,pivotY320일 때 사각형 하단도 screen224로 menuTop246보다22px 위다. 최종 게임의 캐릭터/메뉴 겹침은 런타임 QA에서 확인해야 한다.

오른쪽 전체 alpha 끝은342로 이전339보다3px 더 넓다. 런타임 recoil/shake를 합친 화면 끝 여유는 통합 담당이 확인한다. 투척손이 아군 얼굴과 겹치는지도 실제 장면 검수 대상이다.

## 검수/이력

`preview-dark.png`, `before-after-same-scale.png`(왼쪽v3,오른쪽v4), field, 모든 raw/final8프레임 검수. 외곽 잘림·출력 셀 경계 접촉·paste clamp 없음. `longarms_asset_review` 독립 검수 **asset-only PASS**: 손톱뿐 아니라 손바닥/관절/손목이 올라가고 긴 팔은 접힌 자세로 읽힘, 큰 손과 본체 정체성 유지. 정확한 신체 길이는 미측정이며 게임 메뉴 검수는 별도다. 부모가 최종 preview를 보고 채택했다.

원본 RGBA 유지, alpha1 연결 잡점과 작은 고립 성분 제외, GIF만 팔레트·이진 alpha 처리. exporter 및 no-excuse 검사 통과. LSP는 linked worktree가 request cwd 외부라 실행되지 않았다. 기존 v3 원본은 보존한다.
