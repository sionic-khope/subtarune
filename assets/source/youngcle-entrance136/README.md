# 영클 철 전함 입구·철판 (BUILD136)

내장 image_gen으로 별도 생성한 두 원본이다. 전함 `assets/props/youngcle-warship.png`의 남색/은색/청록 철제 재질을 입구 참고로 사용했다. 생성 원본은 삭제하지 않았다.

- 입구: `entrance/raw-sheet.png` → generate2dsprite 마젠타 제거 `raw-sheet-clean.png` → 알파 bbox(58,111,1199,1114) 전체를184×162로 NEAREST 축소 →192×192 투명 캔버스(4,26)에 배치. 최종 `assets/props/youngcle_entrance.png`.
- 철판: `iron-raw.png` 전체를32×32 NEAREST로 축소. 최종 `assets/tiles/youngcle_iron.png`. 바닥이므로 배경/투명 여백 없이 가장자리까지 채운 별도 단일 타일이다.
- 팔레트 양자화·재그림·추가 명암 없음. 입구 QC 빈 프레임/잘림 없음. 생성기 중간 Lanczos 출력은 런타임에 쓰지 않고 정리된 원본에서 NEAREST만 사용했다.

## 입구 생성 프롬프트

Use the image just shown as the visual reference for metal materials and pixel-art style, NOT the whole ship composition. Create ONE isolated grand open iron warship boarding entrance sprite for a side-scrolling/tapdown 2D pixel game. Square canvas. Facing LEFT so heroes approach horizontally from left into the dark doorway at the lower-left part of the structure; slight three-quarter view showing its thick right steel side. Huge heavy rectangular portal, navy blue iron and silver layered armor frame, rivets, two restrained cyan lamps, dark interior opening. A short flat metal threshold extends LEFT from the opening, no staircase. Opening and threshold around lower 80% image height. Entire structure contained within central 88% canvas, safe margin all sides. Crisp chunky pixel clusters, dark outline, restrained texture, no painterly blur. Match reference navy/silver/cyan material identity. No ship, no people, no text, no letters, no UI, no logos, no extra props or magic. Background 100% solid flat magenta #FF00FF.

## 철판 생성 프롬프트

Create a single 2D pixel-art iron bridge floor texture tile for a navy-blue and silver armored warship. Straight overhead view, perfectly square flat rectangular steel panel, fills the whole square image edge-to-edge, no perspective. Simple muted slate blue-gray plated steel with subtle seams on edges, four small flat rivets near corners, broad clean walkable middle, extremely restrained texture, chunky crisp pixels readable when reduced to 32x32. Seamlessly repeatable along a horizontal bridge, no bevel protruding out of square, no railings, no holes, no shadows outside. Opaque tile with no background, no transparency, no magenta, no text, no objects, no people, no UI. Stylized JRPG game floor, not photorealistic.
