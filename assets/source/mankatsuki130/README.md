# 음식 타코·오토바이 공격 자산

2026-09-13 사용자 ‘타코 음식 타코 자체 패턴’, ‘오토바이 쓰는 패턴’ 요청. 내장 image_gen으로 각각 독립 생성했고 프롬프트는 하위 `prompt-used.txt`, 원본은 `raw-sheet.png`에 보존했다. 원본 생성 폴더도 그대로다. 기존 돼지 얼굴 타코와 별개다.

- `assets/projectiles/mankatsuki-food-taco.png`:64×64, 음식 타코 단일 그림. 런타임에서 회전·포물선 이동.
- `assets/projectiles/mankatsuki-motorcycle.png`:96×64, 왼쪽을 보는 오토바이. 오른쪽 돌진은 좌우반전. 불투명 경계(9,10)–(88,54),60×40으로 표시하며44×18 충돌 중심은 그림 안쪽이다.

처리: generate2dsprite `process --target asset --mode projectile --rows 1 --cols 1 --fit-scale 0.84 --align center --shared-scale --component-mode largest --edge-clean-depth 0 --strict-qc` (셀64/96). 생성 알파를 보존했다. `processed/`는 QC용이며 실제 출력은 기존 `assets/source/captain125/junhee_point/export.py`로 원본을 NEAREST 리샘플링했다. 오토바이는96² 출력의 투명 상하16px만 crop하여96×64로 저장했다. 불투명 픽셀 잘림 없음. PNG 색 양자화·외곽선 침식 없음.

이미지는 이름과 다른 음식/탈것이 되지 않았는지, 가장자리 잘림·투명 배경·작은 크기 가독성을 직접 확인했다. 실제 예고/공격/복합 패턴6화면은 `/tmp/m130-{food,motorcycle,combined}-{warn,active}.png`.
