# 탈리야섭 · BUILD315

가재맨/탈리야 혼합형의 새 전투 원본이다. 넓은 회청색 볼·큰 U자 코·검은 안경 속 두 눈·별도 입 없음, 갈색 쓸어 넘긴 머리, 사암색 직조 목도리·겹옷, 돌을 타며 시전하는 외형을 유지한다. 왼쪽 아래를 향한3/4 시점이다.

## 최종 자산 계약

- `assets/enemies/taliyahsub-battle.png`: RGBA256×256,2열×2행,셀128×128.
- `assets/enemies/taliyahsub-front.png`: 중립0번 셀의 정확한128×128 사본; 필드 정지용.
- 행 우선0-based:0 중립(팔 내림),1 준비(팔을 가슴으로),2 시전(왼쪽 아래로 손 뻗음·발 아래 작은 돌판),3 피격(몸 뒤로 젖힘·가슴을 감쌈).
- 공통 피벗64,120. 최종 알파 높이97/92/100/98px. 모든 알파 하단 exclusive y120.
- 권장 표시 시간400/240/220/280ms. GIF는 검수용 연속 재생이며 실제 전투는 상태별 포즈 선택, 시전/피격 뒤 중립0으로 복귀. 네 상태 전체를 무조건 loop하지 않는다.
- 런타임 두 적 합동 배치의 개별 최대144px 표시 크기는 코딩 담당이 최종 장면에서 확인한다.

## 생성·참조·후처리

내장 `image_gen` 최초 생성1회와 얼굴 수정1회. backend/model/quality/usage/cost는 도구 비공개로unknown. 외부API·코드로 그린 신체·수작업 얼굴 픽셀은 사용하지 않았다.

실제 참조: `assets/enemies/udyrsub-battle.png`, `assets/enemies/seobruto-battle.png`는 가재맨 얼굴·도트 밀도·배치 기준, `assets/sprites/gajaeman_shadow.png`는 회청색 피부·어둠 팔레트 기준이다. 내장 도구에 실제 이미지 입력으로 전달했다.

`raw-v1-mouth-rejected.png`와 `prompt-v1.txt`는 코 아래 별도 입 모양 때문에 반려한 최초 결과다. `raw-sheet.png`와 `prompt-used.txt`가 실제 얼굴 제거 편집 결과/정확한 프롬프트다. 생성기의 원본 파일은 보존했고 결과를 저장소에 복사했다. 편집은 입 선 제거를 요청했으며 최종 외곽 픽셀이 최초와 바이트 단위 동일하다는 주장은 하지 않는다.

`raw-binary-alpha.png`는 알파128 임계값만 적용한다. 최초 원본의 매우 옅은 알파 잔여 때문에 strict source-edge 검사가 실패했으며, 이진 알파 처리 후 strict QC는 빈 셀0·경계0·paste clamp0. 보간 중간물은 납품하지 않는다. `export.sh`가 한 공통 배율0.1968503937007874와 NEAREST로 축소하고 하단 발/돌판 중심을 피벗에 맞춘다. 색상 변경·형태 그리기·프레임별 resize는 없다.

재현: 저장소 루트에서 `bash assets/source/regret315/taliyahsub/export.sh taliyahsub`. 설치된 generate2dsprite 처리기와 uv의 pillow/numpy를 사용한다.

## 검수와 범위

`preview.png`는 최종 PNG의3배 NEAREST 확대, `animation.gif`는 네 상태 비교, `qc.json`는 최종 치수/알파/해시/프레임 bounds와 중간 strict QC다. 모든 최종 셀을 직접 확인하여 두 눈·입 없음·머리/목도리·몸체 크기·독립된 피격 포즈·돌판·손발 containment를 확인했다. 최종 알파0/255, 마젠타 잔여0, 첫 셀/front 동일. 제작자 시각 검수 완료이며 독립 검수/게임 재생은 상위 통합 작업 소유다.
