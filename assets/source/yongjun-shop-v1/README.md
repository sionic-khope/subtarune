# 용준 상점 자산

외관은 사용자 첫 참고의 작은 비대칭 지붕·둥근 창·정면 문을 바탕으로 내장 imagegen에서 새로 생성했다. 목재 선실에 맞는 갈색 벽, 붉은 지붕, 용준 얼굴 목판을 사용한다. 원본 `raw-sheet.png`, 정확한 프롬프트 `prompt-used.txt`, 처리 기록 `pipeline-meta.json`을 보존한다.

`generate2dsprite.py process --target asset --mode single --rows 1 --cols 1 --cell-size 192 --fit-scale 0.94 --align feet --component-mode all --trim-border 0 --edge-clean-depth 0 --strict-qc`로 마젠타 배경 제거·최근접 크기 맞춤을 했다. 런타임은 `assets/props/yongjun-shop.png`(192×192 투명 PNG)다.

상점 내부는 사용자가 제공한 두 번째 이미지 `assets/shop/yongjun-counter.png`의 상단 소스 영역(0,0,800,306)을 480×184로 표시한다. 용준과 카운터 그림을 다시 그리지 않았으며, 원본 아래의 메뉴 글자는 표시하지 않는다. 메뉴·가격·확인·효과·소지금은 `src/ui/shop.js`가 실제 게임 상태를 받아 렌더링한다.
