# BUILD319 검은 미로 추격자

사용자 요청: 벽을 통과하며 천천히 따라오는 보라색 구형 괴물. 검은 몸체와 중앙 보라색 힘의 코어만 읽히는 모습.

내장 image_gen으로 새 그림 1장 생성. 모델·품질·과금 정보는 도구가 공개하지 않아 unknown. 기존 캐릭터 정체성 참조 없음. prompt-used.txt가 실제 생성 프롬프트이며 raw-sheet.png는 원본이다.

런타임: assets/enemies/castle-dark-pursuer.png, 192×192 RGBA 단일 프레임, 중심 피벗 (96,96). 별도 몸체 애니메이션 시트가 아니라 월드 이동하는 정지 스프라이트다. 원형 물리 반경40; 외곽 오라는 충돌하지 않고 바닥을 밝히지 않는다.

generate2dsprite process: target creature, mode single, rows1/cols1, cell-size192, single-size192, fit-scale0.90, align center, component-mode all, strict-qc. 색키 제거와 최근접 축소만 적용. pipeline-meta.json에 QC 기록. 원본/최종을 직접 확인하여 잘림 없는 검은 몸체·보라 코어·투명 여백을 확인했다. 실제 화면 검수는 .omc/evidence/chase319에서 별도로 기록한다.
