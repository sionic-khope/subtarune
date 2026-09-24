# 아우솔섭 · BUILD315

가재맨/아우렐리온 솔 혼합형의 새 전투 원본이다. 넓은 회청색 사람형 볼·큰 U자 코·검은 안경 속 두 눈·별도 입 없음이 읽히는 얼굴, 금관/뿔, 어두운 청보라 우주 비늘·금색 흉갑, 두 발톱팔·안쪽으로 말린 꼬리의 천상 뱀 몸체다. 일반 용 주둥이 대신 가재맨 얼굴을 유지한다. 왼쪽 아래를 향한3/4 시점이다.

## 최종 자산 계약

- `assets/enemies/aurelionsub-battle.png`: RGBA256×256,2열×2행,셀128×128.
- `assets/enemies/aurelionsub-front.png`: 중립0번 셀의 정확한128×128 사본. 최소 정지 추출물이며 별도 필드 걷기는 제작하지 않았다.
- 행 우선0-based:0 중립(발톱 내림),1 준비(코일 압축·발톱 모음),2 시전(왼쪽 아래로 팔/목 뻗음),3 피격(고개·상체 뒤로 젖힘·가슴 움켜쥠).
- 공통 피벗64,120. 최종 알파 높이90/87/88/84px. 모든 알파 하단 exclusive y120.
- 권장 표시 시간400/240/220/280ms. GIF는 검수용 연속 재생이며 실제 전투는 상태별 포즈 선택, 시전/피격 뒤 중립0으로 복귀. 네 상태 전체를 무조건 loop하지 않는다.
- 런타임 두 적 합동 배치의 개별 최대144px 표시 크기는 코딩 담당이 최종 장면에서 확인한다.

## 생성·참조·후처리

내장 `image_gen` 생성1회. backend/model/quality/usage/cost는 도구 비공개로unknown. 외부API·코드로 그린 신체·수작업 얼굴 픽셀은 사용하지 않았다. `raw-sheet.png`는 보존 원본 사본이며 `prompt-used.txt`에 정확한 실제 프롬프트가 있다.

실제 참조: `assets/enemies/udyrsub-battle.png`, `assets/enemies/seobruto-battle.png`는 가재맨 얼굴·도트 밀도·배치 기준, `assets/sprites/gajaeman_shadow.png`는 회청색 피부·어둠 팔레트 기준이다. 내장 도구에 실제 이미지 입력으로 전달했다.

`raw-binary-alpha.png`는 알파128 임계값만 적용한다. 최초 원본의 매우 옅은 알파 잔여 때문에 strict source-edge 검사가 실패했으며, 이진 알파 처리 후 strict QC는 빈 셀0·경계0·paste clamp0. 보간 중간물은 납품하지 않는다. 공유 export는 모든 포즈의 피벗 좌우 최대 반경으로 안전 여백을 계산하여 한 공통 배율0.1776416539050536과 NEAREST를 적용한다. 초기100px 높이만 제한한 export는 긴 시전 팔이 셀 왼쪽에 닿아 assertion으로 중단했고, 최종 공통 배율은 전 프레임에6px 이상 여백을 확보한다. 프레임별 resize나 그림을 자르는 보정은 없다.

재현: 저장소 루트에서 `bash assets/source/regret315/taliyahsub/export.sh aurelionsub`. 설치된 generate2dsprite 처리기와 uv의 pillow/numpy를 사용한다.

## 검수와 범위

`preview.png`는 최종 PNG의3배 NEAREST 확대, `animation.gif`는 네 상태 비교, `qc.json`는 최종 치수/알파/해시/프레임 bounds와 중간 strict QC다. 모든 최종 셀을 직접 확인하여 두 눈·입 없음·왕관/뿔·가재맨 얼굴·꼬리·독립된 피격·신체 배율·전체 containment를 확인했다. 최종 알파0/255, 마젠타 잔여0, 첫 셀/front 동일. 제작자 시각 검수 완료이며 독립 검수/게임 재생은 상위 통합 작업 소유다.
